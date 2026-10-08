"""Official Brave API connector with scoped, single-use consent and bounded I/O.

No calls occur at import or when preparing previews. Quotas and consent receipts
are process-local: run one application process, or replace the policy with a
shared atomic service before scaling to multiple workers/replicas.
"""
from collections import defaultdict, deque
from dataclasses import dataclass
import hashlib
from http.client import HTTPException
import json
import os
import secrets
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

from findings import normalize_public_url

API_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"
PROVIDER = "brave"
CONSENT_TTL_SECONDS = 300
WINDOW_SECONDS = 3600
USER_REQUEST_LIMIT = 10
GLOBAL_REQUEST_LIMIT = 100
MAX_RESPONSE_BYTES = 262_144


class SearchError(RuntimeError):
    """Safe, user-displayable failure; never contains the query or API secret."""


@dataclass(frozen=True)
class SearchConsent:
    """Opaque receipt; authorization details are held only on the server."""
    token: str


def validate_query(query: str) -> str:
    if (not isinstance(query, str) or not query.strip() or len(query) > 120
            or any(ord(c) < 32 or ord(c) == 127 for c in query)):
        raise ValueError("Terme de recherche invalide")
    # Preserve exact text: edits including whitespace invalidate prior consent.
    return query


def _subject(user_id: str) -> str:
    if not isinstance(user_id, str) or not user_id.strip() or len(user_id) > 512:
        raise PermissionError("Utilisateur authentifié requis")
    return hashlib.sha256(user_id.encode()).hexdigest()


def _query_hash(query: str) -> str:
    return hashlib.sha256((PROVIDER + "\0" + query).encode()).hexdigest()


class _SearchPolicy:
    def __init__(self):
        self.lock = threading.Lock()
        self.grants = {}
        self.requests = defaultdict(deque)
        self.global_requests = deque()

    def _prune(self, now):
        self.grants = {k: v for k, v in self.grants.items() if v[2] > now}
        while self.global_requests and self.global_requests[0] <= now - WINDOW_SECONDS:
            self.global_requests.popleft()
        for subject in list(self.requests):
            events = self.requests[subject]
            while events and events[0] <= now - WINDOW_SECONDS:
                events.popleft()
            if not events:
                del self.requests[subject]

    def grant(self, query, subject):
        with self.lock:
            now = time.monotonic()
            self._prune(now)
            if len(self.grants) >= 1000 or sum(v[0] == subject for v in self.grants.values()) >= 20:
                raise SearchError("Trop de consentements en attente ; réessayez plus tard")
            token = secrets.token_urlsafe(32)
            self.grants[token] = (subject, _query_hash(query), now + CONSENT_TTL_SECONDS)
            return SearchConsent(token)

    def consume(self, receipt, query, subject):
        if not isinstance(receipt, SearchConsent) or not isinstance(receipt.token, str):
            raise PermissionError("Consentement explicite lié à cette recherche requis")
        with self.lock:
            now = time.monotonic()
            self._prune(now)
            grant = self.grants.get(receipt.token)
            if not grant or grant[:2] != (subject, _query_hash(query)):
                raise PermissionError("Consentement absent, expiré ou différent de cette recherche")
            if len(self.requests[subject]) >= USER_REQUEST_LIMIT or len(self.global_requests) >= GLOBAL_REQUEST_LIMIT:
                raise SearchError("Quota de recherche atteint ; réessayez dans une heure")
            del self.grants[receipt.token]
            # Failed upstream requests count too; retries require a fresh click.
            self.requests[subject].append(now)
            self.global_requests.append(now)


_POLICY = _SearchPolicy()


def create_search_consent(query: str, *, user_id: str, confirmed: bool = False) -> SearchConsent:
    """Call only after the authenticated user explicitly accepts this transfer.

    The UI must display the exact query, Brave as recipient and the data-sharing
    notice. The checkbox starts unchecked; editing the query resets confirmation.
    """
    if confirmed is not True:
        raise PermissionError("Confirmation explicite requise")
    return _POLICY.grant(validate_query(query), _subject(user_id))


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward the subscription token (or query) to a redirect target.
        raise SearchError("Redirection du fournisseur refusée")


def _open(request, *, timeout):
    # Retain operator-managed HTTPS proxies; TLS certificate verification remains
    # enabled. Deployment operators must trust proxies handling these requests.
    return build_opener(_NoRedirect()).open(request, timeout=timeout)


def _clean_text(value, limit):
    if not isinstance(value, str):
        return ""
    return "".join(c for c in value if ord(c) >= 32 and ord(c) != 127)[:limit]


def search_public_web(query: str, *, user_id: str = "", consent=None, limit: int = 5, opener=None):
    """Search once through Brave; no result URL is opened or identity certified."""
    query = validate_query(query)
    subject = _subject(user_id)
    if type(limit) is not int or not 1 <= limit <= 10:
        raise ValueError("Limite invalide")
    if not isinstance(consent, SearchConsent):
        raise PermissionError("Consentement explicite lié à cette recherche requis")
    if os.environ.get("PRIVACY_ENABLE_EXTERNAL_SEARCH") != "1":
        raise SearchError("Recherche externe désactivée par défaut")
    token = os.environ.get("BRAVE_SEARCH_API_KEY", "")
    if not token or len(token) > 4096 or any(ord(c) < 33 or ord(c) > 126 for c in token):
        raise SearchError("Clé API Brave absente ou invalide")
    _POLICY.consume(consent, query, subject)
    request = Request(API_ENDPOINT + "?" + urlencode({"q": query, "count": limit}),
                      headers={"Accept": "application/json", "X-Subscription-Token": token},
                      method="GET")
    try:
        with (opener or _open)(request, timeout=12) as response:
            if response.getcode() != 200:
                raise SearchError("Réponse du fournisseur non valide")
            if response.headers.get_content_type() != "application/json":
                raise SearchError("Format de réponse du fournisseur non valide")
            payload = response.read(MAX_RESPONSE_BYTES + 1)
            if len(payload) > MAX_RESPONSE_BYTES:
                raise SearchError("Réponse du fournisseur trop volumineuse")
        data = json.loads(payload)
    except SearchError:
        raise
    except (HTTPError, URLError, HTTPException, OSError, ValueError, RecursionError):
        # Suppress chained exceptions, which can contain the full request URL.
        raise SearchError("Recherche indisponible ; vérifiez la configuration ou réessayez plus tard") from None
    if not isinstance(data, dict) or not isinstance(data.get("web", {}), dict):
        raise SearchError("Structure de réponse du fournisseur non valide")
    items = data.get("web", {}).get("results", [])
    if not isinstance(items, list):
        raise SearchError("Structure de réponse du fournisseur non valide")
    findings = []
    seen = set()
    for item in items[:limit]:
        if not isinstance(item, dict):
            continue
        try:
            url = normalize_public_url(item.get("url", ""))
        except ValueError:
            continue
        if url in seen:
            continue
        seen.add(url)
        findings.append({"url": url, "title": _clean_text(item.get("title", ""), 160),
                         "description": _clean_text(item.get("description", ""), 500),
                         "identity_confirmed": False})
    return findings
