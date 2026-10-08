import io
import json
import os
import unittest
from email.message import Message
from urllib.error import HTTPError, URLError
from urllib.request import Request
from unittest.mock import patch

import search_api
from search_api import SearchError, create_search_consent, search_public_web


class FakeResponse(io.BytesIO):
    def __init__(self, data=None, raw=None, status=200, content_type="application/json"):
        if data is None:
            data = {"web": {"results": [
                {"url": "https://example.org/profile", "title": "Example", "description": "Nom Exemple"},
                {"url": "http://localhost/private", "title": "Blocked"}
            ]}}
        super().__init__(raw if raw is not None else json.dumps(data).encode())
        self.status = status
        self.headers = Message()
        self.headers["Content-Type"] = content_type

    def getcode(self):
        return self.status


class SearchApiTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"PRIVACY_ENABLE_EXTERNAL_SEARCH": "1", "BRAVE_SEARCH_API_KEY": "fake-secret"})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.policy = patch.object(search_api, "_POLICY", search_api._SearchPolicy())
        self.policy.start()
        self.addCleanup(self.policy.stop)

    def consent(self, query="Nom Exemple", user_id="alice"):
        return create_search_consent(query, user_id=user_id, confirmed=True)

    def search(self, query="Nom Exemple", **kwargs):
        kwargs.setdefault("consent", self.consent(query))
        kwargs.setdefault("user_id", "alice")
        kwargs.setdefault("opener", lambda *a, **k: FakeResponse())
        return search_public_web(query, **kwargs)

    def test_no_consent_no_request(self):
        for consent in (None, True, "true", 1):
            with self.subTest(consent=consent), self.assertRaises(PermissionError):
                self.search(consent=consent, opener=lambda *a, **k: self.fail("Network attempted"))

    def test_confirmation_is_boolean_true(self):
        for confirmed in (None, False, "true", 1):
            with self.subTest(confirmed=confirmed), self.assertRaises(PermissionError):
                create_search_consent("Nom Exemple", user_id="alice", confirmed=confirmed)

    def test_disabled_by_default(self):
        with patch.dict(os.environ, {"PRIVACY_ENABLE_EXTERNAL_SEARCH": "0"}):
            with self.assertRaises(SearchError):
                self.search(opener=lambda *a, **k: self.fail("Network attempted"))

    def test_missing_api_key(self):
        with patch.dict(os.environ, {"BRAVE_SEARCH_API_KEY": ""}):
            with self.assertRaises(SearchError):
                self.search(opener=lambda *a, **k: self.fail("Network attempted"))

    def test_receipt_bound_to_user_and_exact_query(self):
        consent = self.consent()
        for query, user in [("Nom Autre", "alice"), ("Nom Exemple", "bob"), ("Nom Exemple ", "alice")]:
            with self.subTest(query=query, user=user), self.assertRaises(PermissionError):
                self.search(query, user_id=user, consent=consent)
        self.assertEqual(len(self.search(consent=consent)), 1)
        with self.assertRaises(PermissionError):
            self.search(consent=consent)

    def test_expired_consent(self):
        with patch.object(search_api.time, "monotonic", return_value=100):
            consent = self.consent()
        with patch.object(search_api.time, "monotonic", return_value=401):
            with self.assertRaises(PermissionError):
                self.search(consent=consent)

    def test_quota_per_user_and_expiration(self):
        with patch.object(search_api.time, "monotonic", return_value=100):
            for _ in range(search_api.USER_REQUEST_LIMIT):
                self.search()
            with self.assertRaisesRegex(SearchError, "Quota"):
                self.search()
            self.search(user_id="bob", consent=self.consent(user_id="bob"))
        with patch.object(search_api.time, "monotonic", return_value=3701):
            self.search()

    def test_global_quota(self):
        with patch.object(search_api, "GLOBAL_REQUEST_LIMIT", 2):
            self.search()
            self.search(user_id="bob", consent=self.consent(user_id="bob"))
            with self.assertRaisesRegex(SearchError, "Quota"):
                self.search(user_id="carol", consent=self.consent(user_id="carol"))

    def test_invalid_queries_and_limits(self):
        for query in (None, 123, "", "a" * 121, "a\nb", "a\rb", "a\x00b", "a\x7fb"):
            with self.subTest(query=query), self.assertRaises(ValueError):
                create_search_consent(query, user_id="alice", confirmed=True)
        for limit in (True, 0, 11, 1.5, "2"):
            with self.subTest(limit=limit), self.assertRaises(ValueError):
                self.search(limit=limit)

    def test_mocked_response_filters_unsafe_urls(self):
        results = self.search()
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0]["identity_confirmed"])

    def test_only_official_endpoint_and_timeout(self):
        def opener(request, *, timeout):
            self.assertEqual(timeout, 12)
            self.assertTrue(request.full_url.startswith(search_api.API_ENDPOINT + "?q=Nom+Exemple&count=5"))
            self.assertEqual(request.get_header("X-subscription-token"), "fake-secret")
            return FakeResponse()
        self.search(opener=opener)

    def test_redirect_refused(self):
        with self.assertRaises(SearchError):
            search_api._NoRedirect().redirect_request(None, None, 302, "moved", {}, "https://evil.example/")

    def test_errors_do_not_disclose_secrets_or_query(self):
        for exc in (URLError("Nom Exemple fake-secret"), HTTPError("https://evil/?q=Nom Exemple", 401, "fake-secret", {}, None), TimeoutError("fake-secret")):
            def opener(*a, **k):
                raise exc
            with self.subTest(exc=type(exc)), self.assertRaises(SearchError) as caught:
                self.search(opener=opener)
            self.assertNotIn("fake-secret", str(caught.exception))
            self.assertNotIn("Nom Exemple", str(caught.exception))
            self.assertTrue(caught.exception.__suppress_context__)

    def test_response_bounds_and_types(self):
        factories = [lambda: FakeResponse(raw=b"x" * (search_api.MAX_RESPONSE_BYTES + 1)),
                     lambda: FakeResponse(raw=b"{"), lambda: FakeResponse(data=[]),
                     lambda: FakeResponse(data={"web": []}),
                     lambda: FakeResponse(data={"web": {"results": "bad"}}),
                     lambda: FakeResponse(status=302), lambda: FakeResponse(content_type="text/html")]
        for factory in factories:
            with self.subTest(factory=factory), self.assertRaises(SearchError):
                self.search(opener=lambda *a, **k: factory())

    def test_malformed_items_and_duplicates(self):
        data = {"web": {"results": [None, {"url": None}, {"url": "https://example.org", "title": {}, "description": "a\x00b"}, {"url": "https://example.org/"}]}}
        results = self.search(opener=lambda *a, **k: FakeResponse(data))
        self.assertEqual(results, [{"url": "https://example.org/", "title": "", "description": "ab", "identity_confirmed": False}])

    def test_failed_attempt_consumes_consent(self):
        consent = self.consent()
        with self.assertRaises(SearchError):
            self.search(consent=consent, opener=lambda *a, **k: FakeResponse(status=503))
        with self.assertRaises(PermissionError):
            self.search(consent=consent)


class RedirectTransportTests(unittest.TestCase):
    def test_urllib_redirect_dispatch_cannot_forward_subscription(self):
        request = Request(search_api.API_ENDPOINT + "?q=Synthetic",
                          headers={"X-Subscription-Token": "fake-secret"})
        response_headers = Message()
        response_headers["Location"] = "https://attacker.invalid/collect"
        handler = search_api._NoRedirect()
        from unittest.mock import Mock
        parent = Mock()
        handler.add_parent(parent)
        with self.assertRaises(SearchError):
            handler.http_error_302(request, io.BytesIO(b""), 302, "Found", response_headers)
        parent.open.assert_not_called()

    def test_transport_installs_no_redirect_handler_and_preserves_proxy_configuration(self):
        from unittest.mock import Mock
        opener = Mock()
        with patch.object(search_api, "build_opener", return_value=opener) as build:
            request = Request(search_api.API_ENDPOINT)
            search_api._open(request, timeout=12)
        self.assertEqual(len(build.call_args.args), 1)
        self.assertIsInstance(build.call_args.args[0], search_api._NoRedirect)
        opener.open.assert_called_once_with(request, timeout=12)
