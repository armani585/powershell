# Publication du nouveau site

Le projet est indépendant de l’ancien site depuis la demande explicite de l’utilisateur du 3 octobre 2026. Aucun ancien project_id n’est requis et aucun ancien déploiement ne doit être remplacé par inadvertance.

## Construction

Depuis `darija-site/`, exécuter `npm test`, puis `npm run build`. La sortie `dist/site/` contient uniquement les fichiers nécessaires au navigateur : HTML, CSS, modules JavaScript, données, illustrations, favicon et attribution des drapeaux. Aucun PDF, secret, test ou document de recherche n’est inclus.

La publication ne nécessite ni base de données, ni serveur Node, ni service de synthèse vocale externe configuré. Les voix facultatives sont celles du navigateur de l’utilisateur.

## GitHub Pages

Un workflow manuel est préparé dans `.github/workflows/darija-site-pages.yml` à la racine du dépôt. Prérequis : sources présentes sur GitHub, permission de configurer Pages et source Pages réglée sur GitHub Actions. Ne pas réutiliser une destination Pages existante avant d’avoir vérifié son usage ; le dépôt peut contenir d’autres travaux.

Après lancement, attendre le résultat du job de publication, récupérer l’URL effective renvoyée par Pages, puis vérifier l’accueil et les ressources. Ne pas fabriquer une adresse en supposant que Pages est activé.

## État de l’accès cloud

La lecture Git du dépôt `armani585/powershell` fonctionne avec l’authentification fournie par la plateforme. La requête authentifiée `gh api repos/armani585/powershell` reçoit actuellement `Forbidden` sur `api.github.com` à travers le réseau de cet environnement. Ce résultat ne prouve pas un token manquant ; un GH_TOKEN est déjà présent, sans lecture ni affichage de sa valeur.

Il faut autoriser `api.github.com` dans les accès réseau de l’environnement, en conservant les domaines existants, puis retenter la requête avant de demander une autre configuration d’authentification. La lecture native Git ne démontre pas l’accès à l’API Pages.
