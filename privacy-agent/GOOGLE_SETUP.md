# Connexion Google — préparation privée

Fournisseur choisi par l'utilisateur : Google. Le client Web créé par l'utilisateur
peut être importé depuis son fichier privé sur le serveur. L'identification initiale
ne donne aucun accès aux données et n'ajoute jamais automatiquement un compte.

## Paramètres exacts

- Type : client OAuth **Application Web**, dans un projet Google Cloud maîtrisé.
- Nom suggéré : `Privacy Agent privé`.
- Callback autorisé : `https://mcp-privacy-agent-cloud-b2qhc.sprites.app/oauth2callback`.
- Émetteur : `https://accounts.google.com`.
- Discovery : `https://accounts.google.com/.well-known/openid-configuration`.
- Scope préparé : `openid` seulement ; aucun accès Gmail, Drive, email ou profil demandé.
- Prompt : `select_account` (Google ne prend pas en charge le prompt générique `login`).
- Garder l'audience du client Google limitée à l'organisation ou aux comptes de test
  autorisés selon le type de compte. Ne pas publier l'application pour simplifier la configuration.

L'ID token fournit les claims `iss`, `sub`, `iat`, `exp`. L'application utilise `sub`
et l'émetteur pour l'isolation, jamais une adresse email. Les subjects doivent être
obtenus depuis un ID token vérifié dans un parcours administratif privé de confiance.
Ne pas déposer de jeton dans un décodeur public, dans Git ou dans la conversation.
Aucune inscription automatique du premier compte connecté n'est autorisée.

## Identifier le premier compte sans lui accorder d'accès

Si la liste d'accès est vide, importer le client avec `--identity-setup` à la place
de `--subjects-file`. Cette option serveur explicite est réservée à Google et refuse
une liste d'accès déjà remplie. L'application propose la connexion native Google,
puis affiche uniquement le `sub` du compte dont Streamlit a vérifié l'identité.
Elle ne crée aucune base et n'enregistre aucun subject. Aucun jeton n'est affiché.

L'utilisateur transmet cet identifiant à l'administrateur par son canal privé
habituel. L'administrateur confirme le compte prévu, prépare le fichier de subjects
et exécute l'import normal ci-dessous. Celui-ci désactive l'identification initiale.
Un simple compte connecté, même le premier, n'obtient jamais d'accès automatique.
`--check` reste en échec pendant cette phase : `identity_setup_ready=true` signifie
seulement que l'identification peut commencer, pas que l'espace privé est autorisé.

## Provisionnement sur le serveur

Exécuter les commandes depuis le dossier `privacy-agent` de la release active.

`google_setup.py` prépare des fichiers0600 dans un répertoire0700. Il génère localement
une clé Fernet et un secret de cookie avec un générateur cryptographiquement sûr,
**sans jamais les afficher**. Une deuxième initialisation conserve les clés existantes.
Le client OAuth est initialement vide, l'allowlist vide et la recherche externe désactivée.

```sh
/home/sprite/privacy-venv-v2/bin/python google_setup.py \
  --directory /home/sprite/privacy-config \
  --initialize https://mcp-privacy-agent-cloud-b2qhc.sprites.app/oauth2callback
```

Depuis la console Google privée, télécharger le fichier JSON du client Web et le
transférer directement au serveur via un canal administratif privé, en mode0600.
Préparer également un fichier JSON0600 contenant la liste des subjects autorisés,
par exemple `["subject-synthetique-pour-la-documentation"]` (à remplacer dans le
fichier privé). Importer ces fichiers localement :

```sh
/home/sprite/privacy-venv-v2/bin/python google_setup.py \
  --directory /home/sprite/privacy-config \
  --client-file /chemin/prive/client-google.json \
  --subjects-file /chemin/prive/subjects.json
```

L'import refuse un mauvais callback, un autre type de client, une liste vide ou un
wildcard, un fichier lisible par d'autres comptes et les liens symboliques. Il conserve
la clé de chiffrement et n'active pas Brave. Les seules sorties sont des booléens.
Supprimer les copies d'import devenues inutiles selon la politique des secrets.

```sh
/home/sprite/privacy-venv-v2/bin/python google_setup.py \
  --directory /home/sprite/privacy-config --check
```

Le contrôle retourne1 si la connexion et le chiffrement ne sont pas configurés,
0 sinon. Il ne fait aucun appel Google et **ne valide pas un client auprès de Google**.
Redémarrer le service `privacy-agent` après import, puis vérifier le vrai parcours
Google, le callback, le rejet d'un compte absent, l'expiration et deux comptes isolés.

Les fichiers locaux sont un stockage privé de secrets du serveur, pas un coffre
externalisé. Prévoir une sauvegarde ou un coffre distinct avec droits restreints ;
ne jamais stocker une copie en clair des clés avec une sauvegarde de la base.

## MFA et limites

Une connexion Google OIDC ordinaire ne prouve pas, à elle seule, qu'un second facteur
a été utilisé. Activer et vérifier la validation en deux étapes sur le compte, ou
imposer sa politique dans Google Workspace. Aucune garantie MFA n'est déduite du
seul succès de la connexion dans le code. L'appel Google réel reste à tester après
provisionnement. Le scope minimal préparé doit également être confirmé sur ce client.

Sources : [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect),
[discovery Google](https://accounts.google.com/.well-known/openid-configuration),
[clients Google Cloud](https://console.cloud.google.com/auth/clients).
