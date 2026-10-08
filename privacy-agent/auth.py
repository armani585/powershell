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


def _configuration(environ, *, allow_empty=False):
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
    if (not isinstance(allowed, list) or (not allowed and not allow_empty)
            or any(not _valid_subject(s) for s in allowed)
            or not 15 <= minutes <= 480):
        raise AuthenticationError("Liste d'accès ou durée de session invalide")
    return issuer, allowed, minutes * 60


def _valid_subject(subject):
    return (isinstance(subject, str) and 1 <= len(subject) <= 255
            and subject == subject.strip() and subject != "*"
            and not any(ord(c) < 32 for c in subject))


def verified_subject(claims, issuer, lifetime, now):
    """Check only native Streamlit-verified claims; this grants no authorization."""
    sub, expiry, issued = claims.get("sub"), claims.get("exp"), claims.get("iat")
    if (claims.get("iss") != issuer or not _valid_subject(sub)
            or isinstance(expiry, bool) or not isinstance(expiry, (int, float))
            or not math.isfinite(expiry) or expiry <= now
            or isinstance(issued, bool) or not isinstance(issued, (int, float))
            or not math.isfinite(issued) or issued > now + 60
            or issued + lifetime <= now):
        raise AuthenticationError("Identité non autorisée ou connexion expirée")
    return sub


def authenticate(claims, session, environ=None, now=None):
    """Authorize verified OIDC claims and enforce an absolute session deadline.

    User IDs derive from BOTH issuer and subject, never email or display name.
    A changed identity clears all previous user's in-memory application state.
    """
    environ = os.environ if environ is None else environ
    now = time.time() if now is None else now
    issuer, allowed, lifetime = _configuration(environ)
    sub = verified_subject(claims, issuer, lifetime, now)
    expiry = claims.get("exp")
    issued = claims.get("iat")
    if sub not in allowed:
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


def validate_streamlit_configuration(secrets, environ=None, *, identity_setup=False):
    """Require coherent native OIDC secrets; never reflect secret values in errors."""
    environ = os.environ if environ is None else environ
    issuer, allowed, _ = _configuration(environ, allow_empty=identity_setup)
    if identity_setup and (allowed or environ.get("PRIVACY_IDENTITY_SETUP") != "1"
                           or issuer != "https://accounts.google.com"):
        raise AuthenticationError("Identification initiale Google indisponible")
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
        identity_setup = os.environ.get("PRIVACY_IDENTITY_SETUP") == "1"
        validate_streamlit_configuration(st.secrets, identity_setup=identity_setup)
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
    if identity_setup:
        # Identification is isolated from authorization: never return a principal,
        # write an allowlist, open a database or persist these claims.
        st.session_state.clear()
        try:
            issuer, _, lifetime = _configuration(os.environ, allow_empty=True)
            subject = verified_subject(dict(st.user), issuer, lifetime, time.time())
        except AuthenticationError as exc:
            st.error(str(exc))
        else:
            st.info("Compte Google identifié. L'accès aux données reste fermé jusqu'à son autorisation.")
            st.caption("Transmettez cet identifiant de compte à l'administrateur par votre canal privé habituel. Aucun mot de passe ni jeton n'est nécessaire.")
            st.code(subject, language=None)
        if st.button("Se déconnecter", key="privacy-setup-logout"):
            st.logout()
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
