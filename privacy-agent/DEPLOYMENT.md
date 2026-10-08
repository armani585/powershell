# Exploitation du déploiement privé

Le service utilise la release applicative `ddd535f`, indépendamment des commits
ultérieurs de documentation. Ne pas exposer le port ni changer `auth=sprite` /
`private_access=admins` pour contourner la connexion.

## Configuration à fournir via le gestionnaire de secrets

Le répertoire `/home/sprite/privacy-config` a été créé avec le mode0700, sans secrets.
Préparer les fichiers en mode0600 depuis un canal privé administratif :

- `runtime.env` : variables `PRIVACY_OIDC_ISSUER`, `PRIVACY_ALLOWED_SUBJECTS` JSON,
  `PRIVACY_SESSION_MINUTES`, `PRIVACY_VAULT_KEYS` JSON. Laisser
  `PRIVACY_ENABLE_EXTERNAL_SEARCH=0` tant que Brave n'est pas validé. La syntaxe du
  fichier est celle d'un shell POSIX ; les valeurs JSON doivent être correctement citées.
- `secrets.toml` : secrets OIDC Streamlit suivant `.streamlit/secrets.toml.example`.
  Callback : `https://mcp-privacy-agent-cloud-b2qhc.sprites.app/oauth2callback`.
  Le fichier est référencé par un lien dans la release, sans être committé.

Ne transmettre aucune clé dans les tickets, journaux ou messages de discussion.
Les launchers `/home/sprite/privacy-run-v2.sh` et `privacy-retention-v2.sh` sont0700.
Le répertoire de données commun est fixé à `/home/sprite/privacy-data` après chargement
par le launcher pour que l'application et la purge ciblent toujours la même base.

Redémarrer `privacy-agent` via le gestionnaire de services après provisionnement.
Vérifier le parcours OIDC réel et les deux comptes isolés avant toute donnée réelle.
Le service de purge ne charge aucune clé ; sa panne doit être surveillée dans le
gestionnaire de services. Le endpoint santé Streamlit prouve seulement que le serveur
répond, pas que l'authentification ou Brave sont opérationnels.

## Retours arrière

Checkpoint antérieur : `v4`. Il restaure tout le Sprite et peut effacer des changements
postérieurs ; privilégier un retour du service seul tant qu'aucune migration de données
n'a eu lieu. L'installation antérieure `/home/sprite/privacy-repo` et son venv
`/home/sprite/privacy-venv` ont été préservés. Sa commande précédente était :

```text
/home/sprite/privacy-venv/bin/streamlit run /home/sprite/privacy-repo/privacy-agent/app.py --server.address=0.0.0.0 --server.port=8501 --server.headless=true
```

La V1 est une simulation sans authentification applicative ; conserver impérativement
la passerelle privée lors d'un retour arrière. Ne jamais importer automatiquement une
base historique sans propriétaire. Les checkpoints doivent expirer conformément à la
politique des sauvegardes, et une restauration doit réappliquer les suppressions.

## Preuves et périmètre

Voir [REPORT.md](REPORT.md). Le service est démarré mais fermé faute de configuration.
Les tests navigateur fonctionnels utilisent un harnais synthétique local ; le navigateur
externe a vérifié la passerelle privée, sans la franchir ni se connecter.
