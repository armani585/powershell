# Archive historique — ne décrit pas le nouveau projet

L’utilisateur a choisi un site indépendant. Les étapes ci-dessous sont conservées pour mémoire et ne sont plus des prérequis.

# Intégration lorsque les sources seront disponibles

La version de référence indiquée par AGENTS.md est `C:\Users\azizt\.codex\worktrees\fc0a\DArija`. Préserver ses illustrations, ses 27 situations, son interface, ses données de progression et ses modifications non validées. Ce module ajoute des ressources ; il ne constitue pas une restauration de cette version.

1. Récupérer les sources complètes dans le cloud et relire leurs instructions. Comparer les situations et mots existants pour éviter des doublons ; conserver leurs identifiants.
2. Poursuivre la relecture autonome de `content/learning.json` à partir des références accessibles et documenter les variantes choisies et les corrections. Un avis extérieur est facultatif. Conserver les repères écrits pour les mots et les phrases ; l’écoute est réservée à l’alphabet, selon la préférence de l’utilisateur.
3. Copier les illustrations dans un sous-dossier dédié de `public/illustrations/`, sans remplacer les douze images actuelles. Conserver les fichiers source haute résolution ; prévoir ensuite des variantes optimisées adaptées aux composants du site.
4. Transformer les vues autonomes en composants suivant le code réel du projet. Préfixer les styles ou utiliser le système de styles existant : **ne pas importer cette feuille globale directement** dans l’application React.
5. Brancher l’ouverture d’une fiche sur les mots existants et gérer les homographes par identifiant de sens. Ne pas supposer que l’arabe non vocalisé permet d’inférer la prononciation automatiquement.
6. Garder la nouvelle liste de mots dans son espace de stockage séparé, ou écrire une migration explicite avec sauvegarde. Ne pas effacer la progression du site.
7. Relancer les contrôles de données existants, TypeScript, la construction, les scénarios de lecture audio et de progression. Tester ordinateur, mobile, clavier et absence de réseau. Les commandes du projet demeurent bloquées tant que ses scripts manquent.

Ne pas modifier le project_id du Site existant et ne pas créer de second Site pour présenter ce module comme une nouvelle version du site de référence. Aucun site n’a été publié pendant cette préparation.
