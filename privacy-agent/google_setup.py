"""Private Google OIDC provisioning. Never prints credentials or subjects.

Run on the server as the service account. Imports a Google-downloaded OAuth client
file and a subject allowlist from private files; no network calls are performed.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import shlex
import stat
import tempfile
import tomllib
from urllib.parse import urlsplit

from cryptography.fernet import Fernet
from auth import validate_streamlit_configuration, AuthenticationError

ISSUER = "https://accounts.google.com"
DISCOVERY = ISSUER + "/.well-known/openid-configuration"


def _private_directory(path):
    path = Path(path)
    if path.is_symlink():
        raise ValueError("Répertoire de configuration invalide")
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    metadata = path.stat()
    if not path.is_dir() or metadata.st_uid != os.getuid():
        raise ValueError("Configuration réservée au compte de service")
    path.chmod(0o700)
    return path


def _read_private(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(descriptor, "r", encoding="utf-8") as handle:
        metadata = os.fstat(handle.fileno())
        if (not stat.S_ISREG(metadata.st_mode) or metadata.st_uid != os.getuid()
                or stat.S_IMODE(metadata.st_mode) & 0o077 or metadata.st_size > 65536):
            raise ValueError("Fichier privé requis : propriétaire courant et mode 0600")
        return handle.read(65537)


def _write_private(path, content, *, replace=False):
    if not replace:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(content)
        return
    # Validate the existing destination before atomic replacement; never follow links.
    _read_private(path)
    descriptor, temporary = tempfile.mkstemp(prefix=".setup-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _callback(value):
    parsed = urlsplit(value)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
            or parsed.query or parsed.fragment or parsed.path != "/oauth2callback"):
        raise ValueError("Callback HTTPS exact /oauth2callback requis")
    return value


def _toml(auth):
    # JSON basic strings are valid TOML strings for these validated values.
    keys = ("redirect_uri", "cookie_secret", "client_id", "client_secret", "server_metadata_url")
    return "[auth]\n" + "".join(f"{key} = {json.dumps(auth[key])}\n" for key in keys) + (
        '\n[auth.client_kwargs]\nscope = "openid"\nprompt = "select_account"\n')


def _runtime(values):
    return "".join(f"{name}={shlex.quote(value)}\n" for name, value in values.items())


def _load_runtime(path):
    values = {}
    for token in shlex.split(_read_private(path), comments=True):
        name, separator, value = token.partition("=")
        if not separator or not name.startswith("PRIVACY_") and name != "BRAVE_SEARCH_API_KEY":
            raise ValueError("Configuration serveur invalide")
        values[name] = value
    return values


def initialize(directory, redirect_uri):
    """Create only missing files. Never rotate an existing key on a repeated run."""
    directory = _private_directory(directory)
    redirect_uri = _callback(redirect_uri)
    runtime = directory / "runtime.env"
    if not runtime.exists() and not runtime.is_symlink():
        _write_private(runtime, _runtime({
            "PRIVACY_OIDC_ISSUER": ISSUER,
            "PRIVACY_ALLOWED_SUBJECTS": "[]",
            "PRIVACY_SESSION_MINUTES": "30",
            "PRIVACY_VAULT_KEYS": json.dumps([Fernet.generate_key().decode()]),
            "PRIVACY_ENABLE_EXTERNAL_SEARCH": "0",
        }))
    else:
        _read_private(runtime)
    configuration = directory / "secrets.toml"
    if not configuration.exists() and not configuration.is_symlink():
        # Empty OAuth credentials intentionally keep native login unavailable.
        initial_auth = dict.fromkeys(("client_id", "client_secret"), "")
        initial_auth.update(redirect_uri=redirect_uri, cookie_secret=secrets.token_urlsafe(48),
                            server_metadata_url=DISCOVERY)
        _write_private(configuration, _toml(initial_auth))
    else:
        _read_private(configuration)
    return readiness(directory)


def configure(directory, client_file, subjects_file):
    """Import operator-provided Google Web OAuth client and explicit subject list."""
    directory = _private_directory(directory)
    auth = tomllib.loads(_read_private(directory / "secrets.toml"))["auth"]
    values = _load_runtime(directory / "runtime.env")
    downloaded = json.loads(_read_private(client_file))
    if not isinstance(downloaded, dict):
        raise ValueError("Document client Google invalide")
    client = downloaded.get("web", {})
    subjects = json.loads(_read_private(subjects_file))
    if (not isinstance(subjects, list) or not subjects or
            any(not isinstance(s, str) or not 1 <= len(s) <= 255 or s != s.strip() or s == "*" or any(ord(c) < 32 for c in s) for s in subjects)):
        raise ValueError("Liste privée de subjects Google explicites requise")
    if (not isinstance(client, dict) or not isinstance(client.get("client_id"), str)
            or not client["client_id"].endswith(".apps.googleusercontent.com")
            or not isinstance(client.get("client_secret"), str) or not client["client_secret"]
            or _callback(auth["redirect_uri"]) not in client.get("redirect_uris", [])):
        raise ValueError("Client Web Google ou callback invalide")
    auth.update(client_id=client["client_id"], client_secret=client["client_secret"], server_metadata_url=DISCOVERY)
    values.update(PRIVACY_OIDC_ISSUER=ISSUER, PRIVACY_ALLOWED_SUBJECTS=json.dumps(sorted(set(subjects))))
    validate_streamlit_configuration({"auth": auth}, values)
    # Populate client first; allowlist is the last gate opened. Neither write enables Brave.
    _write_private(directory / "secrets.toml", _toml(auth), replace=True)
    _write_private(directory / "runtime.env", _runtime(values), replace=True)
    return readiness(directory)


def readiness(directory):
    """Return only non-sensitive booleans. No values, account IDs or file contents."""
    directory = Path(directory)
    result = dict.fromkeys(("encryption_key_valid", "cookie_secret_present",
                            "google_client_present", "subject_allowlist_present",
                            "oidc_configuration_valid", "external_search_enabled"), False)
    try:
        values = _load_runtime(directory / "runtime.env")
        auth = tomllib.loads(_read_private(directory / "secrets.toml"))["auth"]
        keys = json.loads(values.get("PRIVACY_VAULT_KEYS", "[]"))
        if isinstance(keys, list) and 1 <= len(keys) <= 8 and len(set(keys)) == len(keys):
            for key in keys:
                Fernet(key.encode("ascii"))
            result["encryption_key_valid"] = True
        result["cookie_secret_present"] = isinstance(auth.get("cookie_secret"), str) and len(auth["cookie_secret"]) >= 32
        result["google_client_present"] = bool(auth.get("client_id") and auth.get("client_secret"))
        allowed = json.loads(values.get("PRIVACY_ALLOWED_SUBJECTS", "[]"))
        result["subject_allowlist_present"] = isinstance(allowed, list) and bool(allowed)
        result["external_search_enabled"] = values.get("PRIVACY_ENABLE_EXTERNAL_SEARCH") == "1"
        validate_streamlit_configuration({"auth": auth}, values)
        result["oidc_configuration_valid"] = values["PRIVACY_OIDC_ISSUER"] == ISSUER
    except (OSError, ValueError, TypeError, KeyError, AttributeError, AuthenticationError):
        return result
    return result


def main():
    parser = argparse.ArgumentParser(description="Préparation privée Google OIDC, sans afficher les secrets")
    parser.add_argument("--directory", required=True)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--initialize", metavar="HTTPS_CALLBACK")
    group.add_argument("--check", action="store_true")
    group.add_argument("--client-file")
    parser.add_argument("--subjects-file")
    args = parser.parse_args()
    try:
        if args.initialize:
            result = initialize(args.directory, args.initialize)
        elif args.client_file:
            if not args.subjects_file:
                parser.error("--subjects-file requis")
            result = configure(args.directory, args.client_file, args.subjects_file)
        else:
            result = readiness(args.directory)
        print(json.dumps(result, sort_keys=True))
        if args.check and not (result["encryption_key_valid"] and result["oidc_configuration_valid"]):
            parser.exit(1)
    except (OSError, ValueError, TypeError, KeyError):
        parser.exit(2, "Configuration refusée : vérifier les fichiers privés et leur format ; aucune valeur affichée.\n")


if __name__ == "__main__":
    main()
