"""Optional encrypted payload storage. No plaintext personal data is written by this module.

Set PRIVACY_VAULT_KEY to a randomly generated Fernet key in server secrets.
Never place the key in Git, in a query string, or in the SQLite database.
"""
import os
from cryptography.fernet import Fernet, InvalidToken

def _cipher():
    key = os.environ.get("PRIVACY_VAULT_KEY")
    if not key:
        raise RuntimeError("Clé de chiffrement serveur absente")
    try:
        return Fernet(key.encode("ascii"))
    except (ValueError, UnicodeError) as exc:
        raise RuntimeError("Clé de chiffrement invalide") from exc

def encrypt_text(value: str) -> bytes:
    if not isinstance(value, str) or len(value) > 4096:
        raise ValueError("Texte invalide ou trop long")
    return _cipher().encrypt(value.encode("utf-8"))

def decrypt_text(value: bytes) -> str:
    try:
        return _cipher().decrypt(value).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Impossible de déchiffrer : clé ou contenu invalide") from exc
