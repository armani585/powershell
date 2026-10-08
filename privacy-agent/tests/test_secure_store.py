import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
from cryptography.fernet import Fernet
from secure_store import SecureStore

class SecureStoreTests(unittest.TestCase):
    def test_encrypt_read_delete(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {"PRIVACY_VAULT_KEY": Fernet.generate_key().decode()}):
            store = SecureStore(folder + "/secure.db")
            rowid = store.add("Identité fictive")
            self.assertEqual(store.get(rowid), "Identité fictive")
            raw = sqlite3.connect(folder + "/secure.db").execute("SELECT payload FROM secure_records").fetchone()[0]
            self.assertNotIn(b"Identit", raw)
            store.delete(rowid)
            self.assertIsNone(store.get(rowid))
            store.close()
    def test_expiration_and_ttl(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {"PRIVACY_VAULT_KEY": Fernet.generate_key().decode()}):
            store = SecureStore(folder + "/secure.db")
            with self.assertRaises(ValueError):
                store.add("Fictif", 31)
            rowid = store.add("Fictif", 1)
            store.db.execute("UPDATE secure_records SET expires_at=0 WHERE id=?", (rowid,))
            store.db.commit()
            self.assertIsNone(store.get(rowid))
            store.close()
