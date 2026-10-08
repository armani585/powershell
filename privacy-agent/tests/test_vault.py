import os
import unittest
from unittest.mock import patch
from cryptography.fernet import Fernet
from vault import encrypt_text, decrypt_text

class VaultTests(unittest.TestCase):
    def test_key_required(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(RuntimeError):
                encrypt_text("exemple")
    def test_encrypted_roundtrip(self):
        key = Fernet.generate_key().decode()
        with patch.dict(os.environ, {"PRIVACY_VAULT_KEY": key}):
            cipher = encrypt_text("Texte fictif")
            self.assertNotIn(b"Texte fictif", cipher)
            self.assertEqual(decrypt_text(cipher), "Texte fictif")
    def test_wrong_key_fails(self):
        with patch.dict(os.environ, {"PRIVACY_VAULT_KEY": Fernet.generate_key().decode()}):
            cipher = encrypt_text("fictif")
        with patch.dict(os.environ, {"PRIVACY_VAULT_KEY": Fernet.generate_key().decode()}):
            with self.assertRaises(ValueError):
                decrypt_text(cipher)
