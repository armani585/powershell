# Intégration d'outils tiers — étape de revue

Deux projets externes ont été clonés **pour inspection uniquement** dans le Sprite, en dehors du répertoire applicatif. Aucun installateur ni service tiers n'a été exécuté.

| Projet | Révision examinée | Licence déclarée | Rôle envisagé |
|---|---|---|---|
| [OpenOptOut](https://github.com/rlnunez/OpenOptOut) | `e7a4caa384415fcd2021340bf5147f1544b50ee3` | AGPL-3.0 | Découverte et suivi |
| [Eraser](https://github.com/drumandbytes/eraser) | `b09c23fe2b20bda3f1e5409fa6f093af5b03a5a4` | MIT | Demandes RGPD en mode simulation |

## Conditions avant exécution

- Examiner les dépendances et les actions automatiques au démarrage.
- Tester dans un environnement séparé avec identité fictive et **réseau sortant restreint**.
- Désactiver les tâches planifiées et tout envoi de courriel.
- Vérifier l'authentification, le chiffrement effectif, les journaux et la suppression des données.
- Vérifier la compatibilité des licences avant de redistribuer du code.
- N'activer les recherches personnelles qu'après validation du canal de saisie sécurisé et du périmètre de recherche.
- Ne jamais publier des informations personnelles ou des secrets dans ce dépôt public.

**État :** dépôts récupérés ; pas de validation de sécurité indépendante ; aucune donnée personnelle fournie ; aucun envoi effectué.
