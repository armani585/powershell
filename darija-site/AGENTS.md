# Darija — projet actif indépendant

Ce site est indépendant de l’ancien projet Windows et de sa configuration Sites. Le code source est ici ; les fichiers de darija-enrichment sont un état antérieur conservé.

- Développement et vérification dans le cloud ; aucun outil à installer sur le PC de l’utilisateur.
- Node.js 22 ou supérieur. Aucune dépendance de production ou installation npm nécessaire.
- `npm test` vérifie les données et les comportements purs ; `npm run build` crée `dist/site`.
- `npm run preview` sert la version produite sur le port 4180 pour les contrôles internes. Ne pas présenter localhost comme un lien utilisateur.
- `npm run build:download` crée aussi un HTML autonome. Les illustrations WebP optimisées sont conservées dans les sources.
- Les tests navigateur utilisent PLAYWRIGHT_MODULE et BASE_URL ; garder les résultats hors Git.
- Publier uniquement dist/site. Ni PDF, ni journal de recherche, ni fichier de test ne doivent y entrer.
- Relecture linguistique autonome à partir des sources accessibles. Pas de condition d’approbation par un enseignant ; signaler les variantes et conserver une provenance honnête.
- Audio facultatif limité au nom des lettres. Aucun microphone, compte utilisateur ou service serveur.
- Préserver les identifiants des fiches et les clés de progression. Un changement d’origine web crée un stockage de navigateur distinct ; ne pas promettre un transfert automatique.
