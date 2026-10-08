"""Validate result links offline. No DNS lookup or page retrieval is performed.

A valid link is a syntactically public HTTPS DNS name, not a guarantee about its
DNS address or content. Do not reuse this function as an SSRF fetch allow-list.
"""
import ipaddress
import re
from urllib.parse import urlsplit, urlunsplit


def normalize_public_url(value: str) -> str:
    if (not isinstance(value, str) or not value.strip() or len(value) > 2048
            or "\\" in value or any(ord(c) < 32 or ord(c) == 127 for c in value)):
        raise ValueError("URL invalide")
    value = value.strip()
    try:
        parsed = urlsplit(value)
        host = (parsed.hostname or "").lower().rstrip(".")
        port = parsed.port
    except ValueError:
        raise ValueError("URL invalide") from None
    if parsed.scheme != "https" or not host or "@" in parsed.netloc:
        raise ValueError("Seules les URL HTTPS publiques sans identifiants sont admises")
    if port not in (None, 443):
        raise ValueError("Port non autorisé")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError("Adresses IP interdites")
    try:
        host = host.encode("idna").decode("ascii")
    except UnicodeError:
        raise ValueError("Nom de domaine invalide") from None
    if host == "localhost" or host.endswith((".localhost", ".local", ".internal", ".lan", ".home", ".test", ".invalid", ".example", ".onion", ".arpa")):
        raise ValueError("Hôte local ou réservé interdit")
    labels = host.split(".")
    if (len(host) > 253 or len(labels) < 2
            or any(not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", part) for part in labels)
            or not re.fullmatch(r"(?:[a-z]{2,63}|xn--[a-z0-9-]+)", labels[-1])):
        raise ValueError("Nom de domaine invalide")
    return urlunsplit(("https", host, parsed.path or "/", parsed.query, ""))


def prepare_findings(lines: list[str]) -> list[str]:
    if not isinstance(lines, (list, tuple)) or len(lines) > 25:
        raise ValueError("Maximum 25 URL")
    normalized = []
    for line in lines:
        if not isinstance(line, str):
            raise ValueError("URL invalide")
        if line.strip():
            url = normalize_public_url(line)
            if url not in normalized:
                normalized.append(url)
    return normalized
