"""Moteur de découverte V2 : prévisualisation hors ligne et contrôle explicite.

Aucun appel réseau n'est effectué ici. La recherche réelle doit être implémentée
derrière un connecteur autorisé et une confirmation explicite.
"""
from dataclasses import dataclass
from urllib.parse import quote_plus

ALLOWED_ENGINES = ("google", "bing")
TEMPLATES = {
    "google": "https://www.google.com/search?q={query}",
    "bing": "https://www.bing.com/search?q={query}",
}

@dataclass(frozen=True)
class SearchPreview:
    engine: str
    query: str
    url: str

def prepare_searches(terms: list[str], engines: tuple[str, ...] = ALLOWED_ENGINES) -> list[SearchPreview]:
    """Prépare des URLs sans les ouvrir. Ne journalise jamais les termes."""
    if len(terms) > 10:
        raise ValueError("10 termes maximum par lot")
    if any(engine not in ALLOWED_ENGINES for engine in engines):
        raise ValueError("Moteur non autorisé")
    output = []
    for raw in terms:
        term = raw.strip()
        if not term:
            continue
        if len(term) > 120:
            raise ValueError("Terme trop long")
        for engine in engines:
            output.append(SearchPreview(engine, term, TEMPLATES[engine].format(query=quote_plus('"' + term + '"'))))
    return output
