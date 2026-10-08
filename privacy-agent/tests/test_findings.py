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


class AdditionalFindingSafetyTests(unittest.TestCase):
    def test_malformed_and_obfuscated_hosts_rejected(self):
        urls = [None, 12, [], "https://127.1/", "https://0x7f.0.0.1/", "https://2130706433/",
                "https://@example.org/", "https://example.org\\@localhost/", "https://foo。local/",
                "https://-bad.example.org/", "https://bad-.example.org/", "https://a..example.org/",
                "https://" + "a" * 64 + ".org/", "https://example.org/a\nb", "https://example.org/a\x7fb",
                "https://example.org/a\\b", "https://[::1]/", "https://a.test/"]
        for url in urls:
            with self.subTest(url=url), self.assertRaises(ValueError):
                normalize_public_url(url)

    def test_idna_and_default_port_normalized(self):
        self.assertEqual(normalize_public_url("https://ÉXAMPLE.org:443/a#frag"), "https://xn--xample-9ua.org/a")

    def test_invalid_lines(self):
        for lines in ("https://example.org", [None], [1]):
            with self.subTest(lines=lines), self.assertRaises(ValueError):
                prepare_findings(lines)
