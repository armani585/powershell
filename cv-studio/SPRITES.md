# CV Studio sur Sprites

Instance privée : https://mcp-cv-studio-b2qhc.sprites.app

Se connecter avec le compte Fly.io membre de l’organisation propriétaire si demandé. La page de connexion est normale ; l’application n’est pas publique. Le dépôt Git conserve le code, Sprites exécute le serveur et le modèle. Les ressources de calcul et de stockage relèvent de la facturation Sprites, même si aucun crédit API OpenAI n’est consommé.

## Utiliser

Dans Contenu, choisir l’import avec IA et sélectionner un PDF avec texte, un DOCX ou un TXT. Relire la proposition avant de l’appliquer. L’analyse tourne sur CPU et peut demander une minute ou davantage, notamment au premier appel. Les images et PDF scannés ne sont pas reconnus par ce modèle. L’export PDF et l’import sans IA restent disponibles. Les brouillons restent dans le navigateur : exporter une sauvegarde JSON avant de changer de site ou d’appareil.

## Installation vérifiée

Le projet est dans `/home/sprite/work/powershell/cv-studio`, branche `cv-studio-cloud` du dépôt `armani585/powershell`. Node.js 24, dépendances du verrou pnpm, compilation Vite de production, Chromium Playwright, Ollama 0.40.0 et modèle `qwen2.5:3b` ont été installés. Aucune clé OpenAI ni fichier `.env.local` fourni n’a été copié.

Deux services persistants sont configurés :

- `ollama` appelle `scripts/start-sprite-ollama.sh` via `/home/sprite/work/start-ollama.sh`. Ollama écoute uniquement sur la boucle locale, avec le cloud Ollama désactivé.
- `cv-studio` appelle `scripts/start-sprite.sh` via `/home/sprite/work/start-cv.sh`. Le wrapper définit `CV_PUBLIC_ORIGIN=https://mcp-cv-studio-b2qhc.sprites.app` ; le proxy privé dirige les requêtes vers le port interne 4317. Aucun port n’est à régler dans le navigateur.

Les binaires, modèles, navigateur et fichiers de test sont dans `work/`, exclu de Git. Les wrappers sont spécifiques à l’hébergement. Ces scripts supposent les dépendances, le modèle, Chromium et la compilation déjà installés. La configuration de l’URL Sprites reste privée (`auth=sprite`). Ne pas exposer cette application mono-utilisateur publiquement sans authentification applicative et limites supplémentaires.

## Contrôles réels

Sur cette instance : import TXT avec égalité du texte, véritable analyse Ollama du TXT puis d’un PDF fictif, récupération du nom, de l’adresse e-mail et d’expériences, export PDF via Chromium, et parcours navigateur du sélecteur de fichier jusqu’à la relecture du texte PDF. Aucun appel OpenAI utilisé. Les hôtes non autorisés sont refusés ; l’URL externe présente la connexion privée Fly.io aux visiteurs non connectés. L’accès avec le compte personnel dans le navigateur de l’utilisateur n’a pas été vérifié par l’automatisation.

Les tests avec CV fictif ne garantissent pas l’exactitude pour tout CV : relire les résultats d’analyse.
