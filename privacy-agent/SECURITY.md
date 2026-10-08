# Politique de sécurité — Privacy Agent V1

## Portée
Cette version contient exclusivement des exemples fictifs et ne transmet aucune demande RGPD. L'accès au Sprite doit rester `auth=sprite` et `private_access=admins`.

## Limites connues
- Streamlit ne fournit pas ici de connexion utilisateur intégrée : l'authentification dépend entièrement de la passerelle privée Sprites.
- Ne jamais exposer directement le port 8501 sur Internet.
- SQLite est conservé dans le système de fichiers du Sprite et n'est pas chiffré par l'application.
- Aucune recherche réelle ni suppression réelle n'est implémentée.
- Les résultats des tests statiques ne constituent pas un audit de sécurité.

## Avant la V2
1. Tester l'accès non authentifié et les droits du compte.
2. Définir une politique de conservation et chiffrement des données réelles.
3. Ajouter une liste blanche des domaines et des contrôles contre les instructions malveillantes issues du Web.
4. Imposer une approbation humaine explicite avant tout envoi.
5. Ajouter des tests fonctionnels et un journal d'audit sans données sensibles.
