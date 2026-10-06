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

La cle `OPENAI_API_KEY` reste dans `.env.local`, uniquement cote serveur. Ne pas partager ce fichier. `OPENAI_MODEL` vaut `gpt-5-mini` par defaut et peut etre remplace par un modele compatible Responses, vision et Structured Outputs. Les appels utilisent `store: false`. Cela ne supprime pas les regles de retention appliquees par le fournisseur. La facturation et les quotas dependent du projet OpenAI.

Documentation : https://developers.openai.com/api/docs/guides/structured-outputs

## Flux

- Import sans IA (par défaut) : PDF avec texte sélectionnable, DOCX ou TXT UTF-8, 8 Mo maximum, 20 pages PDF et 60 000 caractères maximum. Extraction sur le serveur CV Studio, sans envoi à OpenAI. Sélectionner les passages pour les répartir dans les champs ou télécharger le texte. Ce mode ne réalise pas une analyse intelligente et ne reconnaît pas le texte des images/scans.
- Import avec IA : PDF, DOCX, TXT, PNG et JPEG, 8 Mo maximum. Analyse et structuration automatiques avec OpenAI, conservées en option. Clé et crédits API requis ; proposition à relire avant application.
- Import de modele : PDF, PNG ou JPEG. L'IA choisit parmi les trois mises en page et adapte la couleur et la famille de police. Ce n'est pas une reproduction exacte d'un fichier arbitraire. Exporter un modele Word en PDF avant import visuel.
- L'IA ne doit pas inventer de faits et preserve les coordonnees lors des reformulations. Toujours relire sa proposition ; aucune garantie automatique d'exactitude des informations extraites.
- Le CV est ajuste a une page avec une taille de texte minimale de 11,5 px (environ 8,6 points). Si cela ne suffit pas, le PDF est bloque : condenser ou retirer du contenu, sans troncature silencieuse.
- L'export PDF est independant de l'IA et ne transmet rien a OpenAI.
- Les brouillons sont dans le localStorage du navigateur. Une sauvegarde JSON permet de les transferer et de les conserver hors du navigateur. Pas de compte ni de synchronisation cloud.
- L'exemple de Camille Laurent est fictif et identifie comme demonstration dans l'editeur.

## Verification

`pnpm test` verifie les schemas et le rendu sans injection de HTML. `pnpm build` produit la version de production. Les vérifications de navigateur ont aussi couvert l’édition, les sauvegardes, les trois modèles, le PDF et les erreurs. Les réponses IA ont été simulées pour vérifier le parcours sans appel payant.

L'application est concue pour un utilisateur en local. Un deploiement public necessiterait authentification, stockage protege et quotas par utilisateur.
