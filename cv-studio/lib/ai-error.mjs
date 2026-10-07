// Interpret provider error codes without exposing request data or credentials.
export function aiErrorMessage(error) {
  const code = error.code || error.error?.code;
  if (error.status === 429) {
    if (code === 'insufficient_quota' || code === 'billing_hard_limit_reached') {
      return 'Le crédit ou le budget de votre projet API OpenAI est insuffisant. Vérifiez sa facturation sur platform.openai.com. L’abonnement ChatGPT ou Codex est distinct. Vous pouvez continuer à modifier votre CV et à exporter le PDF sans IA.';
    }
    if (code === 'rate_limit_exceeded') {
      return 'Trop de demandes ont été envoyées à OpenAI en peu de temps. Attendez un moment, puis réessayez. Cela ne signifie pas que vos crédits sont épuisés.';
    }
    return 'OpenAI a limité cette demande. Réessayez plus tard ou vérifiez les limites de votre projet API. Cette réponse ne permet pas de confirmer que vos crédits sont épuisés.';
  }
  if (error.status === 401) return 'Clé OpenAI refusée. Vérifiez la configuration du serveur.';
  if (error.status === 403) return 'Le projet OpenAI n’a pas accès à ce modèle.';
  return 'La demande OpenAI a échoué. Réessayez ou vérifiez le modèle configuré.';
}
