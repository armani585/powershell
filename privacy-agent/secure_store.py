"""Encrypted, time-limited local store for *future* approved records.

No user interface currently writes real personal data here. Values are
Fernet-encrypted before insertion, and expire automatically on read.
"""
import os
import sqlite3
import time
from pathlib import Path
from vault import encrypt_text, decrypt_text

MAX_TTL_DAYS = 30

class SecureStore:
    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.db = sqlite3.connect(self.path)
        os.chmod(self.path, 0o600)
        self.db.execute("CREATE TABLE IF NOT EXISTS secure_records (id INTEGER PRIMARY KEY, payload BLOB NOT NULL, expires_at INTEGER NOT NULL)")
        self.db.commit()

    def add(self, value: str, ttl_days: int = 7) -> int:
        if not isinstance(ttl_days, int) or not 1 <= ttl_days <= MAX_TTL_DAYS:
            raise ValueError("Conservation maximale : 30 jours")
        encrypted = encrypt_text(value)
        cursor = self.db.execute("INSERT INTO secure_records(payload,expires_at) VALUES (?,?)",
                                 (encrypted, int(time.time()) + ttl_days * 86400))
        self.db.commit()
        return cursor.lastrowid

    def get(self, record_id: int):
        self.purge()
        row = self.db.execute("SELECT payload FROM secure_records WHERE id=?", (record_id,)).fetchone()
        return decrypt_text(row[0]) if row else None

    def delete(self, record_id: int):
        self.db.execute("DELETE FROM secure_records WHERE id=?", (record_id,))
        self.db.commit()

    def purge(self):
        self.db.execute("DELETE FROM secure_records WHERE expires_at <= ?", (int(time.time()),))
        self.db.commit()

    def clear(self):
        self.db.execute("DELETE FROM secure_records")
        self.db.commit()

    def close(self):
        self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()
