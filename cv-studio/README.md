# CV Studio

Application locale de creation de CV avec apercu A4, trois mises en page, import de CV et de modeles, reformulation, condensation, traduction FR/EN et PDF avec texte selectionnable.

## Travailler dans le cloud

Voir [CLOUD.md](CLOUD.md) pour ouvrir le projet dans GitHub Codespaces. L’interface et les fichiers partagés ont été reconstruits pour ce dépôt à partir des fonctions décrites dans les fichiers fournis.

## Demarrage Windows

Double-cliquer sur `Demarrer CV Studio.cmd`. Le serveur ecoute uniquement sur `127.0.0.1`. Garder le terminal ouvert pendant l'utilisation.

Installation standard avec Node.js 22 ou plus recent et pnpm :

```sh
pnpm install
pnpm build
pnpm start
```

Adresse par defaut : http://127.0.0.1:4317. Definir PORT dans `.env.local` pour changer de port. Microsoft Edge ou Google Chrome sert a produire les PDF ; sinon installer Chromium avec `pnpm exec playwright install chromium`. `CV_BROWSER_PATH` permet de fournir un autre executable Chromium.

## Configuration IA

Deux moteurs sont disponibles. Dans la configuration Codespaces CV Studio, **Ollama** est sélectionné par défaut : le modèle `qwen2.5:3b` (environ 1,9 Go) est téléchargé puis exécuté dans le Codespace. Il analyse automatiquement le texte des PDF, DOCX et TXT, reformule, condense et traduit les CV sans clé ni crédits OpenAI. Prévoir au moins 8 Go de RAM ; les calculs sur CPU peuvent prendre plusieurs minutes. Les ressources et la facturation éventuelle de Codespaces restent applicables. La qualité du modèle doit être vérifiée par relecture ; elle n’est pas garantie équivalente à celle d’OpenAI.

En dehors de Codespaces, installer Ollama depuis https://ollama.com, exécuter `ollama pull qwen2.5:3b` et définir `AI_PROVIDER=ollama` dans `.env.local`. Le moteur doit écouter sur `127.0.0.1:11434`. Sous Linux, `bash scripts/setup-ollama.sh` automatise son installation dans le dossier `work/`. Windows nécessite l’installateur Ollama pour Windows.

`AI_PROVIDER=openai` conserve le moteur d’origine. La clé `OPENAI_API_KEY` reste côté serveur ; ne pas partager `.env.local`. `OPENAI_MODEL` vaut `gpt-5-mini` par défaut. Les crédits API OpenAI sont distincts de ChatGPT/Codex. Les appels utilisent `store: false`, ce qui ne supprime pas les règles de rétention du fournisseur.

Le modèle Ollama configuré traite du texte : les scans, images et imports de modèles visuels nécessitent un OCR ou le moteur OpenAI. Les trois mises en page manuelles restent disponibles.

Documentation : https://docs.ollama.com/api/chat et https://docs.ollama.com/capabilities/structured-outputs

## Flux

- Import sans IA (par défaut) : PDF avec texte sélectionnable, DOCX ou TXT UTF-8, 8 Mo maximum, 20 pages PDF et 60 000 caractères maximum. Extraction sur le serveur CV Studio, sans envoi à OpenAI. Sélectionner les passages pour les répartir dans les champs ou télécharger le texte. Ce mode ne réalise pas une analyse intelligente et ne reconnaît pas le texte des images/scans.
- Import avec IA : PDF, DOCX, TXT, PNG et JPEG, 8 Mo maximum. Analyse et structuration automatiques avec le moteur choisi, proposition à relire avant application. Ollama accepte les PDF avec texte, DOCX et TXT ; OpenAI accepte aussi les images et nécessite une clé et des crédits API.
- Import de modele : PDF, PNG ou JPEG. L'IA choisit parmi les trois mises en page et adapte la couleur et la famille de police. Ce n'est pas une reproduction exacte d'un fichier arbitraire. Exporter un modele Word en PDF avant import visuel.
- L'IA ne doit pas inventer de faits et preserve les coordonnees lors des reformulations. Toujours relire sa proposition ; aucune garantie automatique d'exactitude des informations extraites.
- Le CV est ajuste a une page avec une taille de texte minimale de 11,5 px (environ 8,6 points). Si cela ne suffit pas, le PDF est bloque : condenser ou retirer du contenu, sans troncature silencieuse.
- L'export PDF est independant de l'IA et ne transmet rien a OpenAI.
- Les brouillons sont dans le localStorage du navigateur. Une sauvegarde JSON permet de les transferer et de les conserver hors du navigateur. Pas de compte ni de synchronisation cloud.
- L'exemple de Camille Laurent est fictif et identifie comme demonstration dans l'editeur.

## Verification

`pnpm test` verifie les schemas et le rendu sans injection de HTML. `pnpm build` produit la version de production. Les vérifications de navigateur ont aussi couvert l’édition, les sauvegardes, les trois modèles, le PDF et les erreurs. Les réponses IA ont été simulées pour vérifier le parcours sans appel payant.

L'application est concue pour un utilisateur en local. Un deploiement public necessiterait authentification, stockage protege et quotas par utilisateur.
