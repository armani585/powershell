"""Offline GDPR case workflow. These functions never send or fetch anything.

Persist returned dictionaries in the authenticated user's encrypted store. A
review binds the exact recipient, URL and letter, including their revision.
"""
from calendar import monthrange
from copy import deepcopy
from datetime import date, datetime, timezone
import hashlib
import hmac
import json
from uuid import uuid4

from findings import normalize_public_url
from review import erasure_draft

STATUSES = ("draft", "approved", "sent_manual", "response_received", "closed")


def _timestamp(now=None):
    value = now or datetime.now(timezone.utc)
    if not isinstance(value, datetime) or value.tzinfo is None:
        raise ValueError("Horodatage UTC explicite requis")
    return value.astimezone(timezone.utc).isoformat()


def _date(value):
    if isinstance(value, str):
        value = date.fromisoformat(value)
    if type(value) is not date:
        raise ValueError("Date calendaire requise")
    return value


def _text(value, maximum, *, multiline=False):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError("Texte vide ou trop long")
    if any(ord(c) < 32 and not (multiline and c in "\n\t") for c in value):
        raise ValueError("Caractère de contrôle interdit")
    return value.strip()


def _event(record, action, now):
    record["updated_at"] = _timestamp(now)
    record["history"].append({"event": action, "at": record["updated_at"]})
    return record


def add_calendar_month(value):
    """One calendar month, clamping month-end (Jan 31 -> Feb 28/29)."""
    value = _date(value)
    year = value.year + (value.month == 12)
    month = value.month % 12 + 1
    return date(year, month, min(value.day, monthrange(year, month)[1]))


def create_request(recipient, url, body=None, *, now=None):
    url = normalize_public_url(url)
    timestamp = _timestamp(now)
    return {
        "id": uuid4().hex,
        "recipient": _text(recipient, 200),
        "url": url,
        "body": _text(erasure_draft(url) if body is None else body, 12000, multiline=True),
        "revision": 1,
        "status": "draft",
        "approval": None,
        "created_at": timestamp,
        "updated_at": timestamp,
        "sent_on": None,
        "received_on": None,
        "response_received_on": None,
        "history": [{"event": "created", "at": timestamp}],
    }


def request_digest(record):
    material = {key: record[key] for key in ("id", "recipient", "url", "body", "revision")}
    return hashlib.sha256(json.dumps(material, ensure_ascii=False, sort_keys=True,
                                     separators=(",", ":")).encode("utf-8")).hexdigest()


def edit_request(record, *, recipient=None, url=None, body=None, now=None):
    if record["status"] not in ("draft", "approved"):
        raise ValueError("Une demande déjà envoyée ne peut plus être modifiée")
    result = deepcopy(record)
    if recipient is not None:
        result["recipient"] = _text(recipient, 200)
    if url is not None:
        result["url"] = normalize_public_url(url)
    if body is not None:
        result["body"] = _text(body, 12000, multiline=True)
    result["revision"] += 1
    result["status"] = "draft"
    result["approval"] = None
    return _event(result, "edited_review_invalidated", now)


def approve_request(record, *, reviewer_id, expected_digest, confirmed, now=None):
    if confirmed is not True:
        raise PermissionError("Validation humaine explicite du contenu et du destinataire requise")
    if record["status"] != "draft":
        raise ValueError("Seul un brouillon peut être validé")
    reviewer_id = _text(reviewer_id, 200)
    digest = request_digest(record)
    if not isinstance(expected_digest, str) or not hmac.compare_digest(expected_digest, digest):
        raise PermissionError("Le contenu a changé depuis sa présentation : relire le brouillon")
    result = deepcopy(record)
    result["status"] = "approved"
    result["approval"] = {"reviewer_id": reviewer_id, "digest": digest, "at": _timestamp(now)}
    return _event(result, "human_approved", now)


def _require_approval(record):
    approval = record.get("approval") or {}
    digest = approval.get("digest")
    if (record.get("status") not in ("approved", "sent_manual", "response_received", "closed")
            or not approval.get("reviewer_id") or not isinstance(digest, str)
            or not hmac.compare_digest(digest, request_digest(record))):
        raise PermissionError("Le contenu exact doit avoir été validé par un humain")


def export_request(record):
    """Return the exact reviewed letter for the user's manual download only."""
    _require_approval(record)
    return f"Destinataire : {record['recipient']}\nURL concernée : {record['url']}\n\n{record['body']}"


def attest_manual_send(record, *, confirmed, sent_on, received_on=None, now=None):
    """Record a human attestation; this is not proof of delivery or a send action."""
    if confirmed is not True:
        raise PermissionError("Attestation humaine explicite de l'envoi manuel requise")
    if record["status"] != "approved":
        raise ValueError("La demande doit être validée avant de déclarer un envoi manuel")
    _require_approval(record)
    sent = _date(sent_on)
    today = datetime.fromisoformat(_timestamp(now)).date()
    if sent > today or sent < datetime.fromisoformat(record["approval"]["at"]).date():
        raise ValueError("Date d'envoi antérieure à la validation ou située dans le futur")
    received = _date(received_on) if received_on is not None else None
    if received and not sent <= received <= today:
        raise ValueError("Date de réception incohérente")
    result = deepcopy(record)
    result.update(status="sent_manual", sent_on=sent.isoformat(),
                  received_on=received.isoformat() if received else None)
    return _event(result, "manual_send_attested", now)


def record_receipt(record, *, received_on, now=None):
    if record["status"] != "sent_manual":
        raise ValueError("La demande doit avoir un envoi manuel attesté")
    received = _date(received_on)
    if not _date(record["sent_on"]) <= received <= datetime.fromisoformat(_timestamp(now)).date():
        raise ValueError("Date de réception incohérente")
    result = deepcopy(record)
    result["received_on"] = received.isoformat()
    return _event(result, "receipt_recorded", now)


def record_response(record, *, response_received_on, now=None):
    if record["status"] != "sent_manual":
        raise ValueError("La demande doit avoir un envoi manuel attesté")
    response = _date(response_received_on)
    minimum = _date(record.get("received_on") or record["sent_on"])
    if not minimum <= response <= datetime.fromisoformat(_timestamp(now)).date():
        raise ValueError("Date de réponse incohérente")
    result = deepcopy(record)
    result.update(status="response_received", response_received_on=response.isoformat())
    return _event(result, "response_recorded", now)


def close_request(record, *, now=None):
    if record["status"] not in ("sent_manual", "response_received"):
        raise ValueError("Seule une demande envoyée ou ayant reçu une réponse peut être clôturée")
    result = deepcopy(record)
    result["status"] = "closed"
    return _event(result, "closed", now)


def due_status(record, *, today=None):
    """Indicative one-month reminder. Without receipt, the date is provisional.

    This does not calculate extensions, suspensions or jurisdictional holidays.
    No email, background job or network reminder is performed.
    """
    if record["status"] != "sent_manual":
        return {"due_on": None, "days_remaining": None, "reminder": False, "provisional": False}
    today = _date(today) if today is not None else datetime.now(timezone.utc).date()
    base = record.get("received_on") or record["sent_on"]
    due = add_calendar_month(base)
    remaining = (due - today).days
    return {"due_on": due.isoformat(), "days_remaining": remaining,
            "reminder": remaining <= 7, "provisional": not bool(record.get("received_on"))}
