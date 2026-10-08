# Rapport de validation — Privacy Agent

Date : 8 octobre 2026. Branche : `feature/privacy-agent-cloud-v1`.
Révision applicative livrée et déployée : `5941ebce415513350c2ddecaaf280930d2f96ea2`.

**État : implémentation et tests synthétiques validés ; déploiement privé effectué,
clés privées générées et vérifiées avec des données synthétiques ; accès applicatif
fermé tant que le client Google et les subjects autorisés manquent. Le projet n’est
pas déclaré prêt pour un usage réel : Google/MFA et Brave restent à vérifier de bout en bout.**

## Revue initiale

Revue de tous les modules Python, des sept fichiers de tests initiaux et de la
configuration/documentation du sous-projet `privacy-agent`. Les fichiers racine
concernant Darija n'ont pas été modifiés. Travail réparti entre développement Python,
sécurité, RGPD et QA indépendante. La référence initiale est `413abd8`.

| Constat initial | Correction livrée |
|---|---|
| SQLite commune, en clair, aucune connexion utilisateur | OIDC natif Streamlit, allowlist issuer/subject, accès fermé si configuration absente |
| Pas d'isolation des lectures/mutations | Propriétaire imposé côté serveur, filtres SQL systématiques, intégrité owner/id/kind/expiration |
| Moteur Brave déconnecté de l'UI, booléen de consentement générique | API officielle raccordée, consentement unique exact lié au compte, limites et erreurs assainies |
| Chiffrement non activé, clés/conservation non opérationnels | Fernet/MultiFernet, clés externes, rotation testée, durées fixes7/30/90jours, service de purge |
| Suivi RGPD libre en simulation | Machine d'états, revue humaine du contenu exact, modification invalidante, attestation d'envoi manuel |
| Brouillons téléchargés sans validation | Copie du courrier validé dans la session authentifiée ; aucun fichier sensible servi par `/media` |
| Docker copiait seulement app.py et utilisait un mauvais chemin de données | Modules complets, dépendances verrouillées, utilisateur non root, volume cohérent, port localhost |
| Tests limités à20 scénarios de simulation | Tests unitaires, intégration, sécurité, Streamlit AppTest, Chromium et CI |

## Suite après choix de Google

Ajout d'un provisionneur privé idempotent et de six tests de provisionnement :
fichiers à accès restreint, préservation des clés, import du seul client Web attendu,
contrôle du callback et de l'allowlist, refus des symlinks et sorties sans secret.
Correction d'un défaut de consentement : après une recherche échouée, la case est
maintenant décochée et les anciens résultats retirés. Ajout des parcours UI complets
envoi manuel fictif → réception → réponse → clôture et modification de requête A→B→A.

## Vérifications exécutées

| Contrôle | Résultat / portée |
|---|---|
| Suite finale locale sur le commit livré, Python3.12.14 | **106 tests réussis**,122 sous-tests, aucun ignoré avec Chromium activé |
| Couverture du code applicatif, tests exclus du calcul | **90%** mesurés, pas une preuve d'absence de défaut |
| Streamlit AppTest | 10 tests UI : refus sans auth/clé, consentement, stockage volontaire, brouillon/validation/édition, isolation/suppression |
| Chromium — application réelle non authentifiée | Accès fermé, aucun champ privé/onglet privé ni base créée |
| Chromium — harnais synthétique séparé | Recherche simulée, enregistrement, dossier, validation humaine, copie, export JSON volontaire et suppression |
| Isolation/sécurité | IDOR CRUD, injection SQL, substitution de ciphertext entre propriétaires/lignes, falsification d'expiration refusées |
| Clés/conservation | Absence de clé ferme l'accès ; rotation par compte, purge d'inactifs, limites de durée, CAS concurrent testés |
| Connecteur Brave | Transport simulé uniquement : consentement exact/utilisateur/usage unique/expiration, quotas, redirections bloquées, payload borné |
| RGPD | Transitions interdites, modification après validation, falsification du contenu, dates de réception et mois calendaire testés |
| Bandit1.9.4 | Aucun problème signalé dans les modules applicatifs |
| pip-audit2.10.1 | Aucune vulnérabilité connue signalée pour les41 versions de production verrouillées au moment de l'audit |
| Image Docker | Construction réussie ; imports et endpoint santé testés sans réseau sortant, UID10001 et filesystem read-only |
| GitHub Actions | Runs push et PR du commit applicatif réussis ; tests, Bandit et audit dépendances |
| Cloud Sprites, Python3.13 | **104 tests réussis**,122 sous-tests ;2 tests navigateur ignorés car Chromium absent sur le Sprite |

Commandes principales :

```sh
PRIVACY_BROWSER_TESTS=1 python -m pytest -q --cov=. --cov-report=term-missing
bandit -q -r . -x ./tests
pip-audit -r requirements.lock --disable-pip --no-deps --progress-spinner=off
```

La suite navigateur crée un serveur de test exclusivement sur loopback avec une
identité fictive et un fournisseur simulé. Les requêtes navigateur externes y sont
bloquées. Ce harnais ne crée aucun mode de contournement dans l'application déployée.
Les tests de connexion OIDC utilisent des claims et doubles de test ; ils ne prouvent
pas l'échange OAuth, la signature des jetons ou le MFA du futur fournisseur réel.

Preuves reproductibles : [CI push](https://github.com/armani585/powershell/actions/runs/37842173492),
[CI PR](https://github.com/armani585/powershell/actions/runs/37842179765).
Captures synthétiques : [refus d’accès](evidence/browser-production-access-denied.png)
et [courrier validé dans le harnais de test](evidence/browser-approved-synthetic.png).

## Déploiement privé vérifié

- Sprite existant : `mcp-privacy-agent-cloud`, ID `sprite-f19b4807-7901-42f7-851a-3464c02685fa`.
- Réglages conservés et relus : `auth=sprite`, `private_access=admins`.
- Points de restauration : **v4** avant la sécurisation initiale ; **v7** avant le provisionnement Google et la génération des clés.
- Release séparée : `/home/sprite/privacy-releases/5941ebc/privacy-agent`.
- Environnement Python séparé : `/home/sprite/privacy-venv-v2`.
- Services `privacy-agent` et `privacy-retention` démarrés ; l'application dépend du service de purge horaire.
- Endpoint interne `/_stcore/health` : HTTP200, `ok`.
- Navigateur externe non authentifié : redirection vers la [passerelle Sprites](https://sprites.dev/auth/sprite),
  messages «PRIVATE SPRITE», «Sign in to continue» et «private to its organization» ; aucun contrôle de l'application visible.
- Aucune base de données V2 de production créée ; ancienne base de démonstration laissée intacte.

La création du service existant ne permettait pas son remplacement via l'outil MCP
(HTTP409). Sa seule définition a donc été supprimée et recréée avec la commande
supportée `sprite-env services delete`, après arrêt propre et checkpoint ; aucune
suppression du Sprite, du dépôt ou de sa base historique.

## Blocages restant avant utilisation réelle

1. **Client Google et subjects absents** : Google a été choisi par l'utilisateur. La
   console Google Cloud présente un écran de connexion ; aucune session administrative
   ni identité GCP utilisable n'est disponible. Fournir le client Web OAuth et les subjects
   autorisés depuis un canal administratif privé. Le callback exact et la procédure sont
   dans [GOOGLE_SETUP.md](GOOGLE_SETUP.md). Le scope `openid` et `prompt=select_account`
   sont préparés. L'OIDC ordinaire ne garantit pas le MFA : sa politique doit être
   vérifiée côté compte Google ou Workspace. Tester ensuite le vrai parcours et deux comptes.
2. **Clés privées provisionnées** : clé Fernet et secret cookie générés sur le Sprite,
   fichiers0600 et répertoire0700, sans affichage ni commit. Chiffrement, déchiffrement,
   isolation et suppression testés avec cette clé dans une base temporaire fictive,
   supprimée après vérification. Il reste à organiser un coffre/sauvegarde externe,
   puis tester la récupération et la rotation opérationnelle. Les fichiers locaux ne
   constituent pas un gestionnaire de secrets externalisé.
3. **Brave non configuré** : aucune clé fournie, recherche serveur désactivée. L'appel
   à l'API réelle n'a pas été exécuté. Vérifier accès réseau, contrat, quota du compte
   et réponse API avec une requête non personnelle autorisée avant activation.
4. **Gouvernance RGPD** : compléter responsable du traitement/contact, notice et bases
   légales, contrats/transferts, politique des logs et suppression des sauvegardes/checkpoints.
   Le code n'établit pas une certification de conformité ni l'applicabilité de l'effacement.

Les étapes techniques de provisionnement et de retour arrière figurent dans
[DEPLOYMENT.md](DEPLOYMENT.md). Les quotas de recherche sont en mémoire et se
réinitialisent au redémarrage ; fonctionnement à un seul processus/réplica.

**Aucune donnée personnelle réelle recherchée ou injectée, aucune demande RGPD
réelle envoyée et aucune publication publique effectuée.**
