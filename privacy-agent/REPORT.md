# Rapport de validation — Privacy Agent

Date : 8 octobre 2026. Branche : `feature/privacy-agent-cloud-v1`.
Révision applicative livrée et déployée : `ddd535f28a59eae291f0a0592581d3dead738fa9`.

**État : implémentation et tests synthétiques validés ; déploiement privé effectué,
accès applicatif volontairement fermé en l'absence de secrets. Le projet n'est pas
déclaré prêt pour un usage réel : OIDC/MFA, Brave et configuration des clés restent
à provisionner et à vérifier de bout en bout.**

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

## Vérifications exécutées

| Contrôle | Résultat / portée |
|---|---|
| Suite finale locale sur le commit livré, Python3.12.14 | **98 tests réussis**,116 sous-tests, aucun ignoré avec Chromium activé |
| Couverture du code applicatif, tests exclus du calcul | **89%** (745/841 instructions couvertes), pas une preuve d'absence de défaut |
| Streamlit AppTest | 8 tests UI : refus sans auth/clé, consentement, stockage volontaire, brouillon/validation/édition, isolation/suppression |
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
| Cloud Sprites, Python3.13 | **96 tests réussis**,116 sous-tests ;2 tests navigateur ignorés car Chromium absent sur le Sprite |

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

Preuves reproductibles : [CI push](https://github.com/armani585/powershell/actions/runs/37837349115),
[CI PR](https://github.com/armani585/powershell/actions/runs/37837352515).
Captures synthétiques : [refus d’accès](evidence/browser-production-access-denied.png)
et [courrier validé dans le harnais de test](evidence/browser-approved-synthetic.png).

## Déploiement privé vérifié

- Sprite existant : `mcp-privacy-agent-cloud`, ID `sprite-f19b4807-7901-42f7-851a-3464c02685fa`.
- Réglages conservés et relus : `auth=sprite`, `private_access=admins`.
- Point de restauration créé avant toute modification cloud : **v4**.
- Release séparée : `/home/sprite/privacy-releases/ddd535f/privacy-agent`.
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

1. **OIDC absent** : choisir/provisionner le client du fournisseur, le callback HTTPS,
   les secrets et la liste des subjects autorisés. Imposer le MFA côté fournisseur.
   Tester ensuite connexion, rejet d'un compte non autorisé, expiration, déconnexion,
   changement de compte et isolement dans deux navigateurs authentifiés.
2. **Clés de production absentes** : provisionner un trousseau Fernet fort depuis un
   gestionnaire de secrets, vérifier sauvegarde séparée, récupération et rotation
   sur le déploiement réel. Les rotations effectuées ici utilisent uniquement des clés fictives.
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
