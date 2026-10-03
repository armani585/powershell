# Première relecture linguistique — 3 octobre 2026

Historique de la version 27. La [deuxième passe, version 28](LINGUISTIC-REVIEW-PASS2.md), traite ensuite les articles et les quantités signalés ci-dessous.

Cette passe éditoriale assistée par IA porte sur les 526 fiches initiales et les 252 phrases de situation, avec un examen des 20 expressions et des six tableaux de conjugaison. La comparaison aux références est ciblée sur les anomalies repérées : il ne s’agit pas d’une vérification documentaire de chaque entrée ni d’une validation par un locuteur natif. Les marqueurs `nativeReviewed` restent à `false`.

La version 27 corrige 12 fiches existantes, ajoute une forme féminine et modifie directement 11 phrases. Les corrections lexicales se répercutent aussi dans toutes les situations qui utilisent ces fiches. Le lexique compte donc 527 fiches, dont certaines sont des formes grammaticales ou des expressions, et non 527 mots de base distincts.

## Corrections appliquées

| Entrée | Avant → après | Motif et niveau de justification |
|---|---|---|
| Boutique | محلل → محلّ | Correction de graphie : la gémination se note par une shadda, pas par une lettre supplémentaire. DODa `nouns.csv`, entrée 652, atteste محل ; la transcription `me7ell` reste un choix éditorial. |
| Djellaba | جللابة → جلّابة | Correction éditoriale de la consonne doublée, sans changer le repère `jellaba`. |
| Chaussures | sbeat → sbat | Suppression d’une voyelle accidentelle ; la note mentionnait déjà sbat / sbbat. Pas de préférence régionale présentée comme universelle. |
| Interprète | murjim → mutarjim | Rétablissement du ت oublié dans le repère sonore de مترجم ; le registre formel est maintenant explicite. |
| Billet | بيية / biyeya → بيّي / biyyi | Quitout, p. 82, donne `el-biyyi` : correction du repère à partir de cette lecture. La graphie arabe proposée n’est pas attribuée au manuel. |
| Station | me7tta → m7etta | Cohérence avec la fiche existante `l-m7etta` ; découpage m / 7e / tt / a. Le manuel p. 82 atteste la base avec une autre convention phonétique. |
| Cheval | عاود → عود | Choix d’une graphie attestée dans DODa `nouns.csv`, entrée 770. La graphie concurrente du fichier `animals.csv`, entrée 17, est conservée dans la note : ce désaccord n’est pas masqué. |
| Perles | « une perle » → « des perles / la perle (matière) » | Sens collectif de `lulu` précisé ; le singulier et les usages commerciaux ne sont pas donnés comme confirmés. |
| Deux composé | « 3esh rin » → « 3eshrin » dans la note | Suppression d’un espace trompeur ; distinction entre `tnayin` composé et `juj` isolé. |
| Année | 3am we7da → 3am wa7ed | Accord masculin de عام, indépendamment du genre français. Note ajoutée à la fiche `year`. |
| Vingt dirhams | 3eshrin drahem → 3eshrin derhem | Nom au singulier après 20, selon le modèle du manuel p. 99. La phrase « dix dirhams » conserve le pluriel. |
| Événement féminin | weqe3 → weq3at dans deux situations | Accord avec `shfera` et `ksida`. Une fiche féminine distincte évite de changer le sens de la forme masculine existante. Phrases remises en ordre verbe–sujet pour introduire « un vol / un accident ». |
| Traductions françaises | « ce pantalon… », « cette chemise… », « cette voiture… » → « c’est un/une… » | Alignement sur les groupes nominaux indéfinis effectivement écrits. « Voici l’adresse » devient « Voici une adresse » ; la question sur une taille n’implique plus qu’une taille précise a été indiquée. |

Le journal exact avant/après est dans [linguistic-review-changes.json](linguistic-review-changes.json). Il permet de distinguer les changements de sens, de transcription, de segmentation et de commentaire.

## Références effectivement utilisées

- Michel Quitout, *Parlons l’arabe dialectal marocain*, L’Harmattan, 2001, PDF fourni par l’utilisateur : pages 82 et 99 relues visuellement pour cette passe ; pages 39, 63 et 98 consultées dans les étapes précédentes. La page 82 est utilisée pour le lexique, pas pour ses informations pratiques de transport de 2001. Le manuel entier n’a pas été relu.
- DODa, dépôt `darija-open-dataset/dataset`, commit `feb88ff23153283c47d83dd677b432fe0cbac15a` : `syntactic categories/nouns.csv`, entrées 32, 652 et 770 ; `semantic categories/animals.csv`, entrées 17 et 19. Numérotation des enregistrements, en-tête = 1. Source collaborative sous CC BY-NC 4.0, susceptible de contenir des erreurs et des variantes.
- Les autres corrections sont des décisions éditoriales expliquées ci-dessus ; elles ne sont pas présentées comme des citations ou comme une certification native. Aucun nouvel accès réussi à uTalk ou au manuel Peace Corps n’est revendiqué.

## Points ouverts, à traiter séparément

- **Articles en contexte** : plusieurs phrases assemblent un nom de dictionnaire sans article alors que le français est défini, par exemple `fin kouzina` / « Où est la cuisine ? ». Préparer des formes contextuelles comme `l-kouzina`, avec assimilation de l’article quand nécessaire, puis relire les phrases complètes. Les constructions « ce pantalon », « ce bus », etc. demandent également cette révision.
- **Quantités et emprunts** : les exemples avec `juj dyal biyyi` ou `tlata dyal bursiyun` nécessitent de vérifier les pluriels et les constructions usuelles. La règle générale du manuel ne suffit pas à établir le pluriel d’un emprunt donné. La scène de comptage le signale désormais.
- **Lexique à recouper** : `7laq` (boucles d’oreilles), `duvi` (devis), `lulu` (perles), graphies de `7awli` et `tari`, et appellations juridiques ou commerciales. Ne pas déduire une faute d’une seule différence avec une graphie française ou arabe standard.
- **Prononciation** : les groupes écrits ne sont pas toujours des syllabes. La reconstruction technique du mot ne prouve pas que chaque groupe est bien associé au son. Les voyelles brèves, les emphatiques et la durée des consonnes restent à vérifier avec un enseignant marocain.
- **Conjugaison** : la cohérence des six paradigmes a été examinée ; aucune nouvelle comparaison exhaustive forme par forme avec un manuel n’est revendiquée. Les variantes régionales et les emplois en contexte restent à examiner.

Ces points empêchent de présenter cette première passe comme une validation linguistique intégrale. Aucun score de quiz ni test logiciel ne mesure l’exactitude d’une prononciation.
