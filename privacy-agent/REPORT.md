# Rapport de validation — Privacy Agent

Date : 8 octobre 2026. Branche : `feature/privacy-agent-cloud-v1`.
Révision applicative livrée et déployée : `acb7534aa45728bc579b8dc4c496e78d94886a8a`.

**État : application privée déployée, compte Google de l'utilisateur identifié via
le parcours réel puis explicitement autorisé. Le mode d'identification initiale
est désactivé. Le projet n'est pas déclaré entièrement terminé : l'ouverture de
l'espace après autorisation, le MFA, l'isolation entre comptes Google réels et Brave
restent à vérifier.**

## Activation du compte après connexion réelle

L'utilisateur a fourni une capture de l'écran « Compte Google identifié » affichant
son subject après le parcours natif. Ce subject a été ajouté seul à l'allowlist
privée du serveur, sans être recopié dans Git ni dans ce rapport. L'import normal a
désactivé `PRIVACY_IDENTITY_SETUP`. Le client OAuth, le secret cookie et la clé de
chiffrement ont été conservés. Les deux services ont redémarré sur `acb7534`.
Le contrôle serveur confirme une seule identité autorisée, configuration OIDC valide,
mode initial désactivé et endpoint santé HTTP200. La recherche Brave reste désactivée.
La capture confirme le retour Google identifié ; elle ne prouve pas le MFA ni
l'ouverture du tableau de bord après cette dernière autorisation.

## Correctif du bouton de connexion — 8 octobre 2026

Le clic était perdu : le nettoyage de session effaçait aussi l'événement du bouton
avant sa lecture. Les boutons de connexion et les deux déconnexions concernées
conservent maintenant leur seul événement, tout en supprimant les données privées.
Les trois tests de régression échouaient avant correction et réussissent après.
Chromium clique maintenant réellement et vérifie la redirection native `/auth/login`.

Un second défaut a été découvert en suivant cette redirection sur le serveur :
`httpx` manquait à l'intégration Starlette d'Authlib, provoquant HTTP500. Ajout de
`httpx==0.28.1` et `httpcore==1.0.9` aux dépendances verrouillées, installées dans
le venv cloud après checkpoint privé v9. Le commit `acb7534` contient ces dépendances
et un test du client OAuth natif Streamlit avec discovery simulée, state, nonce et PKCE.
Le premier redémarrage utilisait `29cbd88` ; la release finale active est `acb7534`.
La release complète `acb7534` est également disponible sur le serveur.

Contrôle réel de l'endpoint natif après installation : HTTP302 vers
`accounts.google.com`, callback attendu, scope `openid` seul, state et nonce présents.
Aucun code d'autorisation ni jeton d'identité réel n'a été obtenu ou affiché.
Le choix du compte Google par l'utilisateur et le retour authentifié restent à vérifier.

Suite locale : 116 tests et135 sous-tests réussis, dont Chromium. Bandit : aucun
problème signalé. Audit actualisé des43 dépendances verrouillées : aucune vulnérabilité
connue. Authlib émet un avertissement de dépréciation pour son adaptateur HTTPX ;
le parcours testé fonctionne, migration HTTPX2 à évaluer lors d'une mise à jour.
Le test natif supplémentaire passe également sur Python3.13 dans le cloud.
CI du correctif bouton : [réussie](https://github.com/armani585/powershell/actions/runs/37848494896).
Le checkpoint v9 contient la configuration privée : il doit suivre la politique
restreinte de conservation des sauvegardes et ne doit pas être exporté publiquement.

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

## Identification initiale Google livrée

Client présent, clé de chiffrement et cookie conservés, identification initiale prête,
allowlist toujours vide, recherche Brave toujours désactivée. Le endpoint discovery
Google est accessible depuis le serveur et annonce `openid`. Ceci ne valide pas le
secret OAuth : un échange réel après connexion utilisateur reste nécessaire.

Cinq tests supplémentaires couvrent l'identification sans accès, le refus des claims
invalides/expirés, l'absence de création de base, la purge de l'état précédent et
l'activation explicite qui désactive le mode initial. Un troisième test Chromium
vérifie le bouton de connexion natif avec configuration fictive, sans espace privé.
Le test fonctionnel navigateur attend maintenant chaque rendu complet du harnais,
au lieu d'un délai fixe qui produisait des échecs intermittents.

Le service redémarré répond HTTP200 ; les deux services tournent, la passerelle reste
`auth=sprite` / `private_access=admins`. AppTest avec la configuration serveur et un
utilisateur anonyme simulé montre la connexion, aucune donnée privée et aucune
exception. AppTest sans ce double ne fournit pas `st.user.is_logged_in` ; ce contrôle
n'est pas présenté comme une connexion réelle. Aucune base V2 de production créée.

CI de cette release : [run réussi](https://github.com/armani585/powershell/actions/runs/37847716996).
Capture locale : [identification Google](evidence/browser-google-identification.png).
Le résultat Docker ci-dessous précède l'ajout HTTPX. L'audit des dépendances, Bandit
et toute la suite de tests ont été réexécutés après le correctif ; l'image Docker
avec ces nouvelles dépendances n'a pas été reconstruite dans cette intervention.

## Vérifications exécutées

| Contrôle | Résultat / portée |
|---|---|
| Suite finale locale sur le commit livré, Python3.12.14 | **116 tests réussis**,135 sous-tests, aucun ignoré avec Chromium activé |
| Couverture du code applicatif, tests exclus du calcul | **92%** mesurés, pas une preuve d'absence de défaut |
| Streamlit AppTest | 10 tests UI : refus sans auth/clé, consentement, stockage volontaire, brouillon/validation/édition, isolation/suppression |
| Chromium — application réelle non authentifiée | Accès fermé, aucun champ privé/onglet privé ni base créée |
| Chromium — harnais synthétique séparé | Recherche simulée, enregistrement, dossier, validation humaine, copie, export JSON volontaire et suppression |
| Isolation/sécurité | IDOR CRUD, injection SQL, substitution de ciphertext entre propriétaires/lignes, falsification d'expiration refusées |
| Clés/conservation | Absence de clé ferme l'accès ; rotation par compte, purge d'inactifs, limites de durée, CAS concurrent testés |
| Connecteur Brave | Transport simulé uniquement : consentement exact/utilisateur/usage unique/expiration, quotas, redirections bloquées, payload borné |
| RGPD | Transitions interdites, modification après validation, falsification du contenu, dates de réception et mois calendaire testés |
| Bandit1.9.4 | Aucun problème signalé dans les modules applicatifs |
| pip-audit2.10.1 | Aucune vulnérabilité connue signalée pour les43 versions de production verrouillées au moment de l'audit |
| Image Docker | Construction réussie ; imports et endpoint santé testés sans réseau sortant, UID10001 et filesystem read-only |
| GitHub Actions | Runs push et PR du commit applicatif réussis ; tests, Bandit et audit dépendances |
| Cloud Sprites, Python3.13 | **112 tests réussis**,135 sous-tests ;3 tests navigateur ignorés ; test OAuth natif supplémentaire réussi séparément car Chromium absent sur le Sprite |

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
- Release séparée : `/home/sprite/privacy-releases/acb7534/privacy-agent`.
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

1. **Compte Google autorisé, fin du parcours à confirmer** : le client est installé,
   le retour Google identifié a été constaté sur la capture de l'utilisateur et son
   seul subject est autorisé. Confirmer maintenant l'ouverture de l'espace privé.
   Le MFA et l'isolation de deux comptes Google réels restent à vérifier ; les tests
   synthétiques correspondants passent. Voir [GOOGLE_SETUP.md](GOOGLE_SETUP.md).
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
