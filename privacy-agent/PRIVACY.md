# Protection des données — Privacy Agent

## Périmètre actuel

Cette version est destinée à une utilisation privée et à des essais avec des données fictives. Aucun envoi de demande RGPD n'est implémenté. L'autorisation de développer, de tester ou de déployer dans un espace privé ne constitue pas une autorisation de collecter des données personnelles réelles ni de publier le service. Les tests emploient uniquement des identités synthétiques et des URL `example.org`.

La présence de contrôles techniques ne constitue pas une certification de conformité RGPD. Avant toute utilisation réelle, l'exploitant doit identifier le responsable du traitement, son contact pour l'exercice des droits, les finalités, les bases légales, les destinataires, les durées et les lieux de traitement. Ces informations organisationnelles ne peuvent pas être déduites du dépôt et restent à renseigner.

## Finalités et données

L'application aide l'utilisateur à examiner des résultats publics, à préparer une demande d'effacement et à suivre ses propres démarches. Un résultat de moteur de recherche ou une correspondance de mots ne prouve ni l'identité d'une personne, ni la présence effective de données chez un organisme, ni l'applicabilité du droit à l'effacement.

Les dossiers peuvent contenir l'organisme destinataire, une URL, le texte du courrier, les dates et états de suivi et une trace de validation. Ils sont rattachés au sujet authentifié et stockés chiffrés. Les termes et résultats de recherche conservés en mémoire de session doivent être effacés à la déconnexion ou au changement d'utilisateur. Les journaux applicatifs doivent se limiter aux identifiants opaques et aux codes d'événement, sans requête, courrier, token, clé, adresse électronique ou extrait de résultat.

Le fournisseur d'identité et l'infrastructure cloud disposent de leurs propres métadonnées d'accès et journaux. Le chiffrement applicatif ne chiffre pas ces journaux, les identifiants opaques de propriétaire, les identifiants de ligne ni les échéances techniques de conservation.

## Recherche externe et choix explicite

La recherche utilise exclusivement l'API officielle Brave Search lorsque sa configuration serveur l'active. Avant chaque appel, l'interface présente la requête exacte et le fournisseur et exige une confirmation explicite non cochée par défaut. La requête est transmise à Brave seulement lors de l'action volontaire de recherche ; elle peut contenir une donnée personnelle si l'utilisateur en saisit une. Le test du connecteur est réalisé avec une réponse simulée sans transmettre de données réelles.

Le retrait du choix ou l'effacement de la session empêche de nouvelles recherches consenties mais ne rappelle pas une requête déjà reçue par un fournisseur. L'exploitant doit vérifier la documentation contractuelle et la politique de conservation de Brave, les sous-traitants, les lieux de traitement et, si nécessaire, les garanties de transfert hors EEE. Ces garanties ne sont pas démontrées par le code. Les liens externes choisis volontairement par l'utilisateur exposent aussi au site concerné des données de connexion.

La confirmation de transmission au moteur est un contrôle technique de volonté explicite. Elle ne détermine pas, à elle seule, la base légale de tous les traitements effectués par l'exploitant au sens de l'article 6 du RGPD.

## Revue humaine des demandes

Le cycle est : brouillon → validation humaine du contenu exact → copie manuelle → attestation d'envoi manuel → réponse reçue → clôture. La validation couvre le destinataire, l'URL et le corps du courrier, associés à l'identifiant et à la révision du dossier. Une modification invalide cette validation et exige une nouvelle revue. La copie du courrier validé est bloquée sans validation valide. La validation n'envoie rien.

Le validateur doit vérifier l'identité du demandeur, le canal officiel du destinataire, la réalité de la trace, les motifs et les éventuelles exceptions à l'effacement. Ne pas joindre de pièce d'identité par défaut : toute vérification d'identité supplémentaire doit être justifiée et proportionnée. L'article 17 ne confère pas un droit absolu à l'effacement ; une conservation peut notamment rester nécessaire pour une obligation légale, la liberté d'expression ou des droits en justice.

L'état `sent_manual` résulte uniquement de l'attestation explicite d'un utilisateur et ne prouve ni l'envoi ni la remise. L'application ne possède aucune fonction d'envoi d'e-mail ou de dépôt de formulaire RGPD. Pendant les essais, une attestation représente uniquement un événement fictif.

## Dates et rappels

Le rappel est calculé à un mois calendaire de la date de réception par l'organisme, avec adaptation au dernier jour du mois (31 janvier → 28 ou 29 février). Sans date de réception renseignée, la date d'envoi sert seulement d'estimation et l'échéance est signalée comme provisoire. Les rappels s'affichent dans l'application dès sept jours avant l'échéance, puis tant qu'elle est dépassée. Aucun rappel n'est transmis par messagerie.

Ce calcul est indicatif : il ne traite pas les règles sur jours non ouvrés, la complexité, les demandes multiples, une éventuelle prolongation de deux mois prévue à l'article 12 § 3, ni les incidences d'une vérification d'identité. Une réponse reçue ou une clôture arrête les rappels ; leur enregistrement ne certifie pas que la réponse satisfait juridiquement la demande. L'utilisateur doit contrôler les dates, conserver les justificatifs nécessaires et ajuster son suivi en dehors de l'application si une situation particulière l'exige.

## Conservation et suppression

Le stockage conserve les objets pendant 7 jours par défaut. L'interface conserve les résultats pendant 7 jours, les événements d'audit pendant 30 jours et les dossiers RGPD pendant 90 jours. Le plafond technique est de 90 jours pour les seuls dossiers de type `request` et de 30 jours pour les autres objets. L'échéance est fixée à la création ; une modification, une validation, un changement de statut ou une rotation de clé ne la repousse pas. Cette limite reste susceptible d'être plus courte que certains traitements prolongés d'une demande RGPD : l'utilisateur doit vérifier l'expiration et, si nécessaire, conserver son export dans son propre espace sécurisé. Un dossier expiré n'est pas récupérable depuis l'application.

Les objets expirés sont purgés à l'accès au stockage. Le service `python maintenance.py` purge toutes les heures et doit être supervisé ; une exécution ponctuelle `python secure_store.py --purge CHEMIN_BASE` est également disponible pour supprimer aussi les objets des utilisateurs inactifs. Sans cette tâche effectivement configurée et vérifiée, un compte inactif peut laisser des objets chiffrés au-delà de leur échéance ; leur consultation est néanmoins refusée après expiration.

L'utilisateur peut supprimer ses objets ou l'ensemble de son espace sans affecter un autre utilisateur. La suppression est exécutée dans SQLite avec `secure_delete` activé et le journal de transaction en mode `DELETE`. Cette mesure ne garantit pas un effacement physique des blocs d'un SSD, des instantanés cloud ou des sauvegardes historiques. L'exploitant doit appliquer aux sauvegardes une durée documentée, un accès restreint et une procédure qui réapplique les suppressions avant toute remise en service après restauration. L'application ne supprime pas les fichiers que l'utilisateur a téléchargés, les données du fournisseur d'identité, les journaux cloud ou les informations déjà transmises à un moteur.

## Contrôle d'accès et clés

L'identité provient d'OIDC, avec vérification de l'émetteur HTTPS et d'une liste d'identifiants de sujet autorisés. Les adresses électroniques ne servent pas de clé d'isolation. La durée absolue de session est limitée ; l'expiration et le changement de compte doivent effacer l'état de session. Le propriétaire est déterminé côté serveur à partir du couple émetteur/sujet authentifié, jamais depuis un champ libre du navigateur. Les lectures, modifications et suppressions sont limitées à ce propriétaire.

Les clés de chiffrement sont fournies par le gestionnaire de secrets serveur, séparées de la base et du dépôt Git. `PRIVACY_VAULT_KEYS` est une liste JSON ordonnée dont la première clé chiffre les nouvelles écritures et dont les suivantes permettent la lecture durant une migration ; `PRIVACY_VAULT_KEY` reste une configuration compatible pour une clé unique. Aucune clé implicite n'est créée au démarrage. La rotation doit migrer tous les propriétaires avant retrait d'une ancienne clé et doit prendre en compte les sauvegardes. Perdre la seule clé de déchiffrement rend les données inaccessibles ; compromettre le serveur et ses clés peut exposer les données malgré leur chiffrement au repos.

## Avant tout traitement réel

L'exploitant doit compléter la notice d'information, vérifier les contrats et garanties des prestataires, définir les procédures de réponse aux droits et d'incident, et déterminer si une analyse d'impact est nécessaire selon les traitements envisagés. L'accès doit rester privé, avec HTTPS, un fournisseur d'identité configuré et une authentification multifacteur imposée par celui-ci. Une validation technique des parcours, de l'isolation, des refus d'accès, de la purge et de la restauration reste nécessaire dans l'environnement effectivement déployé.

Références : [RGPD, articles 5, 6, 12 à 17, 25, 28, 32 et 35](https://eur-lex.europa.eu/eli/reg/2016/679/oj), [CNIL — droit à l'effacement](https://www.cnil.fr/fr/le-droit-leffacement-supprimer-vos-donnees-en-ligne).
