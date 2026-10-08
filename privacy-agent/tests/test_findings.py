import unittest
from findings import normalize_public_url, prepare_findings

class FindingsTests(unittest.TestCase):
    def test_valid_and_deduplicated(self):
        self.assertEqual(prepare_findings(["https://example.org/test#frag","https://example.org/test"]), ["https://example.org/test"])
    def test_private_or_unsafe_urls_rejected(self):
        for url in ["http://example.org", "https://localhost/a", "https://127.0.0.1/", "https://user:pass@example.org/", "https://example.org:8080/", "file:///etc/passwd", "https://a.local/"]:
            with self.subTest(url=url), self.assertRaises(ValueError):
                normalize_public_url(url)
    def test_limit(self):
        with self.assertRaises(ValueError):
            prepare_findings(["https://example.org"] * 26)
