"""Cross-module acceptance checks using synthetic identities and no network."""
from datetime import date, datetime, timezone
from email.message import Message
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from cryptography.fernet import Fernet
from auth import authenticate
from secure_store import SecureStore, purge_expired
import search_api
from workflow import (approve_request, attest_manual_send, close_request, create_request,
                      due_status, edit_request, export_request, record_response, request_digest)


class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.path = str(Path(self.folder.name) / "private.db")
        self.key = Fernet.generate_key().decode()
        self.env = patch.dict(os.environ, {"PRIVACY_VAULT_KEY": self.key}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        self.config = {"PRIVACY_OIDC_ISSUER": "https://identity.example.org",
                       "PRIVACY_ALLOWED_SUBJECTS": '["fictitious-a", "fictitious-b"]'}
        self.now = datetime(2026, 1, 31, 12, tzinfo=timezone.utc)
        self.alice = self.principal("fictitious-a")
        self.bob = self.principal("fictitious-b")

    def principal(self, subject):
        return authenticate({"iss": self.config["PRIVACY_OIDC_ISSUER"], "sub": subject,
                             "iat": 1000, "exp": 2000}, {}, environ=self.config, now=1000)

    def test_authenticated_encrypted_case_review_and_manual_tracking(self):
        original = create_request("Organisme fictif", "https://example.org/profile", now=self.now)
        with SecureStore(self.path, self.alice.user_id) as store:
            record_id = store.add(json.dumps(original), kind="request", ttl_days=30)
            loaded = json.loads(store.get(record_id))
            with self.assertRaises(PermissionError):
                export_request(loaded)
            approved = approve_request(loaded, reviewer_id=self.alice.user_id,
                                       expected_digest=request_digest(loaded), confirmed=True, now=self.now)
            self.assertTrue(store.update(record_id, json.dumps(approved)))
            self.assertIn("Organisme fictif", export_request(json.loads(store.get(record_id))))
            sent = attest_manual_send(approved, confirmed=True, sent_on=date(2026, 1, 31), now=self.now)
            self.assertEqual(due_status(sent, today=date(2026, 2, 1))["due_on"], "2026-02-28")
            replied = record_response(sent, response_received_on=date(2026, 1, 31), now=self.now)
            closed = close_request(replied, now=self.now)
            store.update(record_id, json.dumps(closed))
            self.assertEqual(json.loads(store.get(record_id))["status"], "closed")
        self.assertNotIn(b"Organisme fictif", Path(self.path).read_bytes())
        self.assertNotIn(b"https://example.org/profile", Path(self.path).read_bytes())
        with SecureStore(self.path, self.bob.user_id) as other:
            self.assertIsNone(other.get(record_id))
            self.assertEqual(other.list_records(), [])

    def test_modified_letter_requires_new_human_review_after_reload(self):
        draft = create_request("Destinataire fictif", "https://example.org/profile", now=self.now)
        approved = approve_request(draft, reviewer_id=self.alice.user_id,
                                   expected_digest=request_digest(draft), confirmed=True, now=self.now)
        with SecureStore(self.path, self.alice.user_id) as store:
            record_id = store.add(json.dumps(approved), kind="request")
            revised = edit_request(json.loads(store.get(record_id)), body="Lettre fictive corrigée", now=self.now)
            store.update(record_id, json.dumps(revised))
            with self.assertRaises(PermissionError):
                export_request(json.loads(store.get(record_id)))
            self.assertEqual(json.loads(store.get(record_id))["status"], "draft")

    def test_account_switch_clears_memory_but_keeps_data_owner_scoped(self):
        session = {}
        claims = {"iss": self.config["PRIVACY_OIDC_ISSUER"], "sub": "fictitious-a", "iat": 1000, "exp": 2000}
        alice = authenticate(claims, session, environ=self.config, now=1000)
        session["search_results"] = [{"description": "Fictitious private result"}]
        with SecureStore(self.path, alice.user_id) as store:
            record_id = store.add("Fictitious private result")
        claims["sub"] = "fictitious-b"
        bob = authenticate(claims, session, environ=self.config, now=1001)
        self.assertNotIn("search_results", session)
        with SecureStore(self.path, bob.user_id) as store:
            self.assertIsNone(store.get(record_id))

    def test_maintenance_purges_absent_users_without_decryption_keys(self):
        with patch("secure_store.time.time", return_value=1000):
            with SecureStore(self.path, self.alice.user_id) as a, SecureStore(self.path, self.bob.user_id) as b:
                a.add("Fictitious expired A", ttl_days=1)
                b.add("Fictitious expired B", ttl_days=1)
                retained_id = b.add("Fictitious retained B", ttl_days=2)
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(purge_expired(self.path, now=87400), 2)
        with patch("secure_store.time.time", return_value=87400):
            with SecureStore(self.path, self.bob.user_id) as b:
                self.assertEqual(b.get(retained_id), "Fictitious retained B")

    def test_consented_mock_search_results_are_encrypted_and_owner_isolated(self):
        response = io.BytesIO(json.dumps({"web": {"results": [
            {"url": "https://example.org/profile", "title": "Fictitious search result",
             "description": "Fictitious Example match"},
            {"url": "https://127.1/internal", "title": "Unsafe destination"},
        ]}}).encode())
        response.headers = Message()
        response.headers["Content-Type"] = "application/json"
        response.getcode = lambda: 200
        requests = []

        def fake_provider(request, timeout):
            requests.append(request)
            self.assertEqual(timeout, 12)
            return response

        with patch.object(search_api, "_POLICY", search_api._SearchPolicy()), patch.dict(
                os.environ, {"PRIVACY_ENABLE_EXTERNAL_SEARCH": "1", "BRAVE_SEARCH_API_KEY": "synthetic-key"}):
            receipt = search_api.create_search_consent("Fictitious Example", user_id=self.alice.user_id,
                                                       confirmed=True)
            with self.assertRaises(PermissionError):
                search_api.search_public_web("Fictitious Example", user_id=self.bob.user_id,
                                             consent=receipt, opener=fake_provider)
            self.assertEqual(requests, [])
            results = search_api.search_public_web("Fictitious Example", user_id=self.alice.user_id,
                                                  consent=receipt, opener=fake_provider)
            self.assertEqual(len(requests), 1)
            self.assertEqual(len(results), 1)
            self.assertFalse(results[0]["identity_confirmed"])
            with self.assertRaises(PermissionError):
                search_api.search_public_web("Fictitious Example", user_id=self.alice.user_id,
                                             consent=receipt, opener=fake_provider)
        with SecureStore(self.path, self.alice.user_id) as a, SecureStore(self.path, self.bob.user_id) as b:
            record_id = a.add(json.dumps(results[0]), kind="finding")
            self.assertIsNone(b.get(record_id))
            self.assertEqual(json.loads(a.get(record_id)), results[0])
        self.assertNotIn(b"Fictitious Example", Path(self.path).read_bytes())
