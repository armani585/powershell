import hashlib
import json
import unittest
from auth import authenticate, AuthenticationError


class AuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.config = {"PRIVACY_OIDC_ISSUER": "https://idp.example.org",
                       "PRIVACY_ALLOWED_SUBJECTS": '["subject-a", "subject-b"]'}
        self.claims = {"iss": "https://idp.example.org", "sub": "subject-a", "iat": 1000, "exp": 10000}

    def test_verified_subject_is_stable_and_pseudonymized(self):
        principal = authenticate(self.claims, {}, self.config, now=1001)
        expected = hashlib.sha256(json.dumps([self.claims['iss'], 'subject-a'], separators=(',', ':')).encode()).hexdigest()
        self.assertEqual(principal.user_id, expected)
        self.assertEqual(principal.expires_at, 2800)
        self.assertEqual(authenticate(dict(self.claims, email='changed@example.org'), {}, self.config, now=1001), principal)

    def test_configuration_required_and_no_wildcard_allowlist(self):
        for updates in ({}, {"PRIVACY_OIDC_ISSUER": "http://idp.example.org"},
                        {"PRIVACY_ALLOWED_SUBJECTS": "[]"}, {"PRIVACY_ALLOWED_SUBJECTS": '["*"]'},
                        {"PRIVACY_ALLOWED_SUBJECTS": '"subject-a"'}, {"PRIVACY_SESSION_MINUTES": "999"}):
            config = dict(self.config, **updates) if updates else {}
            with self.subTest(config=config), self.assertRaises(AuthenticationError):
                authenticate(self.claims, {}, config, now=1001)

    def test_identity_and_expiry_fail_closed(self):
        for updates in ({"iss": "https://other.example.org"}, {"sub": "not-authorized"},
                        {"sub": None}, {"exp": None}, {"exp": 1001}, {"exp": True},
                        {"exp": float('inf')}, {"iat": None}, {"iat": 9000}, {"iat": True}):
            with self.subTest(updates=updates), self.assertRaises(AuthenticationError):
                authenticate(dict(self.claims, **updates), {}, self.config, now=1001)

    def test_refresh_does_not_reset_absolute_expiry(self):
        for session in ({}, {"_privacy_auth": {"user_id": "anything", "expires_at": 9000}}):
            with self.assertRaises(AuthenticationError):
                authenticate(self.claims, session, self.config, now=2800)

    def test_prior_session_deadline_cannot_be_extended(self):
        state = {}
        first = authenticate(self.claims, state, self.config, now=1001)
        self.assertEqual(authenticate(self.claims, state, self.config, now=2000).expires_at, first.expires_at)
        with self.assertRaises(AuthenticationError):
            authenticate(dict(self.claims, iat=2000), state, self.config, now=2800)

    def test_account_switch_discards_private_session_content(self):
        state = {}
        first = authenticate(self.claims, state, self.config, now=1001)
        state['private_result'] = 'synthetic data'
        second = authenticate(dict(self.claims, sub='subject-b'), state, self.config, now=1001)
        self.assertNotEqual(first.user_id, second.user_id)
        self.assertNotIn('private_result', state)

    def test_issuer_is_part_of_identity(self):
        a = authenticate(self.claims, {}, self.config, now=1001)
        b = authenticate(dict(self.claims, iss='https://second.example.org'), {},
                         dict(self.config, PRIVACY_OIDC_ISSUER='https://second.example.org'), now=1001)
        self.assertNotEqual(a.user_id, b.user_id)


class StreamlitConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.config = {'PRIVACY_OIDC_ISSUER': 'https://idp.example.org', 'PRIVACY_ALLOWED_SUBJECTS': '["a"]'}
        self.secrets = {'auth': {'client_id': 'synthetic-client', 'client_secret': 'synthetic-secret',
                                'cookie_secret': 'synthetic-cookie-key-with-at-least-32-chars',
                                'redirect_uri': 'https://private.example.org/oauth2callback',
                                'server_metadata_url': 'https://idp.example.org/.well-known/openid-configuration'}}

    def test_valid_config_and_local_callback(self):
        from auth import validate_streamlit_configuration
        validate_streamlit_configuration(self.secrets, self.config)
        self.secrets['auth']['redirect_uri'] = 'http://127.0.0.1:8501/oauth2callback'
        validate_streamlit_configuration(self.secrets, self.config)

    def test_missing_weak_mismatched_and_unsafe_configs(self):
        from auth import validate_streamlit_configuration
        for name, value in [('client_secret', ''), ('cookie_secret', 'short'),
                            ('server_metadata_url', 'https://evil.example.org/.well-known/openid-configuration'),
                            ('redirect_uri', 'http://public.example.org/oauth2callback'),
                            ('redirect_uri', 'https://private.example.org/unexpected'),
                            ('redirect_uri', 'https://name:password@private.example.org/oauth2callback')]:
            bad = {'auth': dict(self.secrets['auth'], **{name: value})}
            with self.subTest(name=name, value=value), self.assertRaises(AuthenticationError):
                validate_streamlit_configuration(bad, self.config)
        with self.assertRaises(AuthenticationError):
            validate_streamlit_configuration({}, self.config)
