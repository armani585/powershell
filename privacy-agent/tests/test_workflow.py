"""Workflow tests use fictional content and cannot send GDPR requests."""
from copy import deepcopy
from datetime import date, datetime, timezone
import unittest

from workflow import (add_calendar_month, approve_request, attest_manual_send,
                      close_request, create_request, due_status, edit_request,
                      export_request, record_receipt, record_response, request_digest)

NOW = datetime(2026, 1, 31, 12, tzinfo=timezone.utc)
LATER = datetime(2026, 2, 3, 12, tzinfo=timezone.utc)


class WorkflowTests(unittest.TestCase):
    def draft(self):
        return create_request("Organisme fictif", "https://example.org/profil", now=NOW)

    def approved(self):
        record = self.draft()
        return approve_request(record, reviewer_id="fixture-user", confirmed=True,
                               expected_digest=request_digest(record), now=NOW)

    def sent(self):
        return attest_manual_send(self.approved(), confirmed=True, sent_on=date(2026, 1, 31), now=NOW)

    def test_draft_cannot_export_or_claim_sent(self):
        with self.assertRaises(PermissionError):
            export_request(self.draft())
        with self.assertRaises(ValueError):
            attest_manual_send(self.draft(), confirmed=True, sent_on=NOW.date(), now=NOW)

    def test_exact_content_review_and_export(self):
        record = self.approved()
        text = export_request(record)
        self.assertIn(record["body"], text)
        self.assertIn(record["recipient"], text)
        self.assertEqual(record["approval"]["digest"], request_digest(record))
        self.assertEqual(record["status"], "approved")

    def test_review_is_explicit_boolean(self):
        for confirmation in (False, "true", 1, None, []):
            with self.subTest(confirmation=confirmation), self.assertRaises(PermissionError):
                draft = self.draft()
                approve_request(draft, reviewer_id="fixture-user", confirmed=confirmation,
                                expected_digest=request_digest(draft), now=NOW)
            with self.subTest(confirmation=confirmation), self.assertRaises(PermissionError):
                attest_manual_send(self.approved(), confirmed=confirmation,
                                   sent_on=NOW.date(), now=NOW)

    def test_stale_review_and_empty_reviewer_rejected(self):
        draft = self.draft()
        stale_digest = request_digest(draft)
        revised = edit_request(draft, body="Nouveau contenu fictif", now=NOW)
        with self.assertRaises(PermissionError):
            approve_request(revised, reviewer_id="fixture-user", confirmed=True,
                            expected_digest=stale_digest, now=NOW)
        with self.assertRaises(ValueError):
            approve_request(draft, reviewer_id="", confirmed=True,
                            expected_digest=stale_digest, now=NOW)

    def test_every_material_change_invalidates_review(self):
        for changes in ({"body": "Autre texte"}, {"recipient": "Autre organisme"},
                        {"url": "https://example.org/autre"}):
            with self.subTest(changes=changes):
                approved = self.approved()
                edited = edit_request(approved, now=NOW, **changes)
                self.assertEqual(edited["status"], "draft")
                self.assertIsNone(edited["approval"])
                self.assertEqual(approved["status"], "approved")
                with self.assertRaises(PermissionError):
                    export_request(edited)
                with self.assertRaises(ValueError):
                    attest_manual_send(edited, confirmed=True, sent_on=NOW.date(), now=NOW)

    def test_tampering_after_review_rejected(self):
        for key, value in (("body", "Altéré"), ("url", "https://example.org/autre"),
                           ("recipient", "Autre"), ("revision", 2), ("id", "autre")):
            with self.subTest(key=key):
                record = self.approved()
                record[key] = value
                with self.assertRaises(PermissionError):
                    export_request(record)
                with self.assertRaises(PermissionError):
                    attest_manual_send(record, confirmed=True, sent_on=NOW.date(), now=NOW)

    def test_calendar_month_including_leap_year_and_year_end(self):
        for start, expected in ((date(2026, 1, 31), date(2026, 2, 28)),
                                (date(2024, 1, 31), date(2024, 2, 29)),
                                (date(2026, 12, 31), date(2027, 1, 31)),
                                (date(2026, 3, 31), date(2026, 4, 30))):
            self.assertEqual(add_calendar_month(start), expected)

    def test_receipt_controls_deadline_and_reminder(self):
        record = self.sent()
        due = due_status(record, today=date(2026, 2, 21))
        self.assertEqual(due, {"due_on": "2026-02-28", "days_remaining": 7,
                               "reminder": True, "provisional": True})
        received = record_receipt(record, received_on=date(2026, 2, 2), now=LATER)
        self.assertEqual(due_status(received, today=date(2026, 3, 3)),
                         {"due_on": "2026-03-02", "days_remaining": -1,
                          "reminder": True, "provisional": False})
        self.assertFalse(due_status(received, today=date(2026, 2, 21))["reminder"])

    def test_response_and_closed_do_not_keep_reminding(self):
        sent = self.sent()
        answered = record_response(sent, response_received_on=LATER.date(), now=LATER)
        self.assertEqual(answered["status"], "response_received")
        self.assertFalse(due_status(answered)["reminder"])
        closed = close_request(answered, now=LATER)
        self.assertEqual(closed["status"], "closed")
        self.assertFalse(due_status(closed)["reminder"])
        self.assertEqual(export_request(closed), export_request(sent))

    def test_invalid_transitions_and_dates(self):
        with self.assertRaises(ValueError):
            edit_request(self.sent(), body="Modification tardive", now=NOW)
        with self.assertRaises(ValueError):
            record_response(self.draft(), response_received_on=NOW.date(), now=NOW)
        with self.assertRaises(ValueError):
            close_request(self.draft(), now=NOW)
        for sent_on in (date(2026, 1, 30), date(2026, 2, 1)):
            with self.assertRaises(ValueError):
                attest_manual_send(self.approved(), confirmed=True, sent_on=sent_on, now=NOW)
        for received_on in (date(2026, 1, 30), date(2026, 2, 4)):
            with self.assertRaises(ValueError):
                record_receipt(self.sent(), received_on=received_on, now=LATER)
        with self.assertRaises(ValueError):
            attest_manual_send(self.approved(), confirmed=True, sent_on=NOW.date(),
                               received_on=date(2026, 1, 30), now=NOW)

    def test_pure_functions_and_content_free_history(self):
        draft = self.draft()
        before = deepcopy(draft)
        approve_request(draft, reviewer_id="fixture-user", confirmed=True,
                        expected_digest=request_digest(draft), now=NOW)
        self.assertEqual(draft, before)
        self.assertEqual(set(self.sent()["history"][-1]), {"event", "at"})

    def test_controls_and_invalid_input(self):
        for body in ("", "x" * 12001, "Texte\x00"):
            with self.assertRaises(ValueError):
                create_request("Exemple", "https://example.org", body=body)
        with self.assertRaises(ValueError):
            create_request("Entête\nInjectée", "https://example.org")
        with self.assertRaises(ValueError):
            create_request("Exemple", "https://example.org", now=datetime(2026, 1, 1))


if __name__ == "__main__":
    unittest.main()
