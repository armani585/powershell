# CV Studio dans GitHub Codespaces

Le projet complet reconstruit se trouve dans `cv-studio/`. Il reprend les fonctions du serveur fourni ; l’interface a été recréée, les sources d’origine n’ayant pas été fournies.

## Ouvrir le projet dans le cloud

1. Ouvrir https://github.com/armani585/powershell/tree/cv-studio-cloud.
2. Cliquer **Code → Codespaces → créer un Codespace**, en sélectionnant la branche **cv-studio-cloud** et la configuration **CV Studio** (options avancées si nécessaire).
3. Attendre l’installation des dépendances et de Chromium, puis ouvrir un terminal :

```sh
cd /workspaces/powershell/cv-studio
pnpm dev
```

4. Dans l’onglet **Ports**, ouvrir **4317** dans le navigateur. Garder la visibilité **privée**. Le serveur doit rester actif.

Le navigateur peut éditer un CV et produire des PDF sans clé OpenAI. La sauvegarde automatique reste dans ce navigateur ; exporter une sauvegarde JSON avant de changer de navigateur ou d’appareil.

## Activer les fonctions IA

Ajouter `OPENAI_API_KEY` dans https://github.com/settings/codespaces sous les secrets Codespaces, autoriser le dépôt `powershell`, puis redémarrer le Codespace. `OPENAI_MODEL` vaut `gpt-5-mini` par défaut. Une clé côté serveur active l’import de documents, la reformulation, la condensation et la traduction ; ces fonctions utilisent les crédits de votre projet OpenAI.

Ne jamais mettre `.env.local` dans Git : le dépôt est public. Ce fichier n’est pas publié. Une proposition doit toujours être relue avant application.

## Vérification et production

```sh
pnpm test
pnpm build
pnpm start
```

Le serveur écoute sur `0.0.0.0` uniquement dans Codespaces et autorise son nom d’hôte spécifique. En local, il écoute sur `127.0.0.1`. Codespaces est un environnement de travail cloud, pas un hébergement permanent. Cette application est destinée à un utilisateur avec un port privé ; un site public nécessiterait une authentification et des quotas.

## Contrôles réalisés lors de la reconstruction

Compilation de production ; cinq tests de schémas, sauvegardes et HTML échappé ; contrôles Chromium à 375, 820 et 1280 px ; édition et persistance ; sauvegarde/restauration JSON ; trois mises en page ; PDF A4 une page avec extraction du texte ; refus du débordement ; session API et erreurs sans clé. Le parcours de relecture IA a été contrôlé avec des réponses simulées, sans appel payant au fournisseur. La création d’un Codespace réel n’a pas été testée dans cette session.
