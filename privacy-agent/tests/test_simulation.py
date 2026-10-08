"""Tests de sécurité statiques de la V1 (aucun appel réseau)."""
from pathlib import Path
import ast
import unittest

APP = Path(__file__).resolve().parents[1] / "app.py"

class SimulationSafetyTests(unittest.TestCase):
    def test_syntax(self):
        ast.parse(APP.read_text(encoding="utf-8"))

    def test_no_network_or_email_imports(self):
        tree = ast.parse(APP.read_text(encoding="utf-8"))
        forbidden = {"requests", "httpx", "urllib", "smtplib", "playwright", "selenium", "socket"}
        imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.update(a.name.split(".")[0] for a in node.names)
            if isinstance(node, ast.ImportFrom) and node.module:
                imports.add(node.module.split(".")[0])
        self.assertFalse(imports & forbidden)

    def test_only_example_urls(self):
        source = APP.read_text(encoding="utf-8")
        self.assertIn("https://example.org/", source)
        self.assertNotIn("st.secrets", source)

if __name__ == "__main__":
    unittest.main()
