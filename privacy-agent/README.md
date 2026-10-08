# Privacy Agent — espace privé

Application Streamlit en français : connexion OIDC, recherche Brave sur consentement
explicite, résultats chiffrés par compte et suivi manuel des demandes RGPD.
**Aucune fonction d'envoi de courrier, aucun scraping de pages, aucune API IA.**

## Démarrage privé

Python 3.12. `pip install -r requirements.lock`. Copier `.env.example` vers `.env`
et `.streamlit/secrets.toml.example` vers `.streamlit/secrets.toml`, puis renseigner
les valeurs depuis un gestionnaire de secrets. Ne jamais committer ces deux fichiers.
En shell, fournir les variables au processus via le gestionnaire de services ;
Streamlit ne charge pas `.env` automatiquement. Docker Compose le charge explicitement.

- Fournisseur OIDC avec MFA obligatoire côté fournisseur et comptes explicitement autorisés.
- `PRIVACY_OIDC_ISSUER` doit correspondre au claim `iss`. Le endpoint discovery doit
  être `ISSUER/.well-known/openid-configuration` (les fournisseurs à endpoint différent
  ne sont pas pris en charge sans adaptation). Claims vérifiés `iss`, `sub`, `iat`, `exp` requis.
- `PRIVACY_ALLOWED_SUBJECTS` : tableau JSON des `sub` autorisés ; jamais les adresses email.
- Secrets OIDC natifs Streamlit : client, secret, callback HTTPS `/oauth2callback`,
  cookie secret aléatoire fort, `prompt=login`. Autoriser le callback exact chez l'IdP.
- `PRIVACY_VAULT_KEYS` : tableau JSON de clés Fernet, clé active en tête. Créer les clés
  dans un gestionnaire de secrets et les sauvegarder séparément des bases.
- `PRIVACY_DATA_DIR` : répertoire persistant privé. Nouvelle base `privacy-secure-v2.db`.
  L'ancienne base de simulation n'est ni importée ni réattribuée automatiquement.
- Recherche inactive par défaut. Configuration détaillée dans [SEARCH_SETUP.md](SEARCH_SETUP.md).

Sans configuration OIDC ou clés, l'application refuse l'accès. Il n'existe aucun
mode de connexion de démonstration ou mot de passe de secours en production.

```sh
docker compose up --build -d
```

Le port reste lié à `127.0.0.1:8501`. Accéder seulement via une passerelle privée HTTPS.
La passerelle Sprites existante doit rester `auth=sprite`, `private_access=admins`.
Le service `retention` purge toutes les heures, même sans connexion des utilisateurs.
Ne pas activer plusieurs processus/réplicas : SQLite local et quotas Brave en mémoire.
Pour le lancement sans Docker : `streamlit run app.py --server.address=127.0.0.1`
et service distinct `python maintenance.py` avec le même `PRIVACY_DATA_DIR`.

## Parcours

1. Connexion OIDC autorisée ; sessions limitées par les dates du jeton et une durée absolue.
2. Saisir le terme, consentir à sa transmission à Brave, cliquer pour rechercher.
   Chaque recherche nécessite une confirmation ; modifier le terme la remet à zéro.
3. Conserver volontairement un résultat pour 7 jours, ou créer directement un dossier.
4. Relire et compléter le courrier ; valider son destinataire, son URL et son texte exact.
   Le courrier validé est copiable dans la session ; aucune URL de fichier partagé n'est créée.
5. Déclarer un éventuel envoi effectué hors de l'application, suivre réception, réponse,
   échéance indicative et clôture. Toute modification préalable invalide la validation.
6. Consulter/copier ses données JSON ou les supprimer. Dossiers : 90 jours ; audit : 30 jours.

## Vérification

```sh
pip install -r requirements.lock -r requirements-dev.txt
python -m pytest -q --cov=. --cov-report=term-missing
bandit -q -r . -x ./tests
pip-audit -r requirements.lock --progress-spinner=off
```

Tests unitaires, intégration, sécurité et Streamlit AppTest avec données synthétiques
et transport Brave simulé. Les tests ne prouvent pas une connexion OIDC de production
ou une recherche Brave réelle. Voir [REPORT.md](REPORT.md), [SECURITY.md](SECURITY.md)
et [PRIVACY.md](PRIVACY.md) pour preuves, limites et conditions opérationnelles.
