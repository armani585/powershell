# Darija — pas à pas

Nouveau site indépendant pour apprendre le darija en français, développé dans le cloud à la demande de l’utilisateur. Il conserve le contenu de la version autonome et ne dépend ni du code, ni de l’identifiant d’hébergement, ni de l’installation Windows de l’ancien site.

## Contenu

581 fiches comprenant les formes en contexte, 63 situations, 30 thèmes, 28 lettres, huit leçons de lecture, six parcours guidés, conjugaison, exercices et progression locale. Les mots s’ouvrent pour montrer leur écriture, leurs repères sonores et les variantes documentées. Audio facultatif pour les noms des lettres uniquement.

Le contenu fait l’objet d’une relecture autonome à partir des références accessibles. Sources, variantes, corrections et limites sont documentées dans `docs/`. Le PDF fourni par l’utilisateur et les recherches brutes ne sont pas redistribués. Les drapeaux sont sous licence MIT ; les apports DODa sont attribués sous CC BY-NC 4.0.

## Développement dans le cloud

Node.js 22 ou supérieur. Aucune dépendance de production, aucune installation npm requise.

```sh
npm test
npm run build
npm run preview
```

Le serveur Python du port 4180 sert à la vérification interne. Il ne publie pas le site. Les tests de navigateur utilisent `PLAYWRIGHT_MODULE` et `BASE_URL` ; les résultats restent dans `test-output/`, ignoré par Git.

- `dist/site/` : version statique à publier, avec illustrations WebP séparées et cache du navigateur.
- `npm run build:download` : HTML autonome dans `dist/atelier-autonome.html`.
- Les deux versions utilisent les mêmes données et le même code d’interface.
- Les sept planches sont compressées en WebP en conservant leurs dimensions ; les PNG d’origine restent dans l’état antérieur `../darija-enrichment/`.

## Publication

Publier exclusivement `dist/site/` sur un hébergement statique. Les chemins sont relatifs pour fonctionner à la racine ou sous un chemin de projet.

Le workflow GitHub Actions `Publier Darija indépendant` est préparé dans `../.github/workflows/darija-site-pages.yml`. Il vérifie les données, construit le site et publie l’artifact Pages. Il est lancé manuellement et ne modifie pas l’ancien hébergement Sites. Voir [DEPLOYMENT.md](docs/DEPLOYMENT.md).

Une construction réussie ne signifie pas une mise en ligne. Une adresse publique ne doit être communiquée qu’après confirmation et vérification de la publication.

## Données personnelles et progression

Pas de compte, de microphone ou de service serveur. Les mots enregistrés et la progression restent dans le navigateur. Un nouveau domaine ou un autre appareil dispose d’un stockage distinct ; aucun transfert automatique n’est promis.
