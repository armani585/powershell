"""Local Chromium acceptance against a temporary synthetic-only test harness.

No authentication bypass exists in app.py. This test generates a separate entry
point in a temporary directory, patches its server identity and provider, and
binds the server to loopback. Browser requests to external hosts are blocked.
"""
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from urllib.request import urlopen

from cryptography.fernet import Fernet

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(os.environ.get("PRIVACY_BROWSER_TESTS") == "1" and shutil.which("chromium"),
                     "Set PRIVACY_BROWSER_TESTS=1 with local socket permission and Chromium")
class BrowserAcceptanceTests(unittest.TestCase):
    def test_production_app_refuses_unconfigured_access_in_chromium(self):
        self.check_production_gate(identity_setup=False)

    def test_identity_setup_shows_login_without_private_workspace_in_chromium(self):
        self.check_production_gate(identity_setup=True)

    def check_production_gate(self, *, identity_setup):
        from playwright.sync_api import sync_playwright, expect
        with tempfile.TemporaryDirectory(prefix="privacy-gate-browser-") as temporary:
            folder = Path(temporary)
            with socket.socket() as reservation:
                reservation.bind(("127.0.0.1", 0))
                port = reservation.getsockname()[1]
            env = {key: value for key, value in os.environ.items()
                   if not key.startswith("PRIVACY_") and key != "BRAVE_SEARCH_API_KEY"}
            env["PRIVACY_DATA_DIR"] = str(folder / "data")
            if identity_setup:
                from google_setup import initialize, configure, _load_runtime
                config = folder / '.streamlit'
                callback = f'http://127.0.0.1:{port}/oauth2callback'
                # Provision with HTTPS, then substitute only the local test callback.
                initialize(config, 'https://private.example.org/oauth2callback')
                client = folder / 'client.json'
                client.write_text(json.dumps({'web': {'client_id': 'synthetic.apps.googleusercontent.com',
                    'client_secret': 'synthetic', 'redirect_uris': ['https://private.example.org/oauth2callback']}}))
                client.chmod(0o600)
                configure(config, client, identity_setup=True)
                secret_file = config / 'secrets.toml'
                secret_file.write_text(secret_file.read_text().replace('https://private.example.org/oauth2callback', callback))
                env.update(_load_runtime(config / 'runtime.env'))
            with (folder / "streamlit.log").open("w") as log:
                process = subprocess.Popen([
                    sys.executable, "-m", "streamlit", "run", str(ROOT / "app.py"),
                    "--server.address=127.0.0.1", f"--server.port={port}", "--server.headless=true",
                    "--browser.gatherUsageStats=false"], cwd=folder, env=env, stdout=log, stderr=subprocess.STDOUT)
                try:
                    deadline = time.monotonic() + 20
                    while True:
                        try:
                            with urlopen(f"http://127.0.0.1:{port}/_stcore/health", timeout=1):
                                break
                        except OSError:
                            if time.monotonic() >= deadline or process.poll() is not None:
                                self.fail("Production gate browser server failed to start")
                            time.sleep(0.1)
                    with sync_playwright() as playwright:
                        browser = playwright.chromium.launch(executable_path=shutil.which("chromium"),
                                                             headless=True, args=["--no-sandbox"])
                        context = browser.new_context(viewport={"width": 1400, "height": 1000})
                        context.route("**/*", lambda route: route.continue_()
                                      if route.request.url.startswith(f"http://127.0.0.1:{port}/") else route.abort())
                        page = context.new_page()
                        page.goto(f"http://127.0.0.1:{port}")
                        if identity_setup:
                            expect(page.get_by_role('button', name='Se connecter', exact=True)).to_be_visible()
                        else:
                            expect(page.get_by_text("Accès fermé : configuration OIDC et liste d'accès requises.", exact=True)).to_be_visible()
                        expect(page.get_by_role("textbox")).to_have_count(0)
                        expect(page.get_by_role("tab")).to_have_count(0)
                        self.assertFalse((folder / "data").exists())
                        evidence = Path(os.environ.get("PRIVACY_TEST_EVIDENCE_DIR", "/tmp/privacy-agent-evidence"))
                        evidence.mkdir(parents=True, exist_ok=True)
                        filename = 'browser-google-identification.png' if identity_setup else 'browser-production-access-denied.png'
                        page.screenshot(path=str(evidence / filename), full_page=True)
                        if identity_setup:
                            # Exercise native st.login and the real browser redirect,
                            # stopping before any provider request or real identity.
                            context.route(f'http://127.0.0.1:{port}/auth/login?*',
                                          lambda route: route.fulfill(status=200, content_type='text/plain',
                                                                      body='Synthetic native login redirect reached'))
                            page.get_by_role('button', name='Se connecter', exact=True).click()
                            expect(page.get_by_text('Synthetic native login redirect reached', exact=True)).to_be_visible()
                            self.assertFalse((folder / 'data').exists())
                        browser.close()
                finally:
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)

    def test_synthetic_search_review_export_and_deletion_in_chromium(self):
        from playwright.sync_api import sync_playwright, expect
        with tempfile.TemporaryDirectory(prefix="privacy-browser-") as temporary:
            folder = Path(temporary)
            harness = folder / "synthetic_test_app.py"
            harness.write_text(
                "from unittest.mock import patch\n"
                "from auth import Principal\n"
                "import app\n"
                "import streamlit as st\n"
                "st.session_state['_browser_cycle'] = st.session_state.get('_browser_cycle', 0) + 1\n"
                "from search_api import create_search_consent\n"
                "def fake_search(query, **kwargs):\n"
                "    return [{'title':'Fictitious browser result','url':'https://example.org/browser-result',"
                "'description':'Fictitious Browser','identity_confirmed':False}]\n"
                "with patch.object(app, 'require_user', return_value=Principal('synthetic-browser',9999999999)), "
                "patch.object(app, 'search_public_web', side_effect=fake_search):\n"
                "    app.main()\n"
                "st.caption(f\"Test render complete {st.session_state['_browser_cycle']}\")\n"
            )
            with socket.socket() as reservation:
                reservation.bind(("127.0.0.1", 0))
                port = reservation.getsockname()[1]
            env = dict(os.environ, PYTHONPATH=str(ROOT), PRIVACY_DATA_DIR=str(folder / "data"),
                       PRIVACY_VAULT_KEY=Fernet.generate_key().decode(), PRIVACY_ENABLE_EXTERNAL_SEARCH="1",
                       BRAVE_SEARCH_API_KEY="synthetic-only-no-network")
            env.pop("PRIVACY_VAULT_KEYS", None)
            with (folder / "streamlit.log").open("w") as log:
                process = subprocess.Popen([
                    sys.executable, "-m", "streamlit", "run", str(harness),
                    "--server.address=127.0.0.1", f"--server.port={port}", "--server.headless=true",
                    "--browser.gatherUsageStats=false"], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
                try:
                    deadline = time.monotonic() + 20
                    while True:
                        try:
                            with urlopen(f"http://127.0.0.1:{port}/_stcore/health", timeout=1) as response:
                                self.assertEqual(response.status, 200)
                            break
                        except OSError:
                            if time.monotonic() >= deadline or process.poll() is not None:
                                self.fail("Synthetic Streamlit browser harness failed to start")
                            time.sleep(0.1)
                    with sync_playwright() as playwright:
                        browser = playwright.chromium.launch(executable_path=shutil.which("chromium"),
                                                             headless=True, args=["--no-sandbox"])
                        context = browser.new_context(viewport={"width": 1400, "height": 1000})
                        context.route("**/*", lambda route: route.continue_()
                                      if route.request.url.startswith(f"http://127.0.0.1:{port}/") else route.abort())
                        page = context.new_page()
                        page.set_default_timeout(10000)
                        page.goto(f"http://127.0.0.1:{port}")
                        expect(page.get_by_role("heading", name="Privacy Agent", exact=False)).to_be_visible()
                        rendered = page.get_by_text("Test render complete", exact=False)
                        expect(rendered).to_be_visible()

                        def update(action):
                            previous = rendered.inner_text()
                            action()
                            expect(rendered).not_to_have_text(previous)
                            expect(page.locator('[data-testid="stApp"]')).to_have_attribute("data-test-script-state", "notRunning")

                        page.get_by_role("tab", name="Recherche Internet").click()
                        page.get_by_role("textbox", name="Terme exact à rechercher", exact=True).fill("Fictitious Browser")
                        update(lambda: page.get_by_role("textbox", name="Terme exact à rechercher", exact=True).press("Tab"))
                        search = page.get_by_role("button", name="Rechercher avec ce consentement", exact=True)
                        expect(page.locator('[data-testid="stApp"]')).to_have_attribute("data-test-script-state", "notRunning")
                        expect(search).to_be_disabled()
                        update(lambda: page.get_by_text("J'autorise la transmission de ce terme exact à Brave pour cette recherche.", exact=True).click())
                        expect(search).to_be_enabled()
                        expect(page.locator('[data-testid="stApp"]')).to_have_attribute("data-test-script-state", "notRunning")
                        update(lambda: search.click())
                        page.get_by_text("Résultat temporaire 1", exact=True).click()
                        expect(page.get_by_text("Fictitious browser result", exact=True)).to_be_visible()
                        update(lambda: page.get_by_role("button", name="Conserver ce résultat 7 jours", exact=True).click())
                        page.get_by_role("tab", name="Suivi RGPD", exact=True).click()
                        page.get_by_role("textbox", name="Organisme / destinataire vérifié", exact=True).fill("Organisme navigateur fictif")
                        page.get_by_role("textbox", name="URL HTTPS concernée", exact=True).fill("https://example.org/browser-request")
                        update(lambda: page.get_by_role("button", name="Créer un brouillon", exact=True).click())
                        page.get_by_text("Brouillon à examiner", exact=False).click()
                        approve = page.get_by_role("button", name="Valider le brouillon affiché", exact=True)
                        expect(approve).to_be_disabled()
                        update(lambda: page.get_by_text("J'ai vérifié le destinataire, l'URL et le texte affiché. Je valide ce contenu exact.", exact=True).click())
                        expect(approve).to_be_enabled()
                        expect(page.locator('[data-testid="stApp"]')).to_have_attribute("data-test-script-state", "notRunning")
                        update(lambda: approve.click())
                        # Expand the newly labelled case after the Streamlit rerun.
                        page.get_by_text("Validé pour copie manuelle", exact=False).click()
                        expect(page.get_by_text("Courrier validé : utilisez le bouton de copie du bloc ci-dessous. Aucun envoi.", exact=True)).to_be_visible()
                        evidence = Path(os.environ.get("PRIVACY_TEST_EVIDENCE_DIR", "/tmp/privacy-agent-evidence"))
                        evidence.mkdir(parents=True, exist_ok=True)
                        page.screenshot(path=str(evidence / "browser-approved-synthetic.png"), full_page=True)
                        page.get_by_role("tab", name="Mes données", exact=True).click()
                        update(lambda: page.get_by_text("Afficher mes données au format JSON pour les copier", exact=True).click())
                        expect(page.locator('code.language-json').filter(has_text='Organisme navigateur fictif')).to_be_visible()
                        delete = page.get_by_role("button", name="Supprimer toutes mes données locales", exact=True)
                        expect(delete).to_be_disabled()
                        update(lambda: page.get_by_text("Je confirme vouloir supprimer tous les dossiers, résultats et événements de mon espace.", exact=True).click())
                        update(lambda: delete.click())
                        page.get_by_role("tab", name="Suivi RGPD", exact=True).click()
                        expect(page.get_by_text("Organisme navigateur fictif", exact=True)).to_have_count(0)
                        self.assertEqual(page.locator('[data-testid="stException"]').count(), 0)
                        browser.close()
                finally:
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)
