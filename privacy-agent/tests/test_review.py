import unittest
from review import assess_snippet, erasure_draft

class ReviewTests(unittest.TestCase):
    def test_exact_words_only(self):
        self.assertEqual(assess_snippet("Nom Exemple", "Le nom exemple apparaît")["status"], "Correspondance textuelle à vérifier")
        self.assertEqual(assess_snippet("Nom Exemple", "Le nom exemplicatif")["status"], "Correspondance partielle à vérifier")
        self.assertEqual(assess_snippet("Nom Exemple", "Aucun rapport")["status"], "Aucune correspondance textuelle")
    def test_draft_is_not_sent(self):
        draft = erasure_draft("https://example.org/profile")
        self.assertIn("article 17", draft)
        self.assertIn("https://example.org/profile", draft)
    def test_reject_invalid(self):
        with self.assertRaises(ValueError):
            erasure_draft("http://127.0.0.1")


class AdditionalReviewTests(unittest.TestCase):
    def test_invalid_types_and_controls(self):
        for query, snippet in [(None, "test"), ("test", None), ("a\nb", "test"), ("a\x00b", "test")]:
            with self.subTest(query=query), self.assertRaises(ValueError):
                assess_snippet(query, snippet)
