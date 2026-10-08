"""Google identification is separate from authorization; synthetic identities only."""
import json
import os
from pathlib import Path
import tempfile
import time
import tomllib
import unittest
from unittest.mock import patch
from streamlit.testing.v1 import AppTest
from auth import authenticate, AuthenticationError
from google_setup import initialize, configure, _load_runtime

APP = Path(__file__).resolve().parents[1] / 'app.py'
CALLBACK = 'https://private.example.org/oauth2callback'

class NativeUser(dict):
    is_logged_in = True

class IdentitySetupTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.config = self.root / 'config'
        initialize(self.config, CALLBACK)
        self.client = self.root / 'client.json'
        self.client.write_text(json.dumps({'web': {'client_id': 'synthetic.apps.googleusercontent.com',
            'client_secret': 'synthetic-secret', 'redirect_uris': [CALLBACK]}}))
        self.client.chmod(0o600)
        self.status = configure(self.config, self.client, identity_setup=True)
        self.env = _load_runtime(self.config / 'runtime.env')
        self.env['PRIVACY_DATA_DIR'] = str(self.root / 'data')
        self.claims = {'iss': 'https://accounts.google.com', 'sub': 'synthetic-subject',
                       'iat': time.time(), 'exp': time.time() + 3600}

    def app(self, user, *, closed=False):
        with patch.dict(os.environ, self.env, clear=True), patch('streamlit.user', user):
            app = AppTest.from_file(str(APP))
            app.secrets.update(tomllib.loads((self.config / 'secrets.toml').read_text()))
            app.session_state['old_private_data'] = 'previous account private state'
            app.run()
        self.assertEqual(len(app.exception), 0)
        self.assertEqual(len(app.tabs), 0)
        self.assertEqual(len(app.text_input), 0)
        self.assertFalse((self.root / 'data').exists())
        if not closed:
            self.assertNotIn('old_private_data', app.session_state)
        return app

    def test_identifies_only_and_does_not_grant_principal(self):
        self.assertTrue(self.status['identity_setup_ready'])
        for name in ('oidc_configuration_valid', 'subject_allowlist_present', 'external_search_enabled'):
            self.assertFalse(self.status[name])
        app = self.app(NativeUser(self.claims))
        self.assertEqual([code.value for code in app.code], ['synthetic-subject'])
        with self.assertRaises(AuthenticationError):
            authenticate(self.claims, {}, self.env)
        self.assertEqual(json.loads(_load_runtime(self.config / 'runtime.env')['PRIVACY_ALLOWED_SUBJECTS']), [])

    def test_anonymous_gets_login_only(self):
        user = NativeUser()
        user.is_logged_in = False
        app = self.app(user)
        self.assertEqual(len(app.code), 0)
        self.assertEqual([button.label for button in app.button], ['Se connecter'])

    def test_login_click_calls_native_login_and_clears_private_state(self):
        user = NativeUser()
        user.is_logged_in = False
        app = self.app(user)
        with patch.dict(os.environ, self.env, clear=True), patch('streamlit.user', user), patch('streamlit.login') as login:
            app.session_state['old_private_data'] = 'discard me'
            app.button(key='privacy-login').click().run()
            login.assert_called_once_with()
            self.assertEqual(len(app.exception), 0)
            self.assertNotIn('old_private_data', app.session_state)
            self.assertFalse((self.root / 'data').exists())

    def test_setup_logout_click_calls_native_logout(self):
        user = NativeUser(self.claims)
        app = self.app(user)
        with patch.dict(os.environ, self.env, clear=True), patch('streamlit.user', user), patch('streamlit.logout') as logout:
            app.button(key='privacy-setup-logout').click().run()
            logout.assert_called_once_with()

    def test_rejected_account_can_logout_without_losing_deadline(self):
        self.env.update(PRIVACY_IDENTITY_SETUP='0', PRIVACY_ALLOWED_SUBJECTS='["different-account"]')
        user = NativeUser(self.claims)
        app = self.app(user)
        with patch.dict(os.environ, self.env, clear=True), patch('streamlit.user', user), patch('streamlit.logout') as logout:
            app.session_state['_privacy_auth'] = {'user_id': 'old', 'expires_at': 1}
            app.button(key='privacy-invalid-logout').click().run()
            logout.assert_called_once_with()
            self.assertEqual(app.session_state['_privacy_auth']['expires_at'], 1)

    def test_invalid_native_claims_never_display_identity(self):
        for changes in ({'iss': 'https://wrong.example.org'}, {'exp': 0}, {'iat': 0},
                        {'exp': float('nan')}, {'iat': True}, {'sub': '*'},
                        {'sub': ''}, {'sub': ' bad '}, {'sub': 'a\nb'}, {'sub': None}):
            with self.subTest(changes=changes):
                app = self.app(NativeUser(dict(self.claims, **changes)))
                self.assertEqual(len(app.code), 0)
                self.assertTrue(app.error)

    def test_activation_requires_explicit_subject_and_disables_setup(self):
        subjects = self.root / 'subjects.json'
        subjects.write_text('["synthetic-subject"]')
        subjects.chmod(0o600)
        result = configure(self.config, self.client, subjects)
        values = _load_runtime(self.config / 'runtime.env')
        self.assertTrue(result['oidc_configuration_valid'])
        self.assertFalse(result['identity_setup_ready'])
        self.assertEqual(values['PRIVACY_IDENTITY_SETUP'], '0')
        self.assertEqual(values['PRIVACY_VAULT_KEYS'], self.env['PRIVACY_VAULT_KEYS'])
        self.assertTrue(authenticate(self.claims, {}, values).user_id)
        original = {p.name: p.read_bytes() for p in self.config.iterdir()}
        with self.assertRaises(ValueError):
            configure(self.config, self.client, identity_setup=True)
        self.assertEqual(original, {p.name: p.read_bytes() for p in self.config.iterdir()})

    def test_setup_flag_cannot_override_allowlist_or_issuer(self):
        for change in ({'PRIVACY_ALLOWED_SUBJECTS': '["synthetic-subject"]'},
                       {'PRIVACY_OIDC_ISSUER': 'https://other.example.org'}, {'PRIVACY_IDENTITY_SETUP': '0'}):
            with self.subTest(change=change), patch.dict(self.env, change):
                app = self.app(NativeUser(self.claims), closed=True)
                self.assertEqual(len(app.code), 0)
                self.assertTrue(app.error)
