"""Offline assessment of public result snippets. No network, no persistent identity."""
import re

def assess_snippet(query: str, snippet: str) -> dict:
    """Conservative hints only: never certify that a page identifies a person."""
    if (not isinstance(query, str) or not isinstance(snippet, str)
            or not query.strip() or len(query) > 120 or len(snippet) > 3000
            or any(ord(c) < 32 or ord(c) == 127 for c in query)):
        raise ValueError("Terme ou extrait invalide")
    query = query.strip()
    snippet = snippet.strip()
    words = [w.casefold() for w in re.findall(r"[^\W_]+", query, flags=re.UNICODE) if len(w) > 1]
    haystack = snippet.casefold()
    matched = [w for w in words if re.search(r"(?<!\w)" + re.escape(w) + r"(?!\w)", haystack, flags=re.UNICODE)]
    if not words or not matched:
        status = "Aucune correspondance textuelle"
    elif len(matched) == len(words):
        status = "Correspondance textuelle à vérifier"
    else:
        status = "Correspondance partielle à vérifier"
    return {"status": status, "matched": matched, "total": len(words)}

def erasure_draft(url: str) -> str:
    from findings import normalize_public_url
    safe_url = normalize_public_url(url)
    return ("Objet : Demande d'effacement de données personnelles — article 17 du RGPD\n\n"
            "Madame, Monsieur,\n\n"
            "Je souhaite exercer mon droit à l'effacement concernant les données personnelles "
            "me concernant figurant à cette adresse : " + safe_url + "\n\n"
            "Merci de me confirmer la suite donnée à cette demande dans les délais applicables. "
            "Si vous estimez que l'effacement ne peut être effectué, merci d'en préciser le fondement.\n\n"
            "Cordialement,\n[Identité à compléter après vérification du destinataire]\n")
