# Privacy Agent Cloud — V1 simulation

Application Streamlit en français pour simuler l'inventaire de traces personnelles et la préparation de demandes RGPD.

## Sécurité
- Les cinq fiches sont entièrement fictives (example.org).
- Aucun moteur de recherche, aucune API IA, aucun navigateur automatisé et aucun e-mail sortant.
- Les brouillons sont générés uniquement dans l'interface.
- Ne jamais committer de données personnelles, d'identifiants ou de clés API.
- Cette V1 **n'a pas d'authentification** : ne pas l'exposer publiquement sur Internet.
- Le port Docker est lié à localhost uniquement.

## Démarrage local
Depuis ce dossier :

```bash
docker compose up --build -d
```

Ouvrir http://localhost:8501

Arrêt : `docker compose down`.

## Déploiement cloud futur
Utiliser un hébergement Docker privé, un accès HTTPS derrière un proxy avec authentification forte et un stockage persistant chiffré. Ne pas rendre le port 8501 public. La mise en ligne n'est **pas** incluse dans cette V1.

## Étapes suivantes
1. Authentification forte et configuration sécurisée.
2. Collecte de données sur sources autorisées avec approbation préalable.
3. Brouillons de demandes RGPD et workflow de validation.
4. Envoi uniquement après validation explicite et journalisation.
