"""Private provisioning using only fake Google credentials and subjects."""
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import tomllib
import unittest

from cryptography.fernet import Fernet
from google_setup import initialize, configure, readiness, _load_runtime
from auth import authenticate

CALLBACK = 'https://private.example.org/oauth2callback'


class GoogleProvisioningTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.config = self.root / 'config'

    def private_json(self, name, value):
        path = self.root / name
        path.write_text(json.dumps(value))
        path.chmod(0o600)
        return path

    def inputs(self, **changes):
        client = {'client_id': 'synthetic.apps.googleusercontent.com',
                  'client_secret': 'SYNTHETIC-NOT-A-REAL-SECRET', 'redirect_uris': [CALLBACK]}
        client.update(changes)
        return (self.private_json('client.json', {'web': client}),
                self.private_json('subjects.json', ['synthetic-subject-a']))

    def test_initialize_is_closed_and_private_and_idempotent(self):
        status = initialize(self.config, CALLBACK)
        self.assertTrue(status['encryption_key_valid'])
        self.assertTrue(status['cookie_secret_present'])
        self.assertFalse(status['oidc_configuration_valid'])
        self.assertFalse(status['external_search_enabled'])
        original = {p.name: p.read_bytes() for p in self.config.iterdir()}
        initialize(self.config, CALLBACK)
        self.assertEqual(original, {p.name: p.read_bytes() for p in self.config.iterdir()})
        self.assertEqual(stat.S_IMODE(self.config.stat().st_mode), 0o700)
        for path in self.config.iterdir():
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
        auth = tomllib.loads((self.config / 'secrets.toml').read_text())['auth']
        self.assertEqual(auth['client_kwargs'], {'scope': 'openid', 'prompt': 'select_account'})
        self.assertEqual(auth['client_id'], '')

    def test_configuration_keeps_encryption_key_and_authorizes_only_subject(self):
        initialize(self.config, CALLBACK)
        before = _load_runtime(self.config / 'runtime.env')['PRIVACY_VAULT_KEYS']
        client, subjects = self.inputs()
        status = configure(self.config, client, subjects)
        self.assertTrue(status['oidc_configuration_valid'])
        values = _load_runtime(self.config / 'runtime.env')
        self.assertEqual(values['PRIVACY_VAULT_KEYS'], before)
        claims = {'iss': 'https://accounts.google.com', 'sub': 'synthetic-subject-a', 'iat': 1000, 'exp': 2000}
        self.assertTrue(authenticate(claims, {}, values, now=1001).user_id)
        with self.assertRaises(ValueError):
            authenticate(dict(claims, sub='different-subject'), {}, values, now=1001)
        self.assertFalse(status['external_search_enabled'])

    def test_wrong_callback_and_invalid_subject_do_not_modify_config(self):
        initialize(self.config, CALLBACK)
        old = {p.name: p.read_bytes() for p in self.config.iterdir()}
        client, subjects = self.inputs(redirect_uris=['https://wrong.example.org/oauth2callback'])
        with self.assertRaises(ValueError):
            configure(self.config, client, subjects)
        client, subjects = self.inputs()
        for value in ([], ['*'], [''], [' invalid '], ['line\nbreak'], 'not-a-list'):
            subjects.write_text(json.dumps(value))
            with self.subTest(value=value), self.assertRaises(ValueError):
                configure(self.config, client, subjects)
        self.assertEqual(old, {p.name: p.read_bytes() for p in self.config.iterdir()})

    def test_symlink_and_readable_secret_files_are_rejected(self):
        initialize(self.config, CALLBACK)
        client, subjects = self.inputs()
        client.chmod(0o644)
        with self.assertRaises(ValueError):
            configure(self.config, client, subjects)
        client.chmod(0o600)
        linked = self.root / 'client-link.json'
        linked.symlink_to(client)
        with self.assertRaises(OSError):
            configure(self.config, linked, subjects)
        runtime = self.config / 'runtime.env'
        runtime.unlink()
        runtime.symlink_to(client)
        with self.assertRaises(OSError):
            initialize(self.config, CALLBACK)

    def test_readiness_does_not_expose_secrets_or_subjects(self):
        initialize(self.config, CALLBACK)
        client, subjects = self.inputs()
        configure(self.config, client, subjects)
        status = readiness(self.config)
        self.assertTrue(all(type(value) is bool for value in status.values()))
        output = subprocess.run([sys.executable, 'google_setup.py', '--directory', str(self.config), '--check'],
                                capture_output=True, text=True, check=True)
        self.assertNotIn('SYNTHETIC-NOT-A-REAL-SECRET', output.stdout + output.stderr)
        self.assertNotIn('synthetic-subject-a', output.stdout + output.stderr)
        key = json.loads(_load_runtime(self.config / 'runtime.env')['PRIVACY_VAULT_KEYS'])[0]
        self.assertNotIn(key, output.stdout + output.stderr)
        self.assertEqual(Fernet(key.encode()).decrypt(Fernet(key.encode()).encrypt(b'fictitious')), b'fictitious')

    def test_check_exit_nonzero_when_not_ready_and_missing_directory_creates_nothing(self):
        self.assertFalse(readiness(self.config)['oidc_configuration_valid'])
        self.assertFalse(self.config.exists())
        initialize(self.config, CALLBACK)
        result = subprocess.run([sys.executable, 'google_setup.py', '--directory', str(self.config), '--check'],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
