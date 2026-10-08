"""Streamlit UI acceptance with an injected synthetic server principal.

The production authentication gate has no bypass; only unittest patches it here.
"""
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from cryptography.fernet import Fernet
from streamlit.testing.v1 import AppTest
from auth import Principal
from secure_store import SecureStore

APP = Path(__file__).resolve().parents[1] / "app.py"


class AppTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        env = patch.dict(os.environ, {"PRIVACY_DATA_DIR": self.folder.name,
                                      "PRIVACY_VAULT_KEY": Fernet.generate_key().decode()}, clear=True)
        env.start()
        self.addCleanup(env.stop)
        self.principal = Principal("synthetic-ui-a", 9999999999)
        self.path = str(Path(self.folder.name) / "privacy-secure-v2.db")

    def authenticated(self):
        gate = patch("auth.require_user", return_value=self.principal)
        gate.start()
        self.addCleanup(gate.stop)
        app = AppTest.from_file(str(APP)).run()
        self.assertEqual(len(app.exception), 0)
        return app

    def element(self, elements, label):
        return next(element for element in elements if element.label == label)

    def click(self, app, label):
        self.element(app.button, label).click().run()
        self.assertEqual(len(app.exception), 0)

    def create_case(self, app):
        self.element(app.text_input, "Organisme / destinataire vérifié").input("Organisme UI fictif")
        self.element(app.text_input, "URL HTTPS concernée").input("https://example.org/ui-test")
        self.click(app, "Créer un brouillon")

    def test_missing_auth_config_blocks_data_and_database_creation(self):
        app = AppTest.from_file(str(APP)).run()
        self.assertEqual(len(app.exception), 0)
        self.assertTrue(any("Accès fermé" in item.value for item in app.error))
        self.assertEqual(len(app.text_input), 0)
        self.assertEqual(len(app.get("download_button")), 0)
        self.assertFalse(Path(self.path).exists())

    def test_missing_encryption_key_blocks_authenticated_workspace(self):
        os.environ.pop("PRIVACY_VAULT_KEY")
        app = self.authenticated()
        self.assertTrue(any("Espace indisponible" in item.value for item in app.error))
        self.assertEqual(len(app.text_input), 0)
        self.assertFalse(Path(self.path).exists())

    def test_create_review_export_edit_invalidates_export(self):
        app = self.authenticated()
        self.create_case(app)
        approve = self.element(app.button, "Valider le brouillon affiché")
        self.assertTrue(approve.disabled)
        self.assertFalse(any("Courrier validé :" in item.value for item in app.caption))
        review = next(item for item in app.checkbox if item.key and item.key.startswith("review-"))
        review.check().run()
        self.click(app, "Valider le brouillon affiché")
        self.assertTrue(any("Courrier validé :" in item.value for item in app.caption))
        self.element(app.text_area, "Texte à relire et compléter").input("Nouveau texte fictif nécessitant une relecture.")
        self.click(app, "Enregistrer et demander une nouvelle validation")
        self.assertFalse(any("Courrier validé :" in item.value for item in app.caption))
        self.assertTrue(self.element(app.button, "Valider le brouillon affiché").disabled)
        with SecureStore(self.path, self.principal.user_id) as store:
            case = json.loads(store.list_records(kind="request")[0]["value"])
            self.assertEqual(case["status"], "draft")
            self.assertIsNone(case["approval"])
            self.assertEqual(case["revision"], 2)

    def test_bad_request_url_shows_safe_error_without_saving(self):
        app = self.authenticated()
        self.element(app.text_input, "Organisme / destinataire vérifié").input("Organisme fictif")
        self.element(app.text_input, "URL HTTPS concernée").input("https://127.1/private")
        self.click(app, "Créer un brouillon")
        self.assertTrue(any("URL invalide" in item.value for item in app.error))
        with SecureStore(self.path, self.principal.user_id) as store:
            self.assertEqual(store.list_records(kind="request"), [])

    def test_search_requires_specific_consent_and_saves_only_on_click(self):
        os.environ.update(PRIVACY_ENABLE_EXTERNAL_SEARCH="1", BRAVE_SEARCH_API_KEY="synthetic-key")
        results = [{"title": "Fictitious UI", "url": "https://example.org/ui-search",
                    "description": "Fictitious Example", "identity_confirmed": False}]
        with patch("search_api.search_public_web", return_value=results) as provider:
            app = self.authenticated()
            self.element(app.text_input, "Terme exact à rechercher").input("Fictitious Example").run()
            self.assertTrue(self.element(app.button, "Rechercher avec ce consentement").disabled)
            provider.assert_not_called()
            consent = next(item for item in app.checkbox if item.key == "search-consent")
            consent.check().run()
            self.click(app, "Rechercher avec ce consentement")
            provider.assert_called_once()
            self.assertTrue(self.element(app.button, "Rechercher avec ce consentement").disabled)
            self.assertEqual(provider.call_args.kwargs["user_id"], self.principal.user_id)
            with SecureStore(self.path, self.principal.user_id) as store:
                self.assertEqual(store.list_records(kind="finding"), [])
            self.click(app, "Conserver ce résultat 7 jours")
            with SecureStore(self.path, self.principal.user_id) as store:
                self.assertEqual(len(store.list_records(kind="finding")), 1)
            self.element(app.text_input, "Terme exact à rechercher").input("Changed fictitious query").run()
            self.assertTrue(self.element(app.button, "Rechercher avec ce consentement").disabled)
            self.assertFalse(any(item.label == "Conserver ce résultat 7 jours" for item in app.button))

    def test_provider_error_does_not_show_query_or_secret(self):
        os.environ.update(PRIVACY_ENABLE_EXTERNAL_SEARCH="1", BRAVE_SEARCH_API_KEY="synthetic-secret")
        with patch("search_api.search_public_web", side_effect=RuntimeError("leak synthetic-secret Fictitious Query")):
            app = self.authenticated()
            self.element(app.text_input, "Terme exact à rechercher").input("Fictitious Query").run()
            next(item for item in app.checkbox if item.key == "search-consent").check().run()
            self.click(app, "Rechercher avec ce consentement")
            self.assertTrue(app.error)
            self.assertNotIn("synthetic-secret", " ".join(item.value for item in app.error))
            self.assertNotIn("Fictitious Query", " ".join(item.value for item in app.error))
            self.assertTrue(self.element(app.button, "Rechercher avec ce consentement").disabled)
            self.assertFalse(app.checkbox(key="search-consent").value)

    def test_delete_all_is_confirmed_and_preserves_other_users(self):
        app = self.authenticated()
        self.create_case(app)
        with SecureStore(self.path, "synthetic-ui-b") as other:
            other_id = other.add(json.dumps({"synthetic": "Other user secret"}), kind="finding")
        self.assertTrue(self.element(app.button, "Supprimer toutes mes données locales").disabled)
        self.element(app.checkbox, "Je confirme vouloir supprimer tous les dossiers, résultats et événements de mon espace.").check().run()
        self.click(app, "Supprimer toutes mes données locales")
        with SecureStore(self.path, self.principal.user_id) as store, SecureStore(self.path, "synthetic-ui-b") as other:
            self.assertEqual(store.list_records(), [])
            self.assertIsNotNone(other.get(other_id))
        self.assertFalse(any("Dossier " in item.label for item in app.expander))

    def test_workspace_displays_only_its_owner_records(self):
        from workflow import create_request
        with SecureStore(self.path, "synthetic-ui-b") as other:
            other.add(json.dumps(create_request("Organisme secret B", "https://example.org/b")), kind="request")
        app = self.authenticated()
        self.create_case(app)
        displayed = " ".join(item.value for item in app.text)
        self.assertIn("Organisme UI fictif", displayed)
        self.assertNotIn("Organisme secret B", displayed)
        self.assertEqual(sum(item.label.startswith("Dossier ") for item in app.expander), 1)
        self.element(app.checkbox, "Afficher mes données au format JSON pour les copier").check().run()
        export = next(item.value for item in app.code if item.language == "json")
        self.assertIn("Organisme UI fictif", export)
        self.assertNotIn("Organisme secret B", export)

    def test_query_round_trip_never_restores_prior_consent(self):
        os.environ.update(PRIVACY_ENABLE_EXTERNAL_SEARCH="1", BRAVE_SEARCH_API_KEY="synthetic-key")
        app = self.authenticated()
        field = lambda: self.element(app.text_input, "Terme exact à rechercher")
        field().input("Fictitious A").run()
        app.checkbox(key="search-consent").check().run()
        field().input("Fictitious B").run()
        field().input("Fictitious A").run()
        self.assertFalse(app.checkbox(key="search-consent").value)
        self.assertTrue(self.element(app.button, "Rechercher avec ce consentement").disabled)

    def test_full_manual_tracking_requires_attestation_and_reaches_closed(self):
        app = self.authenticated()
        self.create_case(app)
        next(c for c in app.checkbox if c.key and c.key.startswith("review-")).check().run()
        self.click(app, "Valider le brouillon affiché")
        self.click(app, "Enregistrer ma déclaration d'envoi manuel")
        self.assertTrue(any("Attestation explicite" in e.value for e in app.error))
        self.element(app.checkbox, "J'atteste avoir envoyé moi-même ce courrier validé hors de l'application.").check()
        self.click(app, "Enregistrer ma déclaration d'envoi manuel")
        self.assertTrue(any("provisoire" in c.value for c in app.caption))
        self.click(app, "Enregistrer la réception")
        self.assertTrue(any("un mois après réception" in c.value for c in app.caption))
        self.click(app, "Enregistrer la réponse")
        self.click(app, "Clôturer le suivi")
        with SecureStore(self.path, self.principal.user_id) as store:
            record = json.loads(store.list_records(kind="request")[0]["value"])
        self.assertEqual(record["status"], "closed")
        self.assertTrue(record["sent_on"] and record["received_on"] and record["response_received_on"])
