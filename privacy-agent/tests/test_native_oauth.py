"""Exercise Streamlit's actual server OAuth stack with a synthetic discovery server."""
import asyncio
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit, parse_qs

import httpx
from starlette.requests import Request
from streamlit.runtime.secrets import AttrDict
from streamlit.web.server.starlette.starlette_auth_routes import _create_oauth_client


class NativeOAuthTests(unittest.TestCase):
    def test_native_login_builds_oidc_redirect_with_state_nonce_and_pkce(self):
        auth = AttrDict({'client_id': 'synthetic-client', 'client_secret': 'synthetic-secret',
                         'cookie_secret': 'synthetic-cookie-key-at-least-32-characters',
                         'redirect_uri': 'https://private.example.org/oauth2callback',
                         'server_metadata_url': 'https://idp.example.org/.well-known/openid-configuration',
                         'client_kwargs': {'scope': 'openid', 'prompt': 'select_account'}})
        calls = []

        def discovery(request):
            calls.append(str(request.url))
            self.assertEqual(str(request.url), auth.server_metadata_url)
            return httpx.Response(200, json={'issuer': 'https://idp.example.org',
                'authorization_endpoint': 'https://idp.example.org/authorize',
                'token_endpoint': 'https://idp.example.org/token',
                'jwks_uri': 'https://idp.example.org/keys',
                'code_challenge_methods_supported': ['S256']})

        with patch('streamlit.web.server.starlette.starlette_auth_routes.get_secrets_auth_section', return_value=auth):
            client, callback = _create_oauth_client('default')
        client.client_kwargs['transport'] = httpx.MockTransport(discovery)
        request = Request({'type': 'http', 'method': 'GET', 'path': '/auth/login',
                           'headers': [], 'session': {}})
        response = asyncio.run(client.authorize_redirect(request, callback))
        self.assertEqual(response.status_code, 302)
        url = urlsplit(response.headers['location'])
        params = parse_qs(url.query)
        self.assertEqual(url.hostname, 'idp.example.org')
        self.assertEqual(params['scope'], ['openid'])
        self.assertEqual(params['redirect_uri'], [auth.redirect_uri])
        self.assertTrue(params['state'][0])
        self.assertTrue(params['nonce'][0])
        self.assertEqual(params['code_challenge_method'], ['S256'])
        self.assertTrue(params['code_challenge'][0])
        self.assertEqual(len(calls), 1)
        self.assertTrue(request.session)
        self.assertNotIn('synthetic-secret', response.headers['location'])
