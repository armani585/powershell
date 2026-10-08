"""Offline search previews. Only the official connector performs API requests."""
from dataclasses import dataclass
from urllib.parse import quote_plus
from search_api import validate_query

ALLOWED_ENGINES = ("google", "bing", "brave")
TEMPLATES = {
    "google": "https://www.google.com/search?q={query}",
    "bing": "https://www.bing.com/search?q={query}",
    "brave": "https://search.brave.com/search?q={query}",
}


@dataclass(frozen=True)
class SearchPreview:
    engine: str
    query: str
    url: str


def prepare_searches(terms: list[str], engines: tuple[str, ...] = ("google", "bing")) -> list[SearchPreview]:
    """Build links without opening them or logging query terms.

    Clicking a preview still transmits the query to the selected website; these
    links are never a substitute for consent for the server-side Brave API.
    """
    if not isinstance(terms, (list, tuple)) or len(terms) > 10:
        raise ValueError("10 termes maximum par lot")
    if not isinstance(engines, (list, tuple)) or len(engines) > len(ALLOWED_ENGINES) or any(engine not in ALLOWED_ENGINES for engine in engines):
        raise ValueError("Moteur non autorisé")
    output = []
    for raw in terms:
        if not isinstance(raw, str):
            raise ValueError("Terme de recherche invalide")
        if not raw.strip():
            continue
        term = validate_query(raw).strip()
        for engine in dict.fromkeys(engines):
            output.append(SearchPreview(engine, term, TEMPLATES[engine].format(query=quote_plus('"' + term + '"'))))
    return output
