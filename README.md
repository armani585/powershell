# Darija • Pas à pas

Application pédagogique francophone, centrée sur la compréhension et l’écoute du darija marocain.

## État au 23 septembre 2026

30 leçons structurées en cinq étapes, 156 exemples arabe/transcription/français, alphabet de 28 lettres, dix pistes audio Peace Corps intégrées. Révisions par marque-pages, progression locale, vitesse lente, boucle et enchaînement facultatif. Aucun microphone, abonnement ou API de synthèse vocale.

L’arabe littéraire est prévu séparément et n’est pas encore disponible. Ces leçons constituent un socle, pas une formation exhaustive ni un niveau certifié. Pas de validation linguistique par enseignant natif indépendant. Les pistes contiennent des consignes anglaises et ne sont pas synchronisées avec les exemples français.

## Sources

- Manuel : https://www.livelingua.com/course/peace-corps/darija-textbook---2011
- Audio et documents : https://www.fsi-language-courses.org/arabic/courses/peace-corps-arabic-moroccan-language-course/
- Correspondance officielle du cours : https://fsi-language-courses-media.nyc3.cdn.digitaloceanspaces.com/languages-peacecorps/Arabic-Moroccan/MO_Arabic_Language_Lessons.pdf

Crédit Peace Corps Morocco et ses enseignants. Le miroir indique que ces cours sont dans le domaine public. Les fichiers audio suivent exactement les groupes de leçons du guide introductif (1–3, 4–6, etc.). Ne pas confondre ces numéros avec ceux des 24 leçons françaises.

## Développement

Projet React/Vinext, pnpm. `pnpm build` pour construire, `node node_modules/typescript/bin/tsc --noEmit` pour vérifier les types. Utiliser le workflow Sites existant et préserver le project_id dans `.openai/hosting.json`. Ne pas créer de second Site.

Contenu : `app/data/lessons.json`, `app/data/audio.json`. Interface : `app/darija-app.tsx`, styles `app/globals.css`. Audio : `public/audio/`.

## Limites et prochaine étape

La progression est stockée uniquement dans le navigateur, sans synchronisation entre appareils. Connexion Internet nécessaire. Pour enrichir : faire relire les exemples par un enseignant marocain, enregistrer les six dialogues, préparer des écoutes graduées avec consignes françaises ; ne jamais annoncer un alignement phrase/audio sans l’avoir vérifié.

## Vérifications réalisées

Le 23 septembre 2026 : contrôle TypeScript ; lecture/pause audio dans le navigateur ; durées des dix MP3 contrôlées avec ffprobe ; ajout aux révisions et progression persistante après rechargement ; affichage et menu mobile contrôlés dans un cadre de 390 × 844 pixels. La correspondance des dix pistes et de leurs thèmes a été vérifiée dans la table des matières du guide original. Ces contrôles ne valent pas validation linguistique exhaustive.

## Mise à jour du 23 septembre 2026 — dialogues et révisions

Six dialogues écrits : rencontre, présentation, café, épicerie, chemin, heure. Arabe, transcription, traduction masquable, explication des points clés, compréhension facultative, retour aux leçons et lancement des pistes complémentaires. Les échanges sont des adaptations pédagogiques, pas des transcriptions audio. Les lignes référencent les expressions des leçons pour éviter les copies divergentes ; une adaptation du pronom féminin nti complète la présentation.

Révision guidée : jusqu’à cinq cartes choisies aléatoirement parmi les marque-pages ; à défaut, dernière leçon ouverte ou salutations pour un nouveau visiteur. Sens révélable, navigation et fin de séance sans note ni validation automatique de leçon. Une nouvelle séance peut proposer une autre sélection.

Contrôles de cette mise à jour : références de toutes les expressions/leçons/pistes ; TypeScript ; dans l’aperçu, ouverture du dialogue au café, traduction masquée, explication révélée, lancement audio et séance complète de cinq cartes jusqu’au message de fin. Aucun nouvel enregistrement ni validation par enseignant natif.

Prochaine priorité : audio des dialogues avec consignes françaises, vérifié par locuteur marocain ; puis extension progressive des situations et récits. Conserver les 24 leçons, les dix MP3, le stockage local et l’accès privé existants.

## Mise à jour suivante — écoute guidée et boucle de passage

Les dix pistes ont chacune un guide français (avant, pendant, consolidation) avec liens vers les leçons. Ces guides sont des repères thématiques, pas des traductions ni des sous-titres.

Le lecteur propose une répétition manuelle A–B : repères à la position courante ou secondes saisies, durée minimale une seconde, limites contrôlées contre la durée audio réelle. La boucle désactive la répétition intégrale et l’enchaînement. Changer de piste efface les repères. La répétition utilise les événements média du navigateur ; les limites ne sont pas un montage audio à la milliseconde. La hauteur du lecteur est prise en compte pour préserver l’accès au bas de page sur mobile.

Contrôles : dix guides complets et références valides, TypeScript ; dans l’aperçu, ouverture du guide, lecture, rejet A=10/B=5, boucle A=2/B=4 encore active après plusieurs secondes, commandes incompatibles désactivées et remise à zéro au changement de piste. Menu et fenêtre de sélection vérifiés dans un cadre 390 × 844. Aucun nouvel audio généré.

Fichiers : app/listening-tools.tsx et app/data/listening-guides.json. Prochaine priorité inchangée : des enregistrements adaptés en français avec prononciation darija vérifiée, avant alignement phrase par phrase. Aucun moteur de génération vocale adapté n’était disponible pendant cette étape.

## Mise à jour — nombres et lecture

Atelier des nombres de 1 à 100 : saisie ou sélection, forme darija, français, décomposition unité + u + dizaine, cas de tnayn dans 22/32/etc., tables 1–10, 11–19 et dizaines. Les formes de comptage suivent les pages 22–26 du manuel Peace Corps, relues dans la copie de travail. L’atelier ne décline pas les noms et ne génère pas d’audio pour le nombre choisi ; un bouton lance la piste complémentaire des nombres. Accès par « Les nombres » et depuis la leçon 7.

Alphabet : formes isolée/initiale/médiane/finale avec liaisons, six lettres non liantes à gauche identifiées. Atelier de lecture : كتاب, دار, أتاي, بسلامة ; lettres isolées de droite à gauche et explication des liaisons, hamza, lam-alif et ta marbuta. Cette aide ne remplace pas l’écoute.

Contrôles : TypeScript, génération non vide pour 100 nombres, vérification des cas de référence 1/2/11/19/21/22/32/42/80/99/100, français 71/80/81/91/100, refus des valeurs hors bornes/non entières. Dans l’aperçu : rejet de 101, saisie 32, bouton suivant désactivé à 100, fenêtres ba/alif et découpage bslama. Aucun nouvel audio ni validation linguistique native ajoutés.

Sources : lib/darija-numbers.ts, app/number-workshop.tsx, app/reading-workshop.tsx. Les 24 leçons restent inchangées.

Affichage et accès par le menu mobile contrôlés dans un cadre de 390 × 844 pixels pour cette mise à jour.

## Mise à jour — consolider au quotidien

Étape 5 ajoutée avec six leçons (25–30), six expressions chacune : proches, courses, vêtements/couleurs, hôtel, semaine/rendez-vous, besoins/obligation. Explications françaises adaptées des pages 38–40, 45–46, 73–76, 84–87, 95–96 et 110–111 du manuel Peace Corps. Les passages source ont été relus avant rédaction ; les exemples adaptés sont indiqués. Pas de reprise des anciens conseils culturels, tarifs ou règles commerciales du manuel.

Les 30 leçons totalisent 156 exemples. Identifiants et ordre des exemples des 24 premières leçons conservés pour les marque-pages. Le bilan de la leçon 24 n’annonce plus la fin du parcours. Ouverture d’une leçon sélectionne son étape, et les cinq onglets restent accessibles sur écran étroit. Pas de nouvel audio : seules les correspondances thématiques pertinentes réutilisent les pistes existantes. Les nouvelles adaptations restent sans relecture native indépendante.

Vérifications de cette étape : TypeScript ; six leçons par étape, 156 exemples complets et préservation exacte des anciens exemples ; leçon 25, marque-page bba et progression conservés après rechargement ; retour au parcours conservant l’étape 5 ; affichage dans un cadre mobile 390 × 844.


## Mise à jour suivante — quatre séances d’écoute automatiques

Quatre listes thématiques réutilisent les dix MP3 existants : premières rencontres (11 min 21 s), quotidien (5 min 03 s), achats (10 min 46 s), proches (7 min 57 s). Durées cumulées arrondies des métadonnées, à vitesse normale. Aucun nouvel enregistrement. Les conseils français ne sont pas des transcriptions synchronisées ; les consignes anglaises sont toujours annoncées.

La séance enchaîne automatiquement ses pistes puis s’arrête. Pause/reprise, passage manuel, arrêt, retour depuis le lecteur, guide français de la piste et indicateur de position. Les pistes passées ne sont pas ajoutées aux écoutes terminées. Le bilan compte les pistes arrivées à leur fin, sans prétendre mesurer la compréhension ni une écoute intégrale après déplacement du curseur. Une répétition de piste ou A–B suspend la progression. Recommencer remet le compteur et la première piste à zéro, coupe les répétitions ; choisir une autre piste quitte la séance. La séance traverse les changements de vue mais ne reprend pas après rechargement. Le stockage existant des leçons/marque-pages/écoutes est conservé.

Vérifications : TypeScript ; lancement, pause/reprise réels ; fin de piste via curseur natif puis enchaînement automatique vers la piste attendue ; passage manuel jusqu’au bilan (1 piste terminée sur 3), redémarrage, sortie de séance par choix manuel ; répétition puis redémarrage et arrêt ; affichage et navigation à 390 × 844 pixels. Fichier de contrôle mobile retiré avant construction.

Prochaine priorité éditoriale inchangée : obtenir des enregistrements avec consignes françaises et une relecture par un enseignant marocain, sans inventer d’alignement audio. État actuel : 30 leçons, 156 exemples, six dialogues écrits, dix MP3, quatre séances audio, nombres et lecture des lettres.


## Corrections — boucle et petits écrans

Défaut reproduit puis corrigé : une recherche native avant A quittait le passage répété. Le lecteur revient désormais à A lors d’un déplacement hors de [A, B[, y compris à la reprise ; la boucle reste active. Réouvrir les repères montre la sélection appliquée, pas les modifications abandonnées. Les demandes de lecture partagent un identifiant pour ignorer les erreurs de promesses anciennes après changement de piste ; une interruption normale de lecture n’affiche plus une fausse erreur.

Sur téléphone, le bloc d’introduction des écoutes dispose son bouton sous le texte pour éviter une colonne de quelques caractères. Le titre de la piste reste visible dans le lecteur. Les longs boutons des fiches peuvent revenir à la ligne.

Contrôles : TypeScript ; boucle 60–64 secondes, curseur déplacé avant A et retour effectif à 60 secondes ; réouverture après modification non appliquée (repères 60/64 conservés) ; changement de piste sans boucle ni erreur résiduelle ; lecteur sur écran 360 × 800. Aucun contenu linguistique ajouté ou nouvel enregistrement.


## Audit correctif — progression et navigation

Une progression JSON illisible ne peut plus être écrasée automatiquement au démarrage. Un échec de lecture ou d’écriture bloque les écritures suivantes et signale le fonctionnement temporaire en mémoire. Les identifiants restaurés sont validés et dédoublonnés, afin de conserver des compteurs cohérents. Le menu mobile possède maintenant un bouton explicite de fermeture ; les libellés accessibles du menu et des fenêtres sont en français. Les adaptations des primitives dialog/sheet/sidebar sont limitées à ces traductions d’accessibilité.

Contrôle réutilisable : `node --experimental-strip-types scripts/check-learning-data.mjs`. Il vérifie les références de 30 leçons, 156 expressions, six dialogues, dix guides et dix fichiers audio ; les nombres 1–100, les bornes et cas français particuliers ; la restauration d’une progression absente, valide, dupliquée ou endommagée. TypeScript et contrôle des espaces Git réussis.

Contrôles de navigateur : petit écran 320 × 800, navigation et fermeture explicite, nombres invalides/100, fenêtre de lettre et formes, découpage d’un mot, six dialogues successifs, masquage français et explication, ajout d’un marque-page et leçon parcourue conservés après rechargement, séance complète de révision, annulation des ajouts de test, lancement/passage/arrêt d’une séance audio, page méthode. Les précédents contrôles de boucle A–B et d’enchaînement automatique restent documentés ci-dessus. Aucun défaut fonctionnel connu restant dans les scénarios contrôlés ; cela ne remplace pas une validation linguistique native ni des essais sur tous les appareils.
