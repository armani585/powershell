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

## Analyse IA sans crédits OpenAI

La configuration CV Studio utilise désormais `AI_PROVIDER=ollama` et le modèle `qwen2.5:3b`. À l’ouverture du Codespace, l’application démarre puis installe Ollama et télécharge le modèle en arrière-plan. L’éditeur et les PDF restent disponibles pendant cette première installation. L’interface vérifie l’état du moteur toutes les 15 secondes et active l’analyse lorsqu’il est prêt.

Le modèle occupe environ **1,9 Go**, en plus du moteur. La configuration demande **8 Go de RAM** au minimum ; le calcul sur CPU peut prendre plusieurs minutes. Ollama écoute uniquement sur `127.0.0.1:11434` ; seul le port 4317 de l’application est à ouvrir, en privé. Aucun document n’est envoyé à OpenAI en mode Ollama. Les ressources du Codespace peuvent être facturées par GitHub selon le compte et les quotas.

Pour un Codespace créé avant cette mise à jour : mettre à jour la branche `cv-studio-cloud`, puis lancer **Codespaces: Rebuild Container** depuis la palette de commandes afin d’appliquer les nouveaux paramètres. Les journaux sont `cv-studio/work/ollama-setup.log` (installation) et `cv-studio/work/ollama.log` (moteur). Un téléchargement interrompu peut être relancé avec `bash scripts/setup-ollama.sh` dans le dossier CV Studio.

Les fonctions conservées sont l’analyse/structuration automatique, la reformulation, la condensation et la traduction FR/EN. Toujours relire les propositions : un petit modèle peut commettre des erreurs ou omettre des informations. Les PDF doivent contenir du texte sélectionnable ; le modèle prévu ne lit pas les images/scans et ne reproduit pas un modèle visuel. L’application refuse un document trop long au lieu de le tronquer silencieusement. Une seule analyse Ollama peut s’exécuter à la fois.

### Utiliser OpenAI en option

Pour revenir à OpenAI, définir `AI_PROVIDER` à `openai` dans la configuration du conteneur puis reconstruire celui-ci. Ajouter `OPENAI_API_KEY` dans https://github.com/settings/codespaces, autoriser ce dépôt, puis redémarrer. `OPENAI_MODEL` vaut `gpt-5-mini` par défaut. Les clés restent côté serveur ; ne jamais publier `.env.local`. La facturation API est distincte de ChatGPT/Codex.

Documentation du moteur : https://docs.ollama.com/linux et https://docs.ollama.com/api/chat.

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

L’analyse automatique reste disponible en choisissant **Avec IA**, avec les fonctions de reformulation, condensation et traduction. Avec Ollama, ces fonctions utilisent le modèle installé dans le Codespace sans crédit API. Avec OpenAI, elles nécessitent une clé API valide et du crédit OpenAI. L’import sans IA constitue une option supplémentaire, pas un remplacement de l’analyse.

## Vérifications de l’intégration Ollama

Tests du contrat HTTP et des réponses structurées, erreurs de moteur/modèle, limite d’entrée et concurrence ; parcours navigateur d’import/relecture/application, reformulation/condensation/traduction, conservation des coordonnées, état indisponible et affichage mobile/desktop. Les réponses d’Ollama ont été simulées pour ces contrôles. Le téléchargement du moteur/modèle et une inférence réelle dans le Codespace de l’utilisateur ne sont pas encore vérifiés : l’environnement de cette session ne donne pas accès à ce Codespace ni aux domaines de téléchargement Ollama.
