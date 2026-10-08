"""Fernet authenticated encryption with an external, ordered keyring.

PRIVACY_VAULT_KEYS is a JSON array: active key first, old decryption keys next.
PRIVACY_VAULT_KEY remains supported for a single externally provisioned key.
No key is generated implicitly or stored alongside the database.
"""
import json
import os
from cryptography.fernet import Fernet, InvalidToken, MultiFernet

MAX_TEXT_BYTES = 131072


def _cipher():
    raw = os.environ.get("PRIVACY_VAULT_KEYS")
    try:
        keys = json.loads(raw) if raw is not None else [os.environ.get("PRIVACY_VAULT_KEY")]
        if (not isinstance(keys, list) or not 1 <= len(keys) <= 8
                or any(not isinstance(key, str) or not key for key in keys)
                or len(set(keys)) != len(keys)):
            raise ValueError("invalid keyring")
        return MultiFernet([Fernet(key.encode("ascii")) for key in keys])
    except (ValueError, TypeError, UnicodeError) as exc:
        raise RuntimeError("Clé de chiffrement serveur absente ou invalide") from exc


def encrypt_text(value: str) -> bytes:
    if not isinstance(value, str) or len(value.encode("utf-8")) > MAX_TEXT_BYTES:
        raise ValueError("Texte invalide ou trop long")
    return _cipher().encrypt(value.encode("utf-8"))


def decrypt_text(value: bytes) -> str:
    try:
        return _cipher().decrypt(value).decode("utf-8")
    except (InvalidToken, UnicodeError, TypeError) as exc:
        raise ValueError("Impossible de déchiffrer : clé ou contenu invalide") from exc
