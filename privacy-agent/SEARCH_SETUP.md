# Recherche Internet avec consentement explicite

Le connecteur utilise exclusivement l'API officielle **Brave Search** :
`https://api.search.brave.com/res/v1/web/search`.
Documentation fournisseur : https://api-dashboard.search.brave.com/app/documentation/web-search/get-started

La recherche externe est désactivée par défaut. Pour un environnement privé
approuvé, configurer uniquement côté serveur, sans committer les valeurs :

- `PRIVACY_ENABLE_EXTERNAL_SEARCH=1`
- `BRAVE_SEARCH_API_KEY=<secret serveur>`

L'interface doit afficher le terme exact et indiquer qu'il sera transmis à Brave.
La case de consentement doit initialement être décochée et réinitialisée lorsque
la requête change. Chaque clic de recherche doit produire un nouveau reçu :

```python
consent = create_search_consent(query, user_id=authenticated_subject, confirmed=True)
results = search_public_web(query, user_id=authenticated_subject, consent=consent)
```

`confirmed=True` provient exclusivement de la confirmation explicite de
l'utilisateur authentifié. Ne jamais coder une confirmation automatique. Les
anciens appels avec `consent=True` sont refusés. Un reçu est lié à l'utilisateur,
au fournisseur Brave et à la requête **exacte**, expire après 5 minutes et ne sert
qu'une fois. Modifier la requête, y compris les espaces, impose un nouveau reçu.
Les reçus contiennent un jeton aléatoire ; le registre serveur ne conserve que les
empreintes de l'utilisateur et de la requête, jusqu'à expiration (nettoyage à
l'accès suivant ou arrêt du processus). Aucun terme n'est journalisé ici.

## Protections et limites

- 120 caractères maximum par requête ; caractères de contrôle refusés.
- 1 à 10 résultats ; 10 tentatives par utilisateur et par heure, 100 par processus
  et par heure. Les échecs fournisseur consomment aussi le quota et le reçu.
- Délai réseau 12 secondes ; réponse JSON plafonnée à 256 Kio ; redirections
  refusées. Les proxies HTTPS configurés par l’opérateur sont conservés ; ils
  doivent être approuvés pour ce traitement. La vérification TLS reste activée.
- Les erreurs affichées n'incluent ni clé API, ni requête, ni corps de réponse.
- Liens HTTPS avec noms DNS seulement ; IP, domaines locaux/réservés,
  identifiants dans l'URL et ports autres que 443 refusés.
- Aucun lien de résultat n'est récupéré automatiquement. La validation d'URL est
  syntaxique, sans résolution DNS : elle ne constitue pas une protection SSRF
  pour un éventuel futur système de récupération de pages.
- Les correspondances restent des indices textuels ; `identity_confirmed=False`.
- Les liens de prévisualisation Google/Bing/Brave sont construits hors ligne.
  Les ouvrir transmet le terme au site choisi, indépendamment de l'API serveur.

**Déploiement :** les quotas et reçus sont en mémoire et sont réinitialisés au
redémarrage. Utiliser un seul processus/une seule réplique. Avant toute montée en
charge, remplacer ce registre par un service atomique partagé et durable ; les
quotas actuels ne constituent pas un plafond financier après redémarrage.
Configurer également les limites du compte Brave et de son abonnement.

Le consentement fonctionnel à cette transmission n'établit pas à lui seul la
conformité juridique du traitement. L'opérateur doit examiner les conditions et
la conservation du fournisseur, ses journaux et les éventuels transferts
internationaux ; aucune suppression côté Brave n'est promise par l'application.
Ne pas activer de collecte de données personnelles réelles pour la validation.

## Vérification

Les tests utilisent uniquement des données fictives et un transport simulé.
Ils vérifient consentement exact/expiration/réutilisation, isolation du reçu,
quotas, destination et timeout, refus des redirections, filtrage des résultats,
réponses malformées/trop volumineuses et absence de secrets dans les erreurs.
Aucun test n'appelle l'API réelle et aucun résultat ne prouve la validité d'une
clé Brave de production. Un test fournisseur réel demeure distinct, avec une
clé autorisée et une requête synthétique explicitement consentie.
