# Sources pour compléter Darija

Recherche du 3 octobre 2026. Les mentions « consulté » et « non vérifié » sont distinctes. Ce document n’est pas une validation linguistique du module.

## Résultat confirmé par les documents accessibles

Le [Darija Open Dataset (DODa)](https://github.com/darija-open-dataset/dataset) a été lu au commit `feb88ff23153283c47d83dd677b432fe0cbac15a`. C’est une ressource collaborative de texte darija–anglais, utile pour retrouver des mots, des graphies et des variantes. Ce n’est pas un dictionnaire de prononciation native certifiée.

Sa [licence à ce commit](https://github.com/darija-open-dataset/dataset/blob/feb88ff23153283c47d83dd677b432fe0cbac15a/LICENSE) déclare **Creative Commons Attribution-NonCommercial 4.0**. La redistribution/adaptation nécessite attribution, lien vers la licence et indication des changements ; l’usage commercial requiert une permission appropriée. Un projet éducatif n’est pas automatiquement non commercial.

Le [README](https://github.com/darija-open-dataset/dataset/blob/feb88ff23153283c47d83dd677b432fe0cbac15a/README.md) distingue les portions présentées comme humaines d’une extension synthétique. Les lignes synthétiques ne sont pas validées humainement selon le projet. Le README précise aussi que certaines parties restent en révision, notamment des phrases. « Humain » ne signifie donc pas « validé individuellement ». Ce statut déclaré ne remplace pas une relecture de chaque exemple destiné à l’enseignement.

Aucun fichier portant une extension audio `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a` ou `.opus` n’a été trouvé dans l’arbre Git inspecté. **Aucun enregistrement utilisable pour le site n’a donc été identifié dans ce dépôt.** Cette observation ne couvre pas d’éventuels services ou projets externes liés.

## Observation exploratoire : onze fiches rapprochées

Le détail, les fichiers source et les numéros d’enregistrements CSV (en-tête compté comme 1, première entrée comme 2) sont dans [sources-registry.json](sources-registry.json). Ces rapprochements concernent le vocabulaire ; ils ne valident pas les phrases, la segmentation pédagogique ni la prononciation.

| Fiche du module | Ce que le rapprochement apporte | Ce qui reste à vérifier |
| --- | --- | --- |
| Thé, porte, livre, chambre | Concordance de sens, graphie et transcription proposée avec des entrées sélectionnées | Audio natif, contexte et phrase entière |
| Droite | Graphie et variante latine présentes dans le lexique | Articulation et impératif dans la phrase |
| Gauche | Graphie présente, variantes latines différentes | Voyelle et consonne doublée dans notre repère |
| Tomates | Graphie et sens retrouvés, variantes latines différentes | Notre transcription abrégée et sa segmentation |
| Sucre | Plusieurs variantes et une graphie avec consonne doublée | Voyelles et gémination dans notre fiche |
| Eau | Transcription retrouvée, graphie source différente | Expliquer ou revoir la variante orthographique et l’homographie avec la négation |
| Pluie | Nom nu attesté, avec une autre convention de transcription pour ش | Article et phrase complète |
| Taxi | Une graphie différente est donnée | Choix de graphie, article et réalisation locale |

Une divergence ne prouve pas à elle seule une erreur. Les conventions de transcription diffèrent, et des variantes régionales ou orthographiques peuvent coexister. Les fiches de la version enrichie restent **non relues par un enseignant marocain** ; aucun indicateur de validation native n’a été changé.

## Sources candidates encore non vérifiées

| Ressource | Utilité recherchée | État réel de cette recherche |
| --- | --- | --- |
| [Peace Corps](https://www.peacecorps.gov/) | Retrouver la provenance institutionnelle du manuel et des pistes | Page refusée par le proxy ; aucune nouvelle vérification de droits |
| [Manuel Peace Corps sur Live Lingua](https://www.livelingua.com/course/peace-corps/darija-textbook---2011) | Alphabet, règles de lecture et situations ; référence déjà citée par le dépôt | Page inaccessible dans cette session |
| [Cours marocain sur FSI Language Courses](https://www.fsi-language-courses.org/arabic/courses/peace-corps-arabic-moroccan-language-course/) | Index des pistes et correspondance avec le manuel | Page et PDF référencé refusés ; aucun audio récupéré |
| [uTalk — arabe marocain](https://utalk.com/fr/store/arabic-moroccan) | Comparaison de méthode et de prononciation | Page et conditions non consultées ; aucune autorisation de copier des médias établie |
| [Loecsen — arabe marocain](https://www.loecsen.com/fr/cours-arabe-marocain) | Expressions de voyage et éventuels modèles d’écoute | Page et conditions non consultées |
| [Wikimedia Commons — recherche de prononciations](https://commons.wikimedia.org/wiki/Category:Moroccan_Arabic_pronunciation) | Rechercher des fichiers audio avec licence individuelle | Page inaccessible ; aucun fichier ni sa licence n’est confirmé |

Ces liens sont des pistes, **pas une liste d’audios vérifiés**. Une ressource accessible gratuitement n’autorise pas nécessairement sa copie. Pour Peace Corps, il faudra vérifier la provenance et les droits du document ou de l’enregistrement précis, sans présumer que tous les contenus d’un miroir ont le même statut.

## Blocage réseau et suite concrète

Les sept requêtes de collecte ont reçu `Tunnel connection failed: 403 Forbidden`. Les domaines nécessaires ont été ajoutés au **brouillon** des paramètres réseau, en conservant le préréglage existant. La sauvegarde n’a pas activé l’accès dans la machine : les essais qui ont suivi restent refusés.

Domaines enregistrés : `peacecorps.gov`, `www.peacecorps.gov`, `livelingua.com`, `www.livelingua.com`, `fsi-language-courses.org`, `www.fsi-language-courses.org`, `fsi-language-courses-media.nyc3.cdn.digitaloceanspaces.com`, `utalk.com`, `www.utalk.com`, `loecsen.com`, `www.loecsen.com`, `commons.wikimedia.org`, `upload.wikimedia.org`.

Après application des paramètres réseau dans l’environnement :

1. Retenter les pages du manuel et de l’index audio ; relever leur provenance et les conditions du fichier précis.
2. Établir une table phrase du module → passage réellement attesté → audio exact et durée. Ne jamais annoncer une correspondance mot/audio sur la seule base d’un thème commun.
3. Compléter la relecture des variantes signalées ci-dessus et des phrases en contexte ; traduire vers le français avec relecture, DODa étant principalement darija–anglais.
4. Si les pistes disponibles ne couvrent pas les nouveaux dialogues, faire enregistrer les phrases manquantes par un locuteur marocain avec permission explicite de diffusion. Ne pas remplacer cette étape par une voix arabe standard présentée comme du darija.
5. Documenter attribution et licence pour chaque média intégré.

Aucun audio nouveau n’a été téléchargé ni intégré. Cette recherche ne récupère pas non plus les fichiers du site de référence restés sur le PC Windows.

## Revue indépendante

Verdict : **partiellement confirmé**. Une seconde lecture a contrôlé les neuf empreintes de fichiers, les onze entrées sélectionnées et la licence. Les pages refusées, la prononciation et la relecture native restent non vérifiées. L’état actuel des données confirme l’absence de nouveaux audios et de validation native ; aucun état initial horodaté ne permet à cette revue indépendante d’auditer l’historique des modifications de l’application.


## Complément : corps, maison, commerces, nourriture et repères

La version 3 ajoute 54 fiches (124 au total), quatre situations (16 au total), cinq thèmes de lexique et un exercice de quartier. Le registre contient **32 rapprochements lexicaux supplémentaires** avec les fichiers DODa déjà consultés au même commit. Les sens anglais identifiés servent de repères ; les traductions françaises, graphies adaptées, notes et découpages restent des propositions éditoriales. L’entrée « pharmacy » de DODa, dont la formulation peut désigner le pharmacien selon l’usage, n’a pas été utilisée pour valider notre fiche صيدلية.

Attribution : **Darija Open Dataset et ses contributeurs**, [dépôt source](https://github.com/darija-open-dataset/dataset), [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Changements : traductions vers le français, choix de variantes graphiques et de transcription, segmentation et explications pédagogiques. L’attribution et la licence figurent aussi dans le pied de page, y compris dans le HTML autonome. Cette mention ne transforme pas les autres références bloquées en sources consultées.

Les phrases des nouvelles situations et les quatre exemples spatiaux ne sont pas attestés en entier par ces rapprochements. Les autres mots ajoutés restent des propositions éditoriales sans rapprochement documenté. Le plan est fictif ; ses trajets sont contrôlés techniquement, sans prétendre reproduire un quartier réel. Les nouveaux contenus n’ont pas fait l’objet de la revue indépendante décrite plus haut, qui portait seulement sur la première recherche.


## Complément : les animaux

La version 4 ajoute vingt fiches animales et réutilise la fiche du poisson : **21 mots dans le thème**, 144 dans le module, 17 situations et 68 expressions de situations. Une planche originale générée montre le chat, le chien, le cheval, le bélier, la vache et le dromadaire ; les formes arabes restent du texte Unicode.

Le fichier `semantic categories/animals.csv` a été consulté dans DODa au même commit. Le registre `animals_extension` conserve son empreinte SHA-256 et 21 rapprochements lexicaux avec les numéros d’enregistrements CSV. Les graphies de la vache, du lapin et du coq diffèrent des entrées sélectionnées ; elles sont signalées comme des adaptations éditoriales. Les termes génériques, le genre grammatical et les noms sexués (bélier/brebis) sont distingués dans les fiches.

Attribution et licence DODa identiques au complément précédent : **CC BY-NC 4.0**, traductions françaises, notes, choix graphiques et segmentation adaptés. Les quatre phrases de la situation animale sont des propositions pédagogiques ; aucune correspondance avec un audio n’est annoncée. Ce complément n’a pas reçu de relecture native ni de revue indépendante des sources.


## Complément : conjugaison

La version 5 ajoute six paradigmes, huit pronoms, 144 formes affirmatives réparties sur trois temps, leurs formes négatives et 18 impératifs. Le registre `conjugation_extension` conserve quatre empreintes de fichiers et 26 enregistrements consultés : les pronoms et six lignes sélectionnées dans chacun des fichiers `conjug_present.csv`, `conjug_past.csv` et `imperatives.csv` de DODa, au même commit. Les lignes des fichiers distincts sont choisies individuellement : leur indice n’est pas présumé aligné.

Ces tableaux sources sont en caractères latins. Les graphies arabes, les découpages grammaticaux, les traductions françaises et certaines voyelles sont des choix éditoriaux. Le module utilise sh plutôt que ch, q plutôt que 9, et distingue u / w selon la forme choisie. Certaines variantes des voyelles réduites diffèrent des cellules sélectionnées. Les futures avec ghadi et les négations ma…sh sont des constructions pédagogiques supplémentaires ; ces cellules ne les attestent pas.

Attribution DODa et licence **CC BY-NC 4.0** comme ci-dessus. La consultation ne certifie ni toutes les formes ni les phrases françaises. Le passé accompli n’équivaut pas à tous les temps passés français ; les formes du présent peuvent décrire une habitude ou une action en cours selon le contexte. Les variantes régionales (dont ta-) ne sont pas toutes représentées. Les remarques sur être, avoir et vouloir évitent de les présenter comme des verbes réguliers sur le modèle français.

Aucun audio et aucune validation native n’ont été ajoutés. Les contrôles portent sur l’intégrité des formes éditoriales, les marques du présent/futur, le placement de la négation, les réponses identiques entre personnes, les scores du quiz et l’interface mobile. Une relecture linguistique reste nécessaire ; ce complément n’a pas reçu de revue indépendante des sources.


## Complément : pays et couleurs

La version 6 ajoute vingt noms de pays, douze couleurs et six formes féminines : **182 fiches au total**, 19 situations et 76 expressions de situations. Les deux nouveaux thèmes proposent un quiz de six questions, les fiches de découpage et des révisions. Les six paires de couleurs rappellent que le genre suit le nom arabe, pas celui de sa traduction française.

Le fichier `semantic categories/colors.csv` de DODa a été consulté au même commit. Le registre `countries_colors_extension` conserve son empreinte et **25 rapprochements lexicaux** (pays et couleurs). Il ne prétend pas attester les vingt pays, les féminins ou les huit phrases. Certains noms sont des usages oraux et d’autres plus formels (notamment le Royaume-Uni). Les graphies, les repères écrits, les traductions françaises et la segmentation sont adaptés ; la licence DODa reste **CC BY-NC 4.0**. Les noms de pays ne sont pas présentés comme des noms d’habitants. Les nuanciers hexadécimaux sont des illustrations éditoriales approximatives, pas des couleurs linguistiquement normalisées.

Les vingt drapeaux proviennent de [flag-icons, Panayiotis Lipiridis et contributeurs](https://github.com/lipis/flag-icons), au commit `086f7e97d657358203916dbe84f61c2bccaa81eb`. Les SVG originaux 4×3 sont copiés sans modification. Le registre conserve les empreintes de chaque fichier. Leur licence MIT complète est incluse dans `FLAGS-LICENSE.txt` et dans un élément template du HTML autonome ; le pied de page cite le projet. Les drapeaux ne sont pas dessinés par IA. La planche générée sert d’illustration décorative des thèmes ; son globe n’est pas une carte de référence.

Les drapeaux sont intégrés en données SVG au fichier autonome. Le module n’a besoin d’aucun CDN pour les charger. Les quiz affichent le nom français et les réponses arabes en plus du repère visuel, afin de rester utilisables sans distinguer les couleurs. Les sources lexicales n’ont pas apporté d’audio et ce complément n’a pas reçu de validation native ni de revue indépendante des sources.


## Complément : mobilier

La version 7 ajoute quinze fiches et réutilise trois fiches existantes (chaise, table et lit), sans changer leurs identifiants de révision. Le module compte **197 fiches**, vingt situations et quatre-vingts expressions de situations. Le thème « Le mobilier » contient dix-huit meubles et accessoires, un quiz de six questions, une situation de quatre phrases et les révisions par thème.

Le registre `furniture_extension` conserve **dix rapprochements lexicaux** avec `syntactic categories/nouns.csv` de DODa au même commit : chaise, table, lit, bureau, tiroir, literie, tapis, coussin, miroir et couverture. Les traductions sont adaptées au contexte ; notamment la ligne « furniture » pour frash n’est pas traitée comme une équivalence universelle. Les emprunts (canapé, fauteuil, armoire, placard, rideau, lampe) comportent des variantes de consonnes, de voyelles et de graphies qui ne sont pas validées par ces dix lignes.

La licence DODa reste **CC BY-NC 4.0**, avec traductions françaises, notes et segmentation adaptées. Les six portraits sont originaux, générés pour le module ; les mots arabes sont du texte Unicode et les illustrations ne servent pas de modèle d’écriture. Les meubles sont distingués des accessoires et le bureau-meuble du bureau-lieu. Aucune validation native ou revue indépendante des sources de ce complément ; aucun audio nouveau.

## Expressions — version 8

Vingt formules courantes sont proposées avec contexte et réponse, à partir du lexique existant et de treize nouvelles fiches. Les traductions françaises et conseils d’usage sont des propositions éditoriales non relues par un locuteur marocain. Consultation de `x-tra/idioms.csv` du DODa au commit feb88ff23153283c47d83dd677b432fe0cbac15a : son contenu idiomatique ne constitue pas une validation de ces vingt formules et n’a pas été copié. Les expressions à portée religieuse sont signalées comme telles ; « b-sse77a » reçoit plusieurs sens contextuels. Aucun audio ni statut de validation native n’est ajouté.

## La famille — version 9

24 nouvelles fiches, deux fiches réutilisées (« mon frère », « ma sœur »), soit 26 entrées dans le thème. La version compte 234 mots et 21 situations (84 phrases), ainsi que les 20 expressions de l’atelier dédié. Comparaison lexicale avec DODa `semantic categories/family.csv`, commit feb88ff23153283c47d83dd677b432fe0cbac15a, CC BY-NC 4.0 ; références par enregistrement CSV dans le registre. Sens français, graphies, transcriptions, précisions sur les branches paternelle/maternelle et exemples sont adaptés et restent à relire. `rajli` et `7fida` ne sont pas attestés dans ce fichier précis ; ne pas les présenter comme validés par cette source. Illustration réutilisée du repas familial généré, sans assimilation des personnages à des liens de parenté précis. Aucun audio ni validation native ajouté.

## Vêtements, objets, métiers et corps — version 10

44 nouvelles fiches : 12 vêtements, 12 objets, 12 formes de métiers, 8 parties du corps. Réutilisation des mots existants : livre, clé, miroir, lampe, boucher et travail. Le corps atteint 23 entrées. Trois situations ajoutées, soit 24 situations / 96 phrases ; 278 fiches lexicales au total. Références DODa `syntactic categories/nouns.csv` au commit feb88ff23153283c47d83dd677b432fe0cbac15a, licence CC BY-NC 4.0. Seuls les enregistrements présents dans le registre ont été comparés ; les autres mots ne sont pas prétendus attestés par ce fichier. Traductions françaises, segmentation et exemples proposés éditorialement ; relecture native et audio toujours absents. Kswa traduit « tenue / vêtement », sans réduire au sens anglais dress du dataset. Les illustrations de boutique, travail et objets réutilisent les images déjà générées.

## Centre commercial — version 11

Quinze fiches nouvelles et six réutilisées. Trois scènes nouvelles complètent la scène shopping existante ; la question incomplète wash kayn est remplacée par une demande sur la taille déjà indiquée. Les nouveaux emprunts, graphies, découpages et phrases sont des propositions éditoriales non attestées individuellement par les sources précédemment consultées, et restent à relire. Cabine d’essayage explicitée par kabina dyal qyas ; flus signifie argent et n’est pas réduit au seul paiement en espèces. Illustration existante de boutique réutilisée. Aucun audio ni statut de validation native ajouté. Les 27 scènes de ce module autonome ne sont pas les 27 scènes du site Windows original absent du dépôt.

## Le marché — version 12

14 nouvelles fiches et 11 réutilisées. Deux scènes supplémentaires : quantités et prix. Les nouvelles graphies, transcriptions, sens et exemples sont des propositions éditoriales en attente de relecture native, non présentées comme attestées individuellement par les sources précédentes. Le module distingue légumes et couleur verte ; le contexte de négociation est expliqué sans en faire une règle universelle. Illustration générée du marché réutilisée. Aucun audio ajouté.

## Commander un taxi ou un repas — version 13

13 nouvelles fiches, réutilisation des mots existants (notamment homeward plutôt que dupliquer à la maison), quatre scènes. Nouvelles propositions éditoriales en attente de relecture native, sans attestation individuelle revendiquée des sources antérieures. Emprunts portion / boîte signalés. Les exercices préparent une conversation, sans réservation ni commande réelle. Illustrations taxi et restaurant réutilisées ; aucun audio ajouté.

## Le restaurant — version 14

Dix fiches nouvelles et douze réutilisées. Trois situations supplémentaires complètent le dialogue existant. Les nouveaux mots, emprunts, découpages et exemples sont des propositions éditoriales non attestées individuellement par les sources précédemment consultées ; relecture native nécessaire. 7sab expliqué comme addition dans ce contexte et compte / calcul ailleurs. Illustration restaurant réutilisée ; aucun audio ou statut de validation native ajouté.

## Tourisme — version 15

Quinze fiches nouvelles et huit réutilisées. Trois situations touristiques. Nouvelles propositions éditoriales non attestées individuellement par les sources précédentes : graphies, transcriptions, sens et phrases restent à relire. Les emprunts sont signalés, mdina contextualisée et les horaires / autorisations ne sont pas inventés. Illustration décorative de voyage réutilisée, sans prétendre cartographier les lieux. Aucun audio ni validation native ajouté.

## Transport et voyage — version 16

18 fiches nouvelles, huit réutilisées. Trois situations complètent transports. Propositions éditoriales en attente de relecture native, sans prétendre à une attestation individuelle par les références précédentes. Stop / mahata distingués par l’absence / présence d’article, quai / trottoir contextualisés. Les horaires, lignes et tarifs ne sont pas inventés. Image de mobilité existante réutilisée ; aucun audio ni validation native ajouté.

## Cuisiner — version 17

15 fiches nouvelles, neuf réutilisées et trois scènes. Nouvelles propositions éditoriales sans attestation individuelle revendiquée des références précédentes ; graphies, transcriptions, impératifs et formes féminines restent à relire. Les exemples ne sont pas une recette complète et ne prescrivent ni durée ni température. Poivre / poivron distingués, variantes de récipient et four explicitées. Illustration alimentaire existante réutilisée ; aucun audio ni validation native ajouté.

## Fruits et légumes — version 18

16 nouvelles fiches, douze réutilisées, deux situations. Comparaison avec DODa semantic categories/food.csv au commit feb88ff23153283c47d83dd677b432fe0cbac15a (CC BY-NC 4.0) ; références et empreinte du fichier dans le registre. Sens français, graphies, découpages et exemples adaptés, toujours sans relecture native ni audio. Orange / citron distingués et nombre grammatical contextualisé. Image du marché réutilisée.

## Bijoux — version 19

Dix fiches nouvelles, quatre réutilisées, deux scènes. DODa syntactic categories/nouns.csv (commit feb88ff23153283c47d83dd677b432fe0cbac15a, CC BY-NC 4.0) : or et argent métal comparés aux enregistrements 788 et 1025. Les autres mots, transcriptions, groupes et exemples restent des propositions éditoriales sans attestation individuelle revendiquée ni validation native. Neqra / flus distingués ; le genre de khatem expliqué. Image de boutique existante réutilisée, aucun audio ajouté.

## Garage automobile — version 20

14 fiches nouvelles, quatre réutilisées, deux scènes. DODa syntactic categories/nouns.csv (commit feb88ff23153283c47d83dd677b432fe0cbac15a, CC BY-NC 4.0) : voiture, roue, frein, moteur et batterie comparés ; références dans le registre. Les autres mots, graphies, sens et formulations restent éditoriaux et sans relecture native. Roue / pneu distingués ; tomobil traité au féminin dans les exemples. Aucun diagnostic mécanique proposé, aucun audio ajouté ; image de travail existante réutilisée.

## Police et plainte — version 21

15 fiches nouvelles, neuf réutilisées, trois scènes. DODa syntactic categories/nouns.csv (commit feb88ff23153283c47d83dd677b432fe0cbac15a, CC BY-NC 4.0) : police, plainte, vol, témoin, identité et accident comparés ; références dans le registre. Formes verbales, possessifs, graphies, repères sonores et phrases sont proposés éditorialement sans validation native. Vol et perte distingués ; aucune procédure, liste de justificatifs ou coordonnées d’urgence prétendument vérifiées. Illustration de travail existante réutilisée, aucun audio ajouté.

## Immobilier et notaire — version 22

18 fiches nouvelles, huit réutilisées, trois scènes. DODa syntactic categories/nouns.csv (commit feb88ff23153283c47d83dd677b432fe0cbac15a, CC BY-NC 4.0) : appartement, location, contrat, document, propriétaire, terrain comparés ; références dans le registre. Les lignes sale du dataset concernent des soldes et ne valident pas une vente immobilière. Les termes de notariat, formes verbales et exemples restent éditoriaux, sans validation native. Garantie et frais ne sont pas définis juridiquement ; les actes formels peuvent différer du darija parlé. Image de travail existante réutilisée, aucun audio ajouté.

## La plage — version 23

Douze fiches nouvelles, huit réutilisées, trois scènes. DODa syntactic categories/nouns.csv (commit feb88ff23153283c47d83dd677b432fe0cbac15a, CC BY-NC 4.0) : mer, serviette, natation, soleil et plage comparés ; détails au registre. Les autres graphies, repères écrits et phrases restent éditoriaux, sans relecture native. Aucune condition réelle de baignade renseignée. Image décorative de voyage réutilisée, aucun audio ajouté.

## Jours, mois et compter — version 24

DODa semantic categories/numbers.csv et time.csv, commit feb88ff23153283c47d83dd677b432fe0cbac15a, CC BY-NC 4.0 : fichiers consultés et empreintes conservés dans le registre. Jours, mois grégoriens, nombres de 0 à 20, dizaines, cent et mille ; exemple de construction unité + w + dizaine avec tnayin pour les composés en 2. Transcriptions, graphies et groupes adaptés éditorialement ; relecture native encore absente. Les nombres générés ne modélisent pas tous les accords avec les noms ni les systèmes locaux d’expression des prix. Illustration décorative de voyage réutilisée, aucun audio ajouté.

## PDF utilisateur — version 25

Michel Quitout, Parlons l’arabe dialectal marocain, L’Harmattan, 2001, ISBN 2-7475-1135-9. Consultation ciblée du scan, pas lecture intégrale. Six leçons de lecture originales et centaines 200–900 ; comptage interactif étendu à 999. Voir PDF-REFERENCE.md et sources-registry.json pour pages, empreinte, vérification et limites. PDF et OCR non redistribués.

## Consolidation — version 26

Six parcours et regroupement des thèmes ; scores de quiz et reprise de la dernière situation conservés dans ce navigateur. Ces changements ne valident aucune nouvelle forme linguistique. Préférence utilisateur appliquée : mots et phrases en lecture écrite, écoute réservée à l’alphabet. La synthèse facultative lit uniquement le nom des lettres avec une voix arabe disponible ; ce n’est ni un enregistrement marocain ni le phonème isolé.

## Version 28 — relecture en contexte

67 phrases reprises et 49 nouvelles formes avec article, pour 581 fiches incluant les variantes grammaticales. Les références et leur niveau d’accès sont détaillés dans [ACADEMIC-REFERENCES.md](ACADEMIC-REFERENCES.md) ; les corrections, inférences et limites dans [LINGUISTIC-REVIEW-PASS2.md](LINGUISTIC-REVIEW-PASS2.md).
