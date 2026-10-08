"""Adversarial persistence/authorization checks; synthetic payloads only."""
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from cryptography.fernet import Fernet
from auth import AuthenticationError, authenticate
from secure_store import SecureStore


class SecurityTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.path = str(Path(self.folder.name) / "secure.db")
        self.key = Fernet.generate_key().decode()
        env = patch.dict(os.environ, {"PRIVACY_VAULT_KEY": self.key}, clear=True)
        env.start()
        self.addCleanup(env.stop)

    def test_idor_blocks_read_update_delete_and_clear(self):
        with SecureStore(self.path, "synthetic_a") as a, SecureStore(self.path, "synthetic_b") as b:
            a_id = a.add("Private synthetic A")
            b_id = b.add("Private synthetic B")
            self.assertIsNone(b.get(a_id))
            self.assertFalse(b.update(a_id, "Overwritten"))
            self.assertFalse(b.delete(a_id))
            self.assertEqual(b.clear(), 1)
            self.assertEqual(a.get(a_id), "Private synthetic A")
            self.assertIsNone(b.get(b_id))

    def test_sql_injection_cannot_escape_owner_filter(self):
        with SecureStore(self.path, "synthetic_a") as a, SecureStore(self.path, "synthetic_b") as b:
            a.add("Private synthetic A")
            for injection in ("1 OR 1=1", "1; DELETE FROM secure_records", "' UNION SELECT 1 --"):
                self.assertIsNone(b.get(injection))
                self.assertFalse(b.delete(injection))
                self.assertFalse(b.update(injection, "tampering"))
            self.assertEqual(len(a.list_records()), 1)

    def test_ciphertext_cannot_be_reassigned_to_another_owner(self):
        with SecureStore(self.path, "synthetic_a") as a, SecureStore(self.path, "synthetic_b") as b:
            record_id = a.add("Private synthetic A")
            a.db.execute("UPDATE secure_records SET owner=? WHERE id=?", ("synthetic_b", record_id))
            a.db.commit()
            with self.assertRaises(ValueError):
                b.get(record_id)

    def test_ciphertext_cannot_be_swapped_between_records(self):
        with SecureStore(self.path, "synthetic_a") as store:
            first = store.add("First synthetic secret")
            second = store.add("Second synthetic secret")
            payload = store.db.execute("SELECT payload FROM secure_records WHERE id=?", (first,)).fetchone()[0]
            store.db.execute("UPDATE secure_records SET payload=? WHERE id=?", (payload, second))
            store.db.commit()
            with self.assertRaises(ValueError):
                store.get(second)

    def test_expiry_extension_without_reencryption_is_rejected(self):
        with SecureStore(self.path, "synthetic_a") as store:
            record_id = store.add("Synthetic secret", ttl_days=1)
            store.db.execute("UPDATE secure_records SET expires_at=expires_at+86400 WHERE id=?", (record_id,))
            store.db.commit()
            with self.assertRaises(ValueError):
                store.get(record_id)

    def test_rotation_requires_migrating_each_owner_before_retiring_old_key(self):
        with SecureStore(self.path, "synthetic_a") as a, SecureStore(self.path, "synthetic_b") as b:
            a_id = a.add("Synthetic A")
            b_id = b.add("Synthetic B")
        new_key = Fernet.generate_key().decode()
        with patch.dict(os.environ, {"PRIVACY_VAULT_KEYS": json.dumps([new_key, self.key])}):
            with SecureStore(self.path, "synthetic_a") as a:
                self.assertEqual(a.rotate_keys(), 1)
        with patch.dict(os.environ, {"PRIVACY_VAULT_KEYS": json.dumps([new_key])}):
            with SecureStore(self.path, "synthetic_a") as a, SecureStore(self.path, "synthetic_b") as b:
                self.assertEqual(a.get(a_id), "Synthetic A")
                with self.assertRaises(ValueError):
                    b.get(b_id)
        with patch.dict(os.environ, {"PRIVACY_VAULT_KEYS": json.dumps([new_key, self.key])}):
            with SecureStore(self.path, "synthetic_b") as b:
                b.rotate_keys()
        with patch.dict(os.environ, {"PRIVACY_VAULT_KEYS": json.dumps([new_key])}):
            with SecureStore(self.path, "synthetic_b") as b:
                self.assertEqual(b.get(b_id), "Synthetic B")

    def test_missing_key_does_not_create_database(self):
        with patch.dict(os.environ, {}, clear=True), self.assertRaises(RuntimeError):
            SecureStore(self.path, "synthetic_a")
        self.assertFalse(Path(self.path).exists())

    def test_absolute_session_lifetime_does_not_slide_on_repeated_activity(self):
        config = {"PRIVACY_OIDC_ISSUER": "https://id.example.org", "PRIVACY_ALLOWED_SUBJECTS": '["fictitious"]',
                  "PRIVACY_SESSION_MINUTES": "15"}
        claims = {"iss": config["PRIVACY_OIDC_ISSUER"], "sub": "fictitious", "iat": 1000, "exp": 10000}
        session = {}
        original = authenticate(claims, session, environ=config, now=1000)
        self.assertEqual(authenticate(claims, session, environ=config, now=1899).expires_at, original.expires_at)
        with self.assertRaises(AuthenticationError):
            authenticate(claims, session, environ=config, now=1900)

    def test_revocation_in_allowlist_takes_effect_for_existing_session(self):
        config = {"PRIVACY_OIDC_ISSUER": "https://id.example.org", "PRIVACY_ALLOWED_SUBJECTS": '["fictitious"]'}
        claims = {"iss": config["PRIVACY_OIDC_ISSUER"], "sub": "fictitious", "iat": 1000, "exp": 10000}
        session = {}
        authenticate(claims, session, environ=config, now=1000)
        config["PRIVACY_ALLOWED_SUBJECTS"] = '["another-fictitious"]'
        with self.assertRaises(AuthenticationError):
            authenticate(claims, session, environ=config, now=1001)
