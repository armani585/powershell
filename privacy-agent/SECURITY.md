# Sécurité et exploitation privée

## Frontières

L'authentification des jetons est déléguée à Streamlit/Authlib/OIDC ; `auth.authenticate`
ne doit recevoir que les claims déjà vérifiés de `st.user`. Autorisation via couple
issuer/subject et liste explicite des subjects. MFA et contrôle des comptes à imposer
chez l'IdP, pas supposés sur la seule présence d'OIDC. Expiration absolue ancrée au `iat`,
contrôle à chaque interaction et surveillance toutes les 30 secondes. Une copie déjà
vue ou exportée sur le poste de l'utilisateur ne peut pas être révoquée à distance.

Le contrôle d'accès précède tout accès aux données. Aucun identifiant de propriétaire
fourni par un champ utilisateur. Toutes les opérations SQLite filtrent le propriétaire ;
les contenus chiffrés incluent owner/id/kind/date limite authentifiés. Les modifications
utilisent une comparaison atomique contre l'ancienne valeur pour éviter l'écrasement
concurrent d'une validation. Les résultats Web sont du texte non fiable, jamais HTML
exécutable ni instructions à exécuter. Les sites résultats ne sont pas téléchargés.

Les téléchargements Streamlit via `/media` ne sont pas utilisés pour les données
sensibles : l'export est copiable dans la session authentifiée. Aucun cache global de
contenu utilisateur, aucune URL personnelle dans les journaux d'audit applicatifs.
Les logs de passerelle et de fournisseur doivent également être minimisés côté opérateur.

## Clés

`PRIVACY_VAULT_KEYS` est un tableau JSON de 1 à 8 clés Fernet, active d'abord.
`PRIVACY_VAULT_KEY` accepte une clé unique pour compatibilité. Pas de génération
silencieuse, pas de clé committée ou enregistrée dans SQLite. Le chiffrement protège
contre la lecture de la base seule, pas contre une compromission du serveur et des clés.

Rotation : sauvegarder de manière chiffrée avec politique d'expiration, ajouter la
nouvelle clé en tête en gardant les anciennes, redémarrer, puis exécuter
`SecureStore(path, owner).rotate_keys()` pour **chaque** propriétaire via une opération
administrative privée. Vérifier la lecture avec la nouvelle clé pour tous les dossiers
avant retrait des anciennes. Une rotation d'un seul compte n'est pas une rotation globale.
Ne supprimer les anciennes clés qu'après traitement/expiration des sauvegardes également.
Une perte de toutes les clés rend les données irrécupérables.

## Conservation et suppression

Résultats UI : 7 jours ; dossiers : 90 jours fixes ; événements : 30 jours. Modifier un
dossier ne renouvelle pas sa durée. Les enregistrements expirés sont supprimés avant
lecture et par `maintenance.py` toutes les heures (comptes inactifs inclus). Surveillance
obligatoire du service de maintenance. SQLite `secure_delete=ON`, mode journal DELETE,
fichier0600 ; volume et sauvegardes doivent être protégés indépendamment. L'effacement
SQLite ne garantit pas un effacement physique des snapshots/SSD ou copies exportées.

L'ancienne `privacy.db` de simulation est laissée intacte et n'est pas ouverte par la V2.
Toute base historique contenant des données réelles doit être traitée hors ligne selon
sa provenance ; ne jamais attribuer automatiquement ses lignes au premier compte connecté.
Les checkpoints de déploiement ne doivent pas prolonger indéfiniment la conservation.

## Déploiement

HTTPS et passerelle privée obligatoires ; Sprites `auth=sprite`, `private_access=admins`.
Ne pas changer ces réglages pour faciliter les tests. Docker non root, volume persistant,
port localhost, CORS/XSRF activés, télémétrie désactivée, détails d'erreur masqués.
Garder un seul processus applicatif et un service de purge ; quotas Brave process-local
10/compte/heure,100/processus/heure, réinitialisés au redémarrage. Plafond financier
et débit à configurer aussi dans le compte Brave. L'API Brave n'est jamais appelée
sans activation serveur, clé, consentement utilisateur exact et contrôle de quota.

## Risques résiduels

Pas d'audit indépendant ou de certification RGPD. Les tests synthétiques n'attestent pas
la configuration effective de l'IdP, du MFA, du prestataire Brave, des logs cloud ou des
sauvegardes. Les administrateurs du serveur peuvent lire les données en disposant des
clés. Révocation IdP à vérifier auprès du fournisseur ; retirer un subject de l'allowlist
révoque l'accès applicatif à la prochaine interaction/revalidation. Aucun mécanisme
d'envoi réel n'est implémenté : la validation humaine autorise seulement la copie.
