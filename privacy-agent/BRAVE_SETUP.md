# Préparation Brave Search API

État au 8 octobre 2026 : aucun compte API ni clé disponible, d'après l'utilisateur.
Le serveur ne contient pas de clé Brave et conserve `PRIVACY_ENABLE_EXTERNAL_SEARCH=0`.
Aucune requête réelle n'a été effectuée. L'ouverture de l'espace privé après connexion
Google est désormais confirmée par l'utilisateur.

## Compte et coût

Créer son propre compte sur https://api-dashboard.search.brave.com/register.
La page officielle https://api-dashboard.search.brave.com/app/plans annonce Search
à 5 USD pour1000 requêtes et5 USD de crédits mensuels offerts, avec fonctionnement
prépayé. Ces indications ne garantissent pas les conditions applicables au compte
ni une absence de coût. Vérifier l'offre dans le tableau de bord avant activation.
N'acheter aucun crédit et n'activer aucune recharge automatique sans accord explicite.
La création du compte, son mot de passe et les éventuelles informations de paiement
restent à saisir par l'utilisateur directement chez Brave.

## Conservation des résultats

La FAQ https://brave.com/search/api/ indique qu'un forfait doit accorder explicitement
le droit de stocker tout ou partie des résultats. L'application refuse donc par défaut
leur enregistrement. `PRIVACY_BRAVE_STORAGE_ALLOWED=1` n'est autorisé qu'après vérification
contractuelle de ce droit. Ce contrôle ne supprime pas les résultats déjà conservés.
L'affichage temporaire et la transmission de la requête restent soumis à la notice,
au contrat fournisseur et au consentement explicite de l'utilisateur.

## Installation de la clé

Ne pas déposer la clé dans Git, une capture, un ticket ou la conversation.
Utiliser le terminal privé du serveur, sous le compte de service. Depuis le dossier
`privacy-agent` de la release active, saisir la clé sans affichage avec :

```sh
/home/sprite/privacy-venv-v2/bin/python - <<'PY'
import getpass
import warnings
from pathlib import Path
from google_setup import _load_runtime, _runtime, _write_private

warnings.simplefilter('error', getpass.GetPassWarning)
runtime = Path('/home/sprite/privacy-config/runtime.env')
values = _load_runtime(runtime)
token = getpass.getpass('Clé Brave (saisie masquée) : ')
if not token or len(token) > 4096 or any(ord(c) < 33 or ord(c) > 126 for c in token):
    raise SystemExit('Format de clé refusé ; aucune valeur affichée')
values['BRAVE_SEARCH_API_KEY'] = token
values['PRIVACY_ENABLE_EXTERNAL_SEARCH'] = '0'
values['PRIVACY_BRAVE_STORAGE_ALLOWED'] = '0'
_write_private(runtime, _runtime(values), replace=True)
print('Clé enregistrée ; recherche et conservation restent désactivées.')
PY
```

Le terminal doit permettre une saisie masquée ; sinon la commande échoue sans
revenir à une saisie visible. L'import conserve les autres paramètres, notamment
l'allowlist Google et les clés de chiffrement. Il ne contacte pas Brave.

## Recette avant activation

1. Confirmer le forfait, le solde, les conditions de conservation et de confidentialité.
2. Vérifier les protections de coût côté fournisseur. Les limites locales10/utilisateur/h
   et100/processus/h ne constituent pas un plafond financier et repartent après redémarrage.
3. Après configuration et redémarrage autorisés, soumettre seulement la requête non
   personnelle `site:example.com Example Domain`, avec un nouveau consentement explicite.
4. Vérifier la réponse réelle, le rejet sans consentement et l'absence d'enregistrement
   tant que les droits fournisseur ne sont pas confirmés. Ne pas relancer automatiquement.
5. Mettre à jour le rapport en séparant ce test réel des tests de transport simulé.

Sans clé et conditions de coût validées, la recherche reste désactivée. Le suivi des
dossiers RGPD manuels reste utilisable, sans envoi automatique.
