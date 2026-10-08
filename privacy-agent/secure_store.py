"""Owner-scoped authenticated encryption and bounded retention on local SQLite.

Only authenticated server-generated user IDs may construct a store. Payloads
bind their owner, record ID, kind and deadline inside the authenticated cipher.
Unowned legacy databases require an explicit offline migration or deletion.
"""
import json
import os
from pathlib import Path
import re
import sqlite3
import time
from vault import _cipher

MAX_TTL_DAYS = 90
MAX_GENERAL_TTL_DAYS = 30
MAX_VALUE_BYTES = 65536


class SecureStore:
    def __init__(self, path: str, user_id: str):
        if not isinstance(user_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", user_id):
            raise ValueError("Identifiant utilisateur serveur requis")
        self.user_id = user_id
        self.cipher = _cipher()  # Fail closed BEFORE creating persistent files.
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        if self.path.is_symlink():
            raise ValueError("Chemin de stockage invalide")
        descriptor = os.open(self.path, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
        os.close(descriptor)
        os.chmod(self.path, 0o600)
        self.db = sqlite3.connect(self.path, timeout=10)
        try:
            self.db.execute("PRAGMA secure_delete=ON")
            self.db.execute("PRAGMA journal_mode=DELETE")
            existing = self.db.execute("PRAGMA table_info(secure_records)").fetchall()
            if existing and "owner" not in {row[1] for row in existing}:
                raise RuntimeError("Stockage historique sans propriétaire : migration hors ligne requise")
            self.db.execute("""CREATE TABLE IF NOT EXISTS secure_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL,
                kind TEXT NOT NULL, payload BLOB NOT NULL,
                expires_at INTEGER NOT NULL)""")
            self.db.execute("CREATE INDEX IF NOT EXISTS records_owner ON secure_records(owner, kind)")
            self.db.execute("CREATE INDEX IF NOT EXISTS records_expiry ON secure_records(expires_at)")
            self.db.commit()
            self.purge()
        except Exception:
            self.db.close()
            raise

    def _encode(self, record_id, value, kind, expires_at):
        if not isinstance(value, str) or len(value.encode("utf-8")) > MAX_VALUE_BYTES:
            raise ValueError("Valeur invalide ou trop longue")
        return self.cipher.encrypt(json.dumps(
            {"id": record_id, "owner": self.user_id, "kind": kind,
             "expires_at": expires_at, "value": value}, ensure_ascii=False,
            separators=(",", ":")).encode("utf-8"))

    def _decode(self, row):
        record_id, kind, payload, expires_at = row
        try:
            data = json.loads(self.cipher.decrypt(payload))
            expected = {"id": record_id, "owner": self.user_id, "kind": kind, "expires_at": expires_at}
            if any(data.get(key) != value for key, value in expected.items()):
                raise ValueError("binding")
            if not isinstance(data["value"], str):
                raise ValueError("value")
            return data["value"]
        except Exception as exc:
            raise ValueError("Intégrité du stockage invalide ou clé indisponible") from exc

    def add(self, value: str, ttl_days: int = 7, kind: str = "record") -> int:
        if not isinstance(kind, str) or not re.fullmatch(r"[a-z][a-z0-9_-]{0,31}", kind):
            raise ValueError("Type de fiche invalide")
        maximum = MAX_TTL_DAYS if kind == "request" else MAX_GENERAL_TTL_DAYS
        if isinstance(ttl_days, bool) or not isinstance(ttl_days, int) or not 1 <= ttl_days <= maximum:
            raise ValueError(f"Conservation comprise entre 1 et {maximum} jours")
        expires_at = int(time.time()) + ttl_days * 86400
        self.purge()
        with self.db:
            cursor = self.db.execute("INSERT INTO secure_records(owner,kind,payload,expires_at) VALUES (?,?,?,?)",
                                     (self.user_id, kind, b"", expires_at))
            record_id = cursor.lastrowid
            payload = self._encode(record_id, value, kind, expires_at)
            self.db.execute("UPDATE secure_records SET payload=? WHERE id=? AND owner=?",
                            (payload, record_id, self.user_id))
        return record_id

    def get(self, record_id: int):
        self.purge()
        row = self.db.execute("SELECT id,kind,payload,expires_at FROM secure_records WHERE id=? AND owner=?",
                              (record_id, self.user_id)).fetchone()
        return self._decode(row) if row else None

    def list_records(self, kind=None):
        self.purge()
        sql = "SELECT id,kind,payload,expires_at FROM secure_records WHERE owner=?"
        params = [self.user_id]
        if kind is not None:
            sql += " AND kind=?"
            params.append(kind)
        rows = self.db.execute(sql + " ORDER BY id", params).fetchall()
        return [{"id": row[0], "value": self._decode(row), "kind": row[1], "expires_at": row[3]} for row in rows]

    def update(self, record_id: int, value: str, expected_value=None) -> bool:
        self.purge()
        # Acquire the write lock before read/modify/write to avoid resurrection races.
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row = self.db.execute("SELECT id,kind,payload,expires_at FROM secure_records WHERE id=? AND owner=?",
                                  (record_id, self.user_id)).fetchone()
            if not row:
                self.db.commit()
                return False
            current = self._decode(row)
            if expected_value is not None and current != expected_value:
                self.db.commit()
                return False
            payload = self._encode(record_id, value, row[1], row[3])
            self.db.execute("UPDATE secure_records SET payload=? WHERE id=? AND owner=?",
                            (payload, record_id, self.user_id))
            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            raise

    def delete(self, record_id: int) -> bool:
        with self.db:
            cursor = self.db.execute("DELETE FROM secure_records WHERE id=? AND owner=?", (record_id, self.user_id))
        return cursor.rowcount > 0

    def purge(self) -> int:
        with self.db:
            cursor = self.db.execute("DELETE FROM secure_records WHERE owner=? AND expires_at <= ?",
                                     (self.user_id, int(time.time())))
        return cursor.rowcount

    def clear(self) -> int:
        with self.db:
            cursor = self.db.execute("DELETE FROM secure_records WHERE owner=?", (self.user_id,))
        return cursor.rowcount

    def rotate_keys(self) -> int:
        """Re-encrypt this owner's live records with the current active key.

        Construct a fresh store after changing the environment keyring. Keep old
        keys until ALL owners and retained backup snapshots have been migrated.
        """
        self.purge()
        self.db.execute("BEGIN IMMEDIATE")
        try:
            rows = self.db.execute("SELECT id,kind,payload,expires_at FROM secure_records WHERE owner=?",
                                   (self.user_id,)).fetchall()
            for row in rows:
                value = self._decode(row)
                payload = self._encode(row[0], value, row[1], row[3])
                self.db.execute("UPDATE secure_records SET payload=? WHERE id=? AND owner=?",
                                (payload, row[0], self.user_id))
            self.db.commit()
            return len(rows)
        except Exception:
            self.db.rollback()
            raise

    def close(self):
        self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()


def purge_expired(path: str, now=None) -> int:
    """Maintenance-only global purge, including owners who never log in again.

    Schedule daily from the private host; this cannot read/decrypt any payload.
    Filesystem backups and platform snapshots need their own deletion policy.
    """
    path = Path(path)
    if not path.exists():
        return 0
    if path.is_symlink():
        raise ValueError("Chemin de stockage invalide")
    with sqlite3.connect(path, timeout=10) as db:
        db.execute("PRAGMA secure_delete=ON")
        cursor = db.execute("DELETE FROM secure_records WHERE expires_at <= ?",
                            (int(time.time() if now is None else now),))
        return cursor.rowcount


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Suppression des fiches expirées, sans déchiffrement")
    parser.add_argument("--purge", required=True, metavar="DATABASE")
    args = parser.parse_args()
    print(f"Fiches expirées supprimées : {purge_expired(args.purge)}")
