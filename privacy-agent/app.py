"""Privacy Agent Cloud — simulation et préparation de recherches sans envoi automatique."""
import csv
import io
import os
import sqlite3
from pathlib import Path
import streamlit as st
from discovery import prepare_searches

DATA_DIR = Path(os.environ.get("PRIVACY_DATA_DIR", "/home/sprite/privacy-data"))
DATA_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
DB = DATA_DIR / "privacy.db"
EXAMPLES = [
 ("Annuaire fictif", "https://example.org/annuaire", "Téléphone affiché", "À examiner"),
 ("Ancien CV fictif", "https://example.org/cv", "CV indexé", "À examiner"),
 ("Profil fictif", "https://example.org/profil", "Ancien compte", "À examiner"),
 ("Forum fictif", "https://example.org/forum", "Pseudo public", "À examiner"),
 ("Courtier fictif", "https://example.org/data", "Adresse affichée", "À examiner"),
]
def connect():
    db = sqlite3.connect(DB)
    try:
        os.chmod(DB, 0o600)
    except OSError:
        pass
    db.execute("CREATE TABLE IF NOT EXISTS traces (id INTEGER PRIMARY KEY, site TEXT, url TEXT, description TEXT, statut TEXT)")
    db.execute("CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, action TEXT, date TEXT DEFAULT CURRENT_TIMESTAMP)")
    if not db.execute("SELECT COUNT(*) FROM traces").fetchone()[0]:
        db.executemany("INSERT INTO traces(site,url,description,statut) VALUES(?,?,?,?)", EXAMPLES)
        db.commit()
    return db

st.set_page_config(page_title="Privacy Agent Cloud", page_icon="🛡️", layout="wide")
st.title("🛡️ Privacy Agent Cloud")
st.warning("MODE SIMULATION — aucune recherche ni transmission automatique. Les traces du tableau de bord sont fictives.")
db = connect()
tab_dashboard, tab_search, tab_audit = st.tabs(["Tableau de bord", "Préparer une recherche", "Journal d'audit"])
with tab_dashboard:
    rows = db.execute("SELECT id,site,url,description,statut FROM traces ORDER BY id").fetchall()
    a,b,c = st.columns(3)
    a.metric("Traces fictives",len(rows))
    b.metric("À examiner",sum(x[4]=="À examiner" for x in rows))
    c.metric("Traitées en simulation",sum(x[4]=="Traité (simulation)" for x in rows))
    for id,site,url,desc,status in rows:
        with st.expander(f"{site} — {status}"):
            st.write(f"URL fictive : {url}")
            st.write(desc)
            if st.button("Marquer traité (simulation)",key=f"done-{id}"):
                db.execute("UPDATE traces SET statut=? WHERE id=?",("Traité (simulation)",id))
                db.execute("INSERT INTO audit(action) VALUES(?)",(f"Statut simulé modifié pour fiche {id}",))
                db.commit()
                st.rerun()
            draft = f"""Objet : Demande d'effacement (article 17 du RGPD)

Madame, Monsieur,

Je souhaite exercer mon droit à l'effacement concernant les données personnelles me concernant présentes à l'adresse suivante : {url}

Merci de m'indiquer les suites données à ma demande dans les délais applicables.

Cordialement,
[Identité à compléter lors de l'envoi manuel]"""
            st.download_button("Télécharger le brouillon RGPD (non envoyé)",draft,file_name=f"demande-rgpd-{id}.txt",mime="text/plain",key=f"draft-{id}")
with tab_search:
    st.info("Préparation locale : les requêtes restent dans cette session jusqu'à ce que tu ouvres volontairement un lien externe. Un clic transmet alors le terme au moteur choisi.")
    terms = st.text_area("Termes de recherche (un par ligne)",value="Nom Exemple\nPseudoFictif",max_chars=1250,key="terms")
    engines = st.multiselect("Moteurs",["google","bing"],default=["google","bing"])
    left,right=st.columns(2)
    with left:
        if st.button("Préparer les recherches"):
            try:
                queries = prepare_searches(terms.splitlines(),tuple(engines))
                st.session_state["preview"] = [(q.engine,q.query,q.url) for q in queries]
            except ValueError as exc:
                st.error(str(exc))
    with right:
        if st.button("Effacer l'aperçu et les termes"):
            st.session_state.pop("preview",None)
            st.rerun()
    if st.session_state.get("preview"):
        st.dataframe(st.session_state["preview"],use_container_width=True)
        st.caption("Les liens ci-dessous ne s'ouvrent qu'après ton clic. Ne recherche pas de données sensibles sans en comprendre la transmission.")
        for i,(engine,term,url) in enumerate(st.session_state["preview"]):
            st.link_button(f"Ouvrir {engine} — recherche {i+1}",url)
        output=io.StringIO()
        writer=csv.writer(output)
        writer.writerow(["Moteur","Terme","URL"])
        writer.writerows(st.session_state["preview"])
        st.download_button("Exporter l'aperçu CSV",output.getvalue(),file_name="apercu-recherches.csv",mime="text/csv")
with tab_audit:
    st.dataframe(db.execute("SELECT date,action FROM audit ORDER BY id DESC LIMIT 50").fetchall(),use_container_width=True)
st.caption("Aucun robot de suppression, aucune API IA et aucun envoi automatique ne sont activés.")
