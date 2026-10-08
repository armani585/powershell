"""Validation d'URL de résultats publics, sans accès réseau."""
from urllib.parse import urlsplit, urlunsplit
import ipaddress

def normalize_public_url(value: str) -> str:
    value = value.strip()
    if not value or len(value) > 2048 or any(ord(c) < 32 for c in value):
        raise ValueError("URL invalide")
    try:
        parsed = urlsplit(value)
        host = (parsed.hostname or "").lower().rstrip(".")
        port = parsed.port
    except ValueError as exc:
        raise ValueError("URL invalide") from exc
    if parsed.scheme != "https" or not host or parsed.username or parsed.password:
        raise ValueError("Seules les URL HTTPS publiques sans identifiants sont admises")
    if port not in (None, 443):
        raise ValueError("Port non autorisé")
    if host == "localhost" or host.endswith((".localhost", ".local", ".internal")):
        raise ValueError("Hôte local interdit")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        if "." not in host or any(not part or not all(c.isalnum() or c == "-" for c in part) for part in host.split(".")):
            raise ValueError("Nom de domaine invalide")
    else:
        raise ValueError("Adresses IP interdites")
    netloc = host
    return urlunsplit(("https", netloc, parsed.path or "/", parsed.query, ""))

def prepare_findings(lines: list[str]) -> list[str]:
    if len(lines) > 25:
        raise ValueError("Maximum 25 URL")
    normalized = []
    for line in lines:
        if line.strip():
            url = normalize_public_url(line)
            if url not in normalized:
                normalized.append(url)
    return normalized
