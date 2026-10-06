# CV Studio dans GitHub Codespaces

Les fichiers sont conservés dans `cv-studio/` pour préserver le projet existant.

## État de cet import

Les dix fichiers fournis ne constituent pas le projet complet. Les dossiers `src/`, `shared/` et `tests/` n’ont pas été fournis. Le serveur importe `shared/model.mjs`, `shared/resume.mjs` et `shared/resume.css` ; la page importe `src/main.jsx`. Le lancement et la compilation restent bloqués jusqu’à l’ajout de ces dossiers. Aucun remplacement de leur contenu n’a été inventé.

## Ouvrir l’environnement cloud

Depuis GitHub, sélectionner Code → Codespaces → créer un Codespace (options avancées si nécessaire), puis choisir la configuration **CV Studio**. L’installation des dépendances s’effectue à la création.

Ajouter `OPENAI_API_KEY` dans les secrets Codespaces du compte GitHub et autoriser ce dépôt, puis créer ou redémarrer le Codespace. Ne jamais placer la clé dans Git : ce dépôt est public. `.env.local` a été volontairement exclu de l’import. L’éditeur et le PDF peuvent fonctionner sans clé ; les fonctions IA en ont besoin.

Après ajout des sources manquantes :

```sh
cd /workspaces/powershell/cv-studio
pnpm exec playwright install --with-deps chromium
pnpm dev
```

Dans l’onglet Ports, ouvrir le port **4317** dans le navigateur et garder sa visibilité **privée**. Le serveur accepte le nom d’hôte du Codespace et écoute sur `0.0.0.0` uniquement dans Codespaces. En local, il continue d’écouter sur `127.0.0.1`.

Pour la production dans cet environnement : `pnpm build`, puis `pnpm start`. Codespaces est un environnement de travail cloud et ne constitue pas un hébergement permanent. Un site public demanderait une adaptation supplémentaire avec authentification et quotas.
