import io
import json
import os
import unittest
from unittest.mock import patch
from search_api import search_public_web

class FakeResponse:
    def __enter__(self):
        return io.BytesIO(json.dumps({"web": {"results": [
            {"url": "https://example.org/profile", "title": "Example", "description": "Nom Exemple"},
            {"url": "http://localhost/private", "title": "Blocked"}
        ]}}).encode())
    def __exit__(self, *args):
        pass

class SearchApiTests(unittest.TestCase):
    def test_no_consent_no_request(self):
        with self.assertRaises(PermissionError):
            search_public_web("Nom Exemple", opener=lambda *a, **k: self.fail("Network attempted"))
    def test_disabled_by_default(self):
        with patch.dict(os.environ, {"PRIVACY_ENABLE_EXTERNAL_SEARCH": "0", "BRAVE_SEARCH_API_KEY": "fake"}):
            with self.assertRaises(RuntimeError):
                search_public_web("Nom Exemple", consent=True, opener=lambda *a, **k: self.fail("Network attempted"))
    def test_mocked_response_filters_unsafe_urls(self):
        with patch.dict(os.environ, {"PRIVACY_ENABLE_EXTERNAL_SEARCH": "1", "BRAVE_SEARCH_API_KEY": "test"}):
            results = search_public_web("Nom Exemple", consent=True, opener=lambda *a, **k: FakeResponse())
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0]["identity_confirmed"])
