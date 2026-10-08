import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from discovery import prepare_searches

class DiscoveryTests(unittest.TestCase):
    def test_preview_encodes_and_does_not_fetch(self):
        result = prepare_searches(["Nom Exemple"])
        self.assertEqual(len(result), 2)
        self.assertIn("Nom+Exemple", result[0].url)
    def test_invalid_engine(self):
        with self.assertRaises(ValueError):
            prepare_searches(["test"], ("unknown",))
    def test_limits(self):
        with self.assertRaises(ValueError):
            prepare_searches(["x"] * 11)

if __name__ == "__main__":
    unittest.main()
