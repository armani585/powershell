# CV Studio dans GitHub Codespaces

Le projet complet reconstruit se trouve dans `cv-studio/`. Il reprend les fonctions du serveur fourni ; l’interface a été recréée, les sources d’origine n’ayant pas été fournies.

## Ouvrir le projet dans le cloud

1. Ouvrir https://github.com/armani585/powershell/tree/cv-studio-cloud.
2. Cliquer **Code → Codespaces → créer un Codespace**, en sélectionnant la branche **cv-studio-cloud** et la configuration **CV Studio** (options avancées si nécessaire).
3. Attendre l’installation des dépendances et de Chromium. CV Studio démarre automatiquement à la création et à chaque redémarrage du Codespace ; le port 4317 s’ouvre dans le navigateur.

Si le navigateur ne s’ouvre pas, utiliser l’onglet **Ports**. En cas de problème de démarrage, voir `cv-studio/work/codespace-server.log`. Pour démarrer manuellement :

```sh
cd /workspaces/powershell/cv-studio
pnpm dev
```

Garder la visibilité du port **privée**. Le Codespace doit rester actif pendant l’utilisation.

Le navigateur peut éditer un CV, importer le texte d’un PDF/DOCX/TXT et produire des PDF sans clé OpenAI. La sauvegarde automatique reste dans ce navigateur ; exporter une sauvegarde JSON avant de changer de navigateur ou d’appareil.

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

## Espace de travail dédié

Le dossier du projet est `/workspaces/powershell/cv-studio`. La configuration Codespaces CV Studio ouvre directement ce dossier pour les nouveaux environnements ou après une reconstruction du conteneur.

Pour un Codespace déjà ouvert à la racine du dépôt : après mise à jour de la branche `cv-studio-cloud`, choisir **File → Open Workspace from File**, puis `/workspaces/powershell/CV-Studio.code-workspace`. Ou utiliser **File → Open Folder** et choisir `/workspaces/powershell/cv-studio`.

L’espace nommé **CV Studio** affiche uniquement ce projet, ouvre le terminal dans son dossier et propose les tâches **CV Studio : démarrer** et **CV Studio : vérifier** (Terminal → Run Task). Le démarrage automatique ne nécessite pas de lancer la tâche une seconde fois.

## Import sans crédits API

Dans **Contenu → Méthode d’import**, le choix par défaut est **Sans IA — aucun crédit OpenAI**. Importer un PDF avec texte sélectionnable, un DOCX ou un TXT UTF-8. Dans la fenêtre de relecture, sélectionner un passage du texte, choisir son champ et cliquer **Appliquer la sélection**. Les autres champs sont conservés. Le texte complet peut aussi être téléchargé.

Ce mode extrait le texte sur le serveur CV Studio (dans le Codespace si utilisé dans le cloud), sans le transmettre à OpenAI. Il ne reconnaît pas les images/scans et ne classe pas automatiquement les expériences ou compétences. Les PDF à colonnes peuvent nécessiter une remise en ordre. Aucun stockage des documents importés n’est ajouté.

L’analyse automatique d’origine reste disponible en choisissant **Avec IA**, avec les fonctions de reformulation, condensation et traduction. Ces fonctions nécessitent toujours une clé API valide et du crédit OpenAI. L’import sans IA constitue une option supplémentaire, pas un remplacement de l’analyse.
