import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
from cryptography.fernet import Fernet
from secure_store import SecureStore, purge_expired


class SecureStoreTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.path = str(Path(self.folder.name) / 'secure.db')
        self.key = Fernet.generate_key().decode()
        self.env = patch.dict(os.environ, {"PRIVACY_VAULT_KEY": self.key}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)

    def store(self, owner='user-a'):
        store = SecureStore(self.path, owner)
        self.addCleanup(store.close)
        return store

    def test_encrypt_read_update_delete(self):
        store = self.store()
        rowid = store.add('Identité fictive', kind='request')
        self.assertEqual(store.get(rowid), 'Identité fictive')
        self.assertTrue(store.update(rowid, 'Fiche modifiée'))
        self.assertEqual(store.get(rowid), 'Fiche modifiée')
        self.assertNotIn('Fiche modifiée'.encode(), Path(self.path).read_bytes())
        self.assertEqual(Path(self.path).stat().st_mode & 0o777, 0o600)
        self.assertTrue(store.delete(rowid))
        self.assertIsNone(store.get(rowid))

    def test_tenant_isolation_every_operation(self):
        a, b = self.store(), self.store('user-b')
        own = a.add('Secret fictif a')
        other = b.add('Secret fictif b')
        self.assertIsNone(a.get(other))
        self.assertFalse(a.update(other, 'overwrite'))
        self.assertFalse(a.delete(other))
        self.assertEqual([row['id'] for row in a.list_records()], [own])
        self.assertEqual(a.clear(), 1)
        self.assertEqual(b.get(other), 'Secret fictif b')

    def test_retention_boundaries_and_no_extension(self):
        store = self.store()
        for ttl in (0, -1, 31, True, 1.1, '1'):
            with self.subTest(ttl=ttl), self.assertRaises(ValueError):
                store.add('Fictif', ttl_days=ttl)
        with patch('secure_store.time.time', return_value=1000):
            rowid = store.add('Fictif', 1)
        with patch('secure_store.time.time', return_value=2000):
            store.update(rowid, 'Fictif modifié')
            self.assertEqual(store.list_records()[0]['expires_at'], 87400)
        with patch('secure_store.time.time', return_value=87400):
            self.assertIsNone(store.get(rowid))
            self.assertEqual(store.list_records(), [])

    def test_maintenance_purges_inactive_owners_without_keys(self):
        store = self.store()
        with patch('secure_store.time.time', return_value=1000):
            store.add('Expired', 1)
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(purge_expired(self.path, now=87400), 1)
        self.assertEqual(purge_expired(self.path + '.missing'), 0)

    def test_rotation_then_old_key_removal(self):
        store = self.store()
        record = store.add('Rotation fictive')
        new = Fernet.generate_key().decode()
        with patch.dict(os.environ, {'PRIVACY_VAULT_KEYS': json.dumps([new, self.key])}):
            fresh = self.store()
            self.assertEqual(fresh.rotate_keys(), 1)
        with patch.dict(os.environ, {'PRIVACY_VAULT_KEY': new}):
            self.assertEqual(self.store().get(record), 'Rotation fictive')
        with self.assertRaises(ValueError):
            store.get(record)

    def test_wrong_key_fails(self):
        record = self.store().add('Protected')
        with patch.dict(os.environ, {'PRIVACY_VAULT_KEY': Fernet.generate_key().decode()}):
            with self.assertRaises(ValueError):
                self.store().get(record)

    def test_ciphertext_bound_to_owner_id_kind_and_expiry(self):
        store = self.store()
        a, b = store.add('A'), store.add('B')
        payload = store.db.execute('SELECT payload FROM secure_records WHERE id=?', (a,)).fetchone()[0]
        store.db.execute('UPDATE secure_records SET payload=? WHERE id=?', (payload, b))
        store.db.commit()
        with self.assertRaises(ValueError):
            store.get(b)
        store.db.execute("UPDATE secure_records SET owner='user-b' WHERE id=?", (a,))
        store.db.commit()
        with self.assertRaises(ValueError):
            self.store('user-b').get(a)

    def test_bad_input_rolls_back_empty_insert(self):
        store = self.store()
        with self.assertRaises(ValueError):
            store.add('a' * 65537)
        self.assertEqual(store.list_records(), [])
        with self.assertRaises(ValueError):
            store.add('Fictif', kind='personal@example.org')

    def test_no_implicit_identity_or_key(self):
        for identity in ('', None, 'a/b', '\n', 'x' * 129):
            with self.assertRaises(ValueError):
                SecureStore(self.path, identity)
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(RuntimeError):
                self.store()
        self.assertFalse(Path(self.path).exists())

    def test_reject_unowned_legacy_store(self):
        with sqlite3.connect(self.path) as db:
            db.execute('CREATE TABLE secure_records (id INTEGER PRIMARY KEY,payload BLOB,expires_at INTEGER)')
        with self.assertRaises(RuntimeError):
            self.store()

    def test_compare_and_swap_rejects_stale_approval(self):
        first = self.store()
        second = self.store()
        rowid = first.add('draft-v1')
        read = second.get(rowid)
        self.assertTrue(first.update(rowid, 'draft-v2', expected_value='draft-v1'))
        self.assertFalse(second.update(rowid, 'approved-v1', expected_value=read))
        self.assertEqual(first.get(rowid), 'draft-v2')

    def test_tampered_deadline_and_kind_fail_integrity_check(self):
        store = self.store()
        first, second = store.add('first'), store.add('second')
        store.db.execute('UPDATE secure_records SET expires_at=expires_at+86400 WHERE id=?', (first,))
        store.db.execute("UPDATE secure_records SET kind='request' WHERE id=?", (second,))
        store.db.commit()
        for rowid in (first, second):
            with self.assertRaises(ValueError):
                store.get(rowid)

    def test_request_retention_allows_followup_with_hard_ninety_day_cap(self):
        store = self.store()
        with patch('secure_store.time.time', return_value=1000):
            rowid = store.add('Synthetic request', ttl_days=90, kind='request')
            self.assertEqual(store.list_records()[0]['expires_at'], 1000 + 90 * 86400)
            self.assertIsNotNone(store.get(rowid))
        with self.assertRaises(ValueError):
            store.add('Too long', ttl_days=91, kind='request')
        with self.assertRaises(ValueError):
            store.add('Result too long', ttl_days=31, kind='result')
