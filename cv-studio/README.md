# CV Studio

Application locale de creation de CV avec apercu A4, trois mises en page, import de CV et de modeles, reformulation, condensation, traduction FR/EN et PDF avec texte selectionnable.

## Travailler dans le cloud

Une instance privée avec Ollama est disponible sur [CV Studio](https://mcp-cv-studio-b2qhc.sprites.app), avec connexion Fly.io au compte propriétaire. Voir [SPRITES.md](SPRITES.md) pour cette installation vérifiée et [CLOUD.md](CLOUD.md) pour GitHub Codespaces. L’interface et les fichiers partagés ont été reconstruits pour ce dépôt à partir des fonctions décrites dans les fichiers fournis.

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

Deux moteurs sont disponibles. **Ollama** est sélectionné par défaut, en local comme dans Codespaces, même si une ancienne clé OpenAI est présente : le modèle `qwen2.5:3b` (environ 1,9 Go) est téléchargé puis exécuté dans le Codespace. Il analyse automatiquement le texte des PDF, DOCX et TXT, reformule, condense et traduit les CV sans clé ni crédits OpenAI. Prévoir au moins 8 Go de RAM ; les calculs sur CPU peuvent prendre plusieurs minutes. Les ressources et la facturation éventuelle de Codespaces restent applicables. La qualité du modèle doit être vérifiée par relecture ; elle n’est pas garantie équivalente à celle d’OpenAI.

En dehors de Codespaces, installer Ollama depuis https://ollama.com, exécuter `ollama pull qwen2.5:3b` et vérifier que `.env.local` ne force pas `AI_PROVIDER=openai`. Le moteur doit écouter sur `127.0.0.1:11434`. Sous Linux, `bash scripts/setup-ollama.sh` automatise son installation dans le dossier `work/`. Windows nécessite l’installateur Ollama pour Windows.

`AI_PROVIDER=openai` conserve le moteur d’origine. La clé `OPENAI_API_KEY` reste côté serveur ; ne pas partager `.env.local`. `OPENAI_MODEL` vaut `gpt-5-mini` par défaut. Les crédits API OpenAI sont distincts de ChatGPT/Codex. Les appels utilisent `store: false`, ce qui ne supprime pas les règles de rétention du fournisseur.

Le modèle Ollama configuré traite du texte : les scans, images et imports de modèles visuels nécessitent un OCR ou le moteur OpenAI. Les trois mises en page manuelles restent disponibles.

Documentation : https://docs.ollama.com/api/chat et https://docs.ollama.com/capabilities/structured-outputs

## Flux

- Import sans IA (sélectionné si le moteur IA n’est pas prêt) : PDF avec texte sélectionnable, DOCX ou TXT UTF-8, 8 Mo maximum, 20 pages PDF et 60 000 caractères maximum. Extraction sur le serveur CV Studio, sans envoi à OpenAI. Sélectionner les passages pour les répartir dans les champs ou télécharger le texte. Ce mode ne réalise pas une analyse intelligente et ne reconnaît pas le texte des images/scans.
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

## Ancien message de quota OpenAI après une mise à jour

Publier du code sur GitHub ne met pas à jour un serveur déjà lancé. Récupérer la branche `cv-studio-cloud` dans le dossier utilisé, installer les dépendances, arrêter puis redémarrer CV Studio. Le moteur par défaut est Ollama ; une valeur explicite `AI_PROVIDER=openai` dans l’environnement ou `.env.local` reste prioritaire et doit être changée en `ollama` pour utiliser le modèle local. Installer et démarrer Ollama reste nécessaire pour l’analyse. L’onglet Assistant IA indique le moteur et sa disponibilité. Une adresse `127.0.0.1` peut desservir une autre copie que celle du Codespace.

## Optimisation RH, traduction et une page

Les trois boutons sont visibles au-dessus de l’éditeur : **Optimiser la rédaction RH**, **Tenir sur une page**, **Traduire en anglais** (ou en français pour un CV anglais). Appliquer d’abord le CV importé. Une offre ou un poste facultatif permet de cibler la rédaction RH. Une proposition doit être relue et appliquée avant de remplacer le brouillon.

La réécriture utilise des identifiants d’entrée : toute suppression, création, duplication ou permutation d’expérience ou de formation est refusée. Le serveur reprend les entreprises, périodes, lieux et coordonnées du CV original. Hors traduction, il conserve aussi les intitulés, compétences, langues et centres d’intérêt. Les chiffres nouvellement introduits sont refusés. Ces contrôles structurels ne prouvent pas la fidélité de chaque phrase : vérifier les missions reformulées, les qualifications et les niveaux traduits avant application.

L’ajustement A4 mesure le rendu Chromium réel : mise en page actuelle, espacement compact, puis modèle Essentiel compact si nécessaire. Si aucune option ne suffit, le moteur propose une condensation de la prose en conservant chaque entrée, puis le serveur mesure à nouveau. Un CV encore trop long est signalé et son export reste bloqué ; aucune expérience n’est supprimée pour le faire tenir. Les CV très longs peuvent rester incompatibles avec une page lisible.

## Connexion pendant les calculs IA

La rédaction RH, la traduction et la condensation lancent désormais un calcul en arrière-plan. Le navigateur récupère son état par des requêtes courtes et réessaie automatiquement après une coupure temporaire. Un identifiant de demande empêche de lancer deux calculs si l’accusé de réception s’est perdu. Garder la page ouverte pendant l’opération ; le brouillon n’est remplacé qu’après application de la proposition.

Les résultats temporaires restent uniquement dans la mémoire du serveur, avec un nettoyage après environ dix minutes suivant la fin du calcul (douze résultats maximum, une demande en cours). Leur lecture exige le jeton de session. Ils disparaissent lors d’un redémarrage du serveur ; une erreur explicite invite alors à relancer l’action. Les messages de connexion sont séparés des erreurs de traitement et disparaissent après reconnexion.

## Rapidité de l’optimisation RH

L’optimisation travaille passage par passage en mode JSON simple. La validation du résultat et la conservation des expériences restent côté serveur ; le modèle n’a plus à exécuter une grammaire JSON complexe. Les phrases identiques pour un même intitulé de poste partagent une reformulation, tout en conservant chaque expérience et chaque emplacement dans le CV. Les passages non modifiés restent tels quels.

La progression indique le nombre de passages traités. Les reformulations validées sont réutilisées en mémoire pendant environ dix minutes (256 passages maximum). Ainsi, changer une phrase ne recalcule pas toutes les autres. Le cache tient compte de la langue, de l’intitulé, de l’offre et du texte source ; il disparaît au redémarrage. Le résultat complet d’une demande identique bénéficie également du cache de tâches existant.

Les contrôles refusent les emplacements inconnus, les doublons, les textes effacés et les modifications de chiffres. Un filtre conservateur garde la phrase originale lorsqu’une reformulation semble augmenter le niveau de responsabilité, par exemple transformer une participation en organisation autonome. Ce filtre ne constitue pas une preuve de fidélité sémantique : la relecture reste nécessaire. Les remarques indiquent quand des reformulations ont été écartées ou des passages réutilisés.

Mesures sur deux CV fictifs : 8,6 s pour les 8 expériences / 24 missions du test précédent (qui comportait des phrases répétées, contre 67 s précédemment) ; 13,7 s pour 16 missions distinctes, dont 7 reformulations acceptées et les autres phrases conservées. Ces temps ne garantissent pas la durée sur un autre CV. Les essais ont vérifié le nombre, l’ordre et les métadonnées des expériences.
