# Rédaction RH et format A4

La rédaction vise une action concrète, son objet et les précisions déjà présentes : outils, publics, périmètre, fréquence et résultats chiffrés. Les chiffres, résultats et responsabilités ne sont jamais ajoutés pour rendre une phrase plus vendeuse. « Participer » ne devient pas « piloter ».

Le moteur propose des phrases plus directes, généralement 12 à 22 mots lorsque les faits le permettent. Une vérification conservatrice conserve la source si des détails, unités, réserves ou responsabilités changent ; elle ne constitue pas une preuve sémantique exhaustive. La relecture et l’application explicite restent obligatoires.

Les périphrases reconnues sont raccourcies sans IA. Des missions sont regroupées seulement dans une même expérience (ou formation), si elles partagent exactement un verbe d’action ou un objet. Les propositions complexes ou ambiguës restent séparées. Chaque indice de mission source reste représenté une fois dans la correspondance de regroupement. Aucune expérience n’est supprimée, déplacée ou fusionnée avec une autre.

Exemples :

- « Je suis en charge de la préparation des dossiers clients » → « Préparer les dossiers clients ».
- « Préparer les dossiers clients » + « Vérifier les dossiers clients » → « Préparer et vérifier les dossiers clients ».
- « Suivre les commandes » + « Suivre les livraisons » → « Suivre les commandes et les livraisons ».
- « Participer à l’organisation de 3 réunions mensuelles » conserve la participation, le nombre et la fréquence.

Le bouton **Tenir sur une page** mesure le document A4 réel, ajuste les espacements et compare les trois modèles compacts. Si nécessaire, il raccourcit et regroupe le texte sans appel IA. La police ne descend pas sous 12 px (9 pt). L’aperçu et le PDF partagent les mêmes dimensions physiques. Un CV qui reste trop long n’est jamais tronqué : le dépassement est indiqué et l’export A4 refusé.

## Sources consultées

- [Apec — Décrire ses expériences professionnelles](https://www.apec.fr/candidat/optimiser-votre-candidature/candidature/fiches-conseils/comment-decrire-ses-experiences-professionnelles-dans-son-cv.html) : actions, mots-clés, réalisations documentées et cohérence de présentation. Les recommandations d’omission d’anciens postes ne sont pas appliquées : l’utilisateur demande de tout conserver.
- [France Travail — Compétences à valoriser](https://www.francetravail.fr/candidat/vos-recherches/preparer-votre-candidature/accompagne-dans-sa-recherche/les-3-types-de-competences-a-v-1.html) : savoir-faire concrets exprimés avec des verbes d’action.
- [Université de Lorraine — Verbes d’action](https://www.univ-lorraine.fr/orientation-insertion-professionnelle/ressources/stage-emploi-et-alternance/lettre-de-motivation/les-verbes-daction/) : vocabulaire par activité ; les verbes ne sont pas interchangeables sans vérification du sens.

## Vérification

`node --test tests/*.test.mjs` pour les contrats et protections.

`QA_BASE=http://127.0.0.1:4318 node scripts/check-editorial.mjs` lance la simulation réelle sur un serveur de test déjà démarré. Chromium et le modèle Ollama doivent être disponibles. Le script utilise uniquement un CV fictif et un navigateur isolé ; il ne lit ni ne remplace le brouillon de l’utilisateur. Les preuves et PDF vont dans `work/editorial-qa/`.
