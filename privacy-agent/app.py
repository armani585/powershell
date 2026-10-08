"""Privacy Agent V1: simulation uniquement, sans réseau ni envoi."""
import sqlite3
from pathlib import Path
import streamlit as st

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
st.set_page_config(page_title="Privacy Agent — Simulation", page_icon="🛡️", layout="wide")
st.title("🛡️ Privacy Agent Cloud")
st.warning("MODE SIMULATION — données fictives uniquement. Aucune recherche, requête réseau ou transmission n'est effectuée par l'application.")
db = connect()
rows = db.execute("SELECT id,site,url,description,statut FROM traces ORDER BY id").fetchall()
a,b,c=st.columns(3)
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
        if st.button("Préparer le brouillon RGPD",key=f"draft-{id}"):
            st.text_area("Brouillon non envoyé",f"""Objet : Demande d'effacement de données personnelles (article 17 du RGPD)

Madame, Monsieur,

Je souhaite exercer mon droit à l'effacement concernant les données personnelles me concernant présentes à l'adresse suivante : {url}

Merci de m'indiquer les suites données à ma demande dans les délais applicables.

Cordialement,
[Nom à compléter hors de cette démonstration]""",height=230,key=f"text-{id}")
st.subheader("Journal d'audit")
st.dataframe(db.execute("SELECT date,action FROM audit ORDER BY id DESC LIMIT 50").fetchall(),use_container_width=True)
st.caption("V1 : aucune collecte réelle, aucun e-mail, aucune API IA, aucune suppression réelle.")
