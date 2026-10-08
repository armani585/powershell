"""Authorization for claims verified by Streamlit's OIDC implementation.

Never call ``authenticate`` on browser-supplied JSON or an unverified JWT.
Authentication itself is delegated to Streamlit/Authlib and the configured IdP.
"""
from dataclasses import dataclass
import hashlib
import json
import math
import os
import time
from urllib.parse import urlsplit


class AuthenticationError(ValueError):
    """Missing configuration, rejected identity, or expired session."""


@dataclass(frozen=True)
class Principal:
    user_id: str
    expires_at: float


def _configuration(environ):
    issuer = environ.get("PRIVACY_OIDC_ISSUER", "")
    parsed = urlsplit(issuer)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username
            or parsed.password or parsed.query or parsed.fragment):
        raise AuthenticationError("Émetteur OIDC HTTPS non configuré")
    try:
        allowed = json.loads(environ.get("PRIVACY_ALLOWED_SUBJECTS", ""))
        minutes = int(environ.get("PRIVACY_SESSION_MINUTES", "30"))
    except (ValueError, TypeError) as exc:
        raise AuthenticationError("Configuration d'accès invalide") from exc
    if (not isinstance(allowed, list) or not allowed
            or any(not isinstance(s, str) or not s.strip() for s in allowed)
            or not 15 <= minutes <= 480):
        raise AuthenticationError("Liste d'accès ou durée de session invalide")
    return issuer, allowed, minutes * 60


def authenticate(claims, session, environ=None, now=None):
    """Authorize verified OIDC claims and enforce an absolute session deadline.

    User IDs derive from BOTH issuer and subject, never email or display name.
    A changed identity clears all previous user's in-memory application state.
    """
    environ = os.environ if environ is None else environ
    now = time.time() if now is None else now
    issuer, allowed, lifetime = _configuration(environ)
    sub = claims.get("sub")
    expiry = claims.get("exp")
    issued = claims.get("iat")
    if (claims.get("iss") != issuer or not isinstance(sub, str) or sub not in allowed
            or isinstance(expiry, bool) or not isinstance(expiry, (int, float))
            or not math.isfinite(expiry) or expiry <= now
            or isinstance(issued, bool) or not isinstance(issued, (int, float))
            or not math.isfinite(issued) or issued > now + 60
            or issued + lifetime <= now):
        raise AuthenticationError("Identité non autorisée ou connexion expirée")
    user_id = hashlib.sha256(json.dumps([issuer, sub], separators=(",", ":")).encode()).hexdigest()
    previous = session.get("_privacy_auth")
    if previous is None or previous.get("user_id") != user_id:
        session.clear()
        previous = {"user_id": user_id, "expires_at": min(expiry, issued + lifetime)}
        session["_privacy_auth"] = previous
    deadline = min(previous["expires_at"], expiry)
    if deadline <= now:
        raise AuthenticationError("Session expirée : reconnectez-vous")
    return Principal(user_id, deadline)


def validate_streamlit_configuration(secrets, environ=None):
    """Require coherent native OIDC secrets; never reflect secret values in errors."""
    environ = os.environ if environ is None else environ
    issuer, _, _ = _configuration(environ)
    try:
        config = secrets["auth"]
        for name in ("client_id", "client_secret", "cookie_secret", "redirect_uri", "server_metadata_url"):
            if not isinstance(config[name], str) or not config[name].strip():
                raise ValueError("missing")
        if len(config["cookie_secret"]) < 32:
            raise ValueError("weak cookie key")
        if config["server_metadata_url"] != issuer.rstrip("/") + "/.well-known/openid-configuration":
            raise ValueError("issuer metadata mismatch")
        redirect = urlsplit(config["redirect_uri"])
        local = redirect.hostname in ("localhost", "127.0.0.1", "::1")
        if (not redirect.hostname or redirect.username or redirect.password or redirect.query
                or redirect.fragment or redirect.path != "/oauth2callback"
                or (redirect.scheme != "https" and not (local and redirect.scheme == "http"))):
            raise ValueError("invalid callback")
    except Exception as exc:
        raise AuthenticationError("Configuration OIDC Streamlit absente ou incohérente") from exc


def require_user(st):
    """Streamlit gate: must run before reading or displaying private data."""
    try:
        validate_streamlit_configuration(st.secrets)
    except AuthenticationError:
        st.error("Accès fermé : configuration OIDC et liste d'accès requises.")
        st.stop()
    if not st.user.is_logged_in:
        st.session_state.clear()
        st.info("Connectez-vous avec le compte autorisé pour accéder à votre espace privé.")
        if st.button("Se connecter", key="privacy-login"):
            try:
                st.login()
            except Exception:
                st.error("Connexion indisponible : vérifiez la configuration du fournisseur OIDC.")
        st.stop()
    try:
        principal = authenticate(dict(st.user), st.session_state)
    except AuthenticationError as exc:
        previous = st.session_state.get("_privacy_auth")
        st.session_state.clear()
        if previous is not None:
            st.session_state["_privacy_auth"] = previous
        st.error(str(exc))
        if st.button("Se déconnecter et recommencer", key="privacy-invalid-logout"):
            st.logout()
        st.stop()
    if st.sidebar.button("Se déconnecter", key="privacy-logout"):
        st.session_state.clear()
        st.logout()
        st.stop()
    return principal
