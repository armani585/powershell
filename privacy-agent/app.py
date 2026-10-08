"""Privacy Agent Cloud — tableau de bord et aperçu de recherche sécurisé."""
import csv
import io
import sqlite3
from pathlib import Path
import streamlit as st
from discovery import prepare_searches

DB = Path("/app/data/privacy.db") if Path("/app/data").exists() else Path("privacy.db")
EXAMPLES = [
 ("Annuaire fictif", "https://example.org/annuaire", "Téléphone affiché", "À examiner"),
 ("Ancien CV fictif", "https://example.org/cv", "CV indexé", "À examiner"),
 ("Profil fictif", "https://example.org/profil", "Ancien compte", "À examiner"),
 ("Forum fictif", "https://example.org/forum", "Pseudo public", "À examiner"),
 ("Courtier fictif", "https://example.org/data", "Adresse affichée", "À examiner"),
]
def connect():
    db = sqlite3.connect(DB)
    db.execute("CREATE TABLE IF NOT EXISTS traces (id INTEGER PRIMARY KEY, site TEXT, url TEXT, description TEXT, statut TEXT)")
    db.execute("CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, action TEXT, date TEXT DEFAULT CURRENT_TIMESTAMP)")
    if not db.execute("SELECT COUNT(*) FROM traces").fetchone()[0]:
        db.executemany("INSERT INTO traces(site,url,description,statut) VALUES(?,?,?,?)", EXAMPLES)
        db.commit()
    return db

st.set_page_config(page_title="Privacy Agent Cloud", page_icon="🛡️", layout="wide")
st.title("🛡️ Privacy Agent Cloud")
st.warning("MODE SIMULATION — aucune recherche automatique ni transmission de données personnelles. Les résultats et les organismes sont fictifs.")
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
    st.info("Aperçu hors ligne : aucune recherche n'est lancée et aucune donnée n'est envoyée à Google ou Bing. Ne saisissez pas de données sensibles dans cette démonstration cloud.")
    terms = st.text_area("Termes de démonstration (un par ligne)",value="Nom Exemple\nPseudoFictif",max_chars=1250)
    engines = st.multiselect("Moteurs",["google","bing"],default=["google","bing"])
    if st.button("Générer l'aperçu des recherches"):
        try:
            queries = prepare_searches(terms.splitlines(),tuple(engines))
            st.session_state["preview"] = [(q.engine,q.query,q.url) for q in queries]
        except ValueError as exc:
            st.error(str(exc))
    if st.session_state.get("preview"):
        st.caption("URLs construites localement dans le serveur ; ne pas les ouvrir avec de vraies données sans en comprendre la transmission.")
        st.dataframe(st.session_state["preview"],use_container_width=True)
        output=io.StringIO()
        writer=csv.writer(output)
        writer.writerow(["Moteur","Terme","URL"])
        writer.writerows(st.session_state["preview"])
        st.download_button("Exporter l'aperçu CSV",output.getvalue(),file_name="apercu-recherches.csv",mime="text/csv")
with tab_audit:
    st.dataframe(db.execute("SELECT date,action FROM audit ORDER BY id DESC LIMIT 50").fetchall(),use_container_width=True)
st.caption("Aucun robot de suppression, aucune API IA et aucun envoi automatique ne sont activés.")
