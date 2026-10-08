"""Private, authenticated workspace. No mail transport or automatic GDPR sends."""
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import streamlit as st

from auth import require_user
from brokers import BROKERS
from review import assess_snippet
from search_api import create_search_consent, search_public_web
from secure_store import SecureStore
from workflow import (
    approve_request, attest_manual_send, close_request, create_request, due_status,
    edit_request, export_request, record_receipt, record_response, request_digest,
)

STATUS_LABELS = {
    "draft": "Brouillon à examiner", "approved": "Validé pour copie manuelle",
    "sent_manual": "Envoi manuel déclaré", "response_received": "Réponse reçue",
    "closed": "Clos",
}


def main():
    st.set_page_config(page_title="Privacy Agent", page_icon="🛡️", layout="wide")
    st.title("🛡️ Privacy Agent")
    st.caption("Espace privé · Recherches sur consentement · Aucun envoi automatique")
    principal = require_user(st)
    @st.fragment(run_every="30s")
    def enforce_session_expiry():
        if time.time() >= principal.expires_at:
            st.rerun(scope="app")

    enforce_session_expiry()
    data_dir = Path(os.environ.get("PRIVACY_DATA_DIR", "data"))
    try:
        with SecureStore(data_dir / "privacy-secure-v2.db", user_id=principal.user_id) as store:
            render_workspace(store, principal)
    except (OSError, RuntimeError, ValueError):
        st.error("Espace indisponible : vérifiez la configuration du stockage et des clés avec l'administrateur.")
        st.stop()


def render_workspace(store, principal):
    st.sidebar.caption("Chaque dossier appartient à votre compte. Conservation fixe : résultats 7 jours, dossiers 90 jours, événements 30 jours.")
    st.sidebar.caption("La recherche transmet le terme à Brave uniquement après votre consentement pour cette requête.")
    tabs = st.tabs(["Tableau de bord", "Recherche Internet", "Suivi RGPD", "Courtiers", "Mes données"])

    def audit(action):
        store.add(json.dumps({"event": action, "at": datetime.now(timezone.utc).isoformat()}),
                  ttl_days=30, kind="audit")

    def replace(row, updated):
        if not store.update(row["id"], json.dumps(updated, ensure_ascii=False), expected_value=row["value"]):
            st.error("Le dossier a expiré ou a été modifié dans une autre fenêtre. Rechargez la page.")
            st.stop()
        st.rerun()

    findings = store.list_records(kind="finding")
    requests = store.list_records(kind="request")
    with tabs[0]:
        st.subheader("Votre inventaire")
        a, b = st.columns(2)
        a.metric("Résultats conservés", len(findings))
        b.metric("Demandes suivies", len(requests))
        st.info("Une correspondance textuelle ne prouve pas l'identité d'une personne. Vérifiez chaque résultat avant de préparer une demande.")
        if not findings:
            st.write("Aucun résultat enregistré. Lancez une recherche consentie ou créez un dossier manuellement.")
        for row in findings:
            value = json.loads(row["value"])
            with st.expander(f"Résultat {row['id']}"):
                st.text(value["title"])
                st.code(value["url"], language=None)
                st.text(value["description"])
                st.caption("Date limite de conservation : " + datetime.fromtimestamp(row["expires_at"], timezone.utc).date().isoformat())
                if st.button("Supprimer ce résultat", key=f"delete-finding-{row['id']}"):
                    store.delete(row["id"])
                    audit("finding_deleted")
                    st.rerun()

    with tabs[1]:
        st.subheader("Recherche avec l'API officielle Brave")
        st.info("Le terme sera transmis à Brave Search via son API officielle. Ne saisissez que des données vous concernant ou pour lesquelles vous êtes autorisé. Les résultats restent temporaires jusqu'à leur enregistrement explicite (7 jours).")
        enabled = os.environ.get("PRIVACY_ENABLE_EXTERNAL_SEARCH") == "1" and bool(os.environ.get("BRAVE_SEARCH_API_KEY"))
        if not enabled:
            st.warning("Recherche externe désactivée : activation et clé API requises côté serveur.")
        if st.session_state.pop("reset-search-consent", False):
            st.session_state["search-consent"] = False

        if st.session_state.pop("search-error", False):
            st.error("Recherche impossible ou quota atteint. Vérifiez le consentement, la configuration et réessayez plus tard.")

        def reset_consent():
            st.session_state["search-consent"] = False

        query = st.text_input("Terme exact à rechercher", max_chars=120, key="search-query", on_change=reset_consent)
        import hashlib
        scope = hashlib.sha256(query.encode()).hexdigest()
        consent = st.checkbox("J'autorise la transmission de ce terme exact à Brave pour cette recherche.", key="search-consent")
        if st.button("Rechercher avec ce consentement", disabled=not enabled or not consent or not query.strip()):
            try:
                approval = create_search_consent(query, user_id=principal.user_id, confirmed=consent)
                results = search_public_web(query, user_id=principal.user_id, consent=approval, limit=5)
                st.session_state["search-results"] = {"query": query, "items": results}
                audit("search_consented_and_executed")
                st.session_state["reset-search-consent"] = True
                st.rerun()
            except (PermissionError, ValueError, RuntimeError):
                st.session_state["reset-search-consent"] = True
                st.session_state["search-error"] = True
                st.session_state.pop("search-results", None)
                st.rerun()
        preview = st.session_state.get("search-results")
        if preview and preview["query"] == query:
            st.caption(f"{len(preview['items'])} résultat(s). Aucun site résultat n'est téléchargé par l'application.")
            for i, item in enumerate(preview["items"]):
                with st.expander(f"Résultat temporaire {i + 1}"):
                    st.text(item["title"])
                    st.code(item["url"], language=None)
                    st.text(item["description"])
                    st.caption(assess_snippet(query, item["description"])["status"])
                    if st.button("Conserver ce résultat 7 jours", key=f"save-result-{scope}-{i}"):
                        existing = {json.loads(r["value"])["url"] for r in findings}
                        if item["url"] not in existing:
                            store.add(json.dumps(item, ensure_ascii=False), ttl_days=7, kind="finding")
                            audit("finding_saved")
                        st.rerun()
        if st.button("Effacer la recherche temporaire"):
            for key in list(st.session_state):
                if key in ("search-consent", "search-results", "search-query"):
                    del st.session_state[key]
            st.rerun()

    with tabs[2]:
        st.subheader("Demandes RGPD — préparation et suivi manuel")
        st.info("L'application ne transmet aucun courrier. Relisez le destinataire et le texte exact, puis validez pour copier le courrier. Toute modification annule cette validation.")
        with st.form("new-request"):
            recipient = st.text_input("Organisme / destinataire vérifié", max_chars=200)
            url = st.text_input("URL HTTPS concernée", placeholder="https://example.org/profil", max_chars=2048)
            create = st.form_submit_button("Créer un brouillon")
        if create:
            try:
                value = create_request(recipient, url)
                store.add(json.dumps(value, ensure_ascii=False), ttl_days=90, kind="request")
                st.rerun()
            except ValueError:
                st.error("Destinataire ou URL invalide. Utilisez une URL HTTPS publique.")
        for row in requests:
            record = json.loads(row["value"])
            with st.expander(f"Dossier {row['id']} — {STATUS_LABELS[record['status']]}"):
                st.text("Destinataire : " + record["recipient"])
                st.code(record["url"], language=None)
                st.text(record["body"])
                expiry = datetime.fromtimestamp(row["expires_at"], timezone.utc).date().isoformat()
                st.caption(f"Échéance de conservation : {expiry} (UTC). Inaccessible après échéance ; purge à l’accès ou par maintenance horaire. Copiez le courrier validé si vous devez le conserver au-delà.")
                for label, field in (("Envoi manuel déclaré", "sent_on"), ("Réception confirmée", "received_on"), ("Réponse reçue", "response_received_on")):
                    if record.get(field):
                        st.caption(label + " : " + record[field])
                digest = request_digest(record)
                if record["status"] in ("draft", "approved"):
                    with st.form(f"edit-{row['id']}-{record['revision']}"):
                        new_recipient = st.text_input("Destinataire", value=record["recipient"], max_chars=200)
                        new_url = st.text_input("URL concernée", value=record["url"], max_chars=2048)
                        new_body = st.text_area("Texte à relire et compléter", value=record["body"], max_chars=12000, height=260)
                        save = st.form_submit_button("Enregistrer et demander une nouvelle validation")
                    if save:
                        try:
                            replace(row, edit_request(record, recipient=new_recipient, url=new_url, body=new_body))
                        except ValueError:
                            st.error("Modification invalide.")
                if record["status"] == "draft":
                    confirmed = st.checkbox("J'ai vérifié le destinataire, l'URL et le texte affiché. Je valide ce contenu exact.", key=f"review-{digest}")
                    if st.button("Valider le brouillon affiché", key=f"approve-{row['id']}", disabled=not confirmed):
                        replace(row, approve_request(record, reviewer_id=principal.user_id, expected_digest=digest, confirmed=confirmed))
                else:
                    st.caption("Courrier validé : utilisez le bouton de copie du bloc ci-dessous. Aucun envoi.")
                    st.code(export_request(record), language=None)
                if record["status"] == "approved":
                    with st.form(f"sent-{row['id']}"):
                        sent_on = st.date_input("Date de l'envoi effectué par vos soins")
                        attested = st.checkbox("J'atteste avoir envoyé moi-même ce courrier validé hors de l'application.")
                        sent = st.form_submit_button("Enregistrer ma déclaration d'envoi manuel")
                    if sent:
                        try:
                            replace(row, attest_manual_send(record, confirmed=attested, sent_on=sent_on))
                        except (ValueError, PermissionError):
                            st.error("Attestation explicite et date cohérente requises.")
                if record["status"] == "sent_manual":
                    due = due_status(record)
                    st.caption(f"Échéance indicative : {due['due_on']}" + (" (provisoire : réception non confirmée)" if due["provisional"] else " (un mois après réception)"))
                    if due["reminder"]:
                        st.warning("Échéance proche ou dépassée. Examinez le dossier ; aucune relance automatique.")
                    st.caption("Des prolongations ou règles particulières peuvent s'appliquer ; cette date n'est pas un avis juridique.")
                    with st.form(f"receipt-{row['id']}"):
                        received = st.date_input("Date de réception confirmée par le destinataire")
                        receipt = st.form_submit_button("Enregistrer la réception")
                    if receipt:
                        try:
                            replace(row, record_receipt(record, received_on=received))
                        except ValueError:
                            st.error("Date de réception incohérente.")
                    with st.form(f"response-{row['id']}"):
                        responded = st.date_input("Date de réponse reçue")
                        response = st.form_submit_button("Enregistrer la réponse")
                    if response:
                        try:
                            replace(row, record_response(record, response_received_on=responded))
                        except ValueError:
                            st.error("Date de réponse incohérente.")
                if record["status"] in ("sent_manual", "response_received"):
                    if st.button("Clôturer le suivi", key=f"close-{row['id']}"):
                        replace(row, close_request(record))
                st.caption("Historique du dossier")
                st.dataframe(record["history"], hide_index=True)
                if st.button("Supprimer ce dossier de mon espace", key=f"delete-request-{row['id']}"):
                    store.delete(row["id"])
                    audit("request_deleted")
                    st.rerun()

    with tabs[3]:
        st.info("Catalogue indicatif. La présence d'un organisme ici ne prouve pas qu'il détient vos données. Un clic ouvre son site externe.")
        for broker in BROKERS:
            st.write(broker["name"] + " — " + broker["region"])
            st.link_button("Consulter la procédure officielle de " + broker["name"], broker["privacy_url"])

    with tabs[4]:
        st.subheader("Conservation, export et suppression")
        st.write("Résultats : 7 jours. Dossiers : 90 jours ; événements : 30 jours maximum, sans prolongation lors des modifications. Les données sont chiffrées sur le serveur. Vos copies exportées restent sous votre responsabilité.")
        st.caption("L'effacement local ne supprime pas des informations chez Brave ou sur les sites tiers. Aucun document d'identité n'est demandé.")
        rows = store.list_records()
        export = [{"kind": r["kind"], "expires_at": r["expires_at"], "data": json.loads(r["value"])} for r in rows]
        if st.checkbox("Afficher mes données au format JSON pour les copier"):
            st.code(json.dumps(export, ensure_ascii=False, indent=2), language="json")
        st.caption("Cet export d'accès aux données peut inclure vos brouillons non validés ; ce n'est pas un courrier prêt à envoyer.")
        confirm_delete = st.checkbox("Je confirme vouloir supprimer tous les dossiers, résultats et événements de mon espace.")
        if st.button("Supprimer toutes mes données locales", disabled=not confirm_delete):
            store.clear()
            auth = st.session_state.get("_privacy_auth")
            st.session_state.clear()
            if auth:
                st.session_state["_privacy_auth"] = auth
            st.rerun()
        events = [json.loads(r["value"]) for r in rows if r["kind"] == "audit"]
        if events:
            st.dataframe(events, hide_index=True)


if __name__ == "__main__":
    main()
