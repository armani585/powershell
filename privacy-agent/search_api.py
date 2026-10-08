"""Optional web discovery via the documented Brave Search API.

This module is never called by the demonstration UI. It requires an API key
from a server-side environment variable and explicit opt-in from the operator.
Queries are sent to Brave when called; do not submit private data casually.
"""
import json
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from findings import normalize_public_url

API_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"

def search_public_web(query: str, *, consent: bool = False, limit: int = 5, opener=urlopen):
    if not consent:
        raise PermissionError("Consentement explicite requis pour transmettre la recherche")
    if not isinstance(query, str) or not query.strip() or len(query) > 120 or "\n" in query:
        raise ValueError("Terme de recherche invalide")
    if not isinstance(limit, int) or not 1 <= limit <= 10:
        raise ValueError("Limite invalide")
    if os.environ.get("PRIVACY_ENABLE_EXTERNAL_SEARCH") != "1":
        raise RuntimeError("Recherche externe désactivée par défaut")
    token = os.environ.get("BRAVE_SEARCH_API_KEY", "")
    if not token:
        raise RuntimeError("Clé API Brave manquante")
    request = Request(API_ENDPOINT + "?" + urlencode({"q": query.strip(), "count": limit}),
                      headers={"Accept": "application/json", "X-Subscription-Token": token},
                      method="GET")
    with opener(request, timeout=12) as response:
        data = json.load(response)
    findings = []
    for item in data.get("web", {}).get("results", [])[:limit]:
        try:
            url = normalize_public_url(item.get("url", ""))
        except ValueError:
            continue
        findings.append({"url": url, "title": str(item.get("title", ""))[:160],
                         "description": str(item.get("description", ""))[:500],
                         "identity_confirmed": False})
    return findings
