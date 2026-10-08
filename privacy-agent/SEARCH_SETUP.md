# Recherche web réelle — préparation

Un adaptateur optionnel `search_api.py` utilise l'API officielle Brave Search. Il est **désactivé par défaut** et ne s'exécute pas depuis l'interface de démonstration.

## Activation future

L'opérateur doit configurer, **hors dépôt public** :

- `PRIVACY_ENABLE_EXTERNAL_SEARCH=1`
- `BRAVE_SEARCH_API_KEY=<secret serveur>`

Chaque appel exige aussi `consent=True`. La recherche transmet le terme au fournisseur Brave. Les résultats ne prouvent pas l'identité : `identity_confirmed=False` par défaut. Les liens sont filtrés, mais aucun contenu de page n'est récupéré.

**Ne pas activer pour des données personnelles réelles** avant vérification de l'accès à l'application, du traitement des journaux, des limites de débit, du coût de l'API, du stockage chiffré et de la politique de conservation. Aucun envoi de courriel n'est implémenté.

Tests unitaires : faux résultats et faux réseau ; ils n'effectuent aucune recherche réelle. Une validation de bout en bout nécessitera une clé API légitime et un consentement de test.
