// Short HTTP requests let inference continue through proxy and network timeouts.
export async function runRewriteJob({ body, token, onProgress = () => {}, fetchImpl = fetch,
  pause = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now,
  requestId = crypto.randomUUID(), deadlineMs = 390000 }) {
  const started = now();
  const transient = message => Object.assign(new Error(message), { retryable: true });
  async function call(path, payload) {
    let response;
    try {
      response = await fetchImpl('/api/rewrite-jobs' + path, {
        method: payload ? 'POST' : 'GET', cache: 'no-store',
        headers: { 'x-cv-token': token, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
        signal: AbortSignal.timeout(10000),
      });
    } catch { throw transient('Connexion interrompue. Reprise automatique du suivi'); }
    if ([408, 502, 503, 504].includes(response.status)) throw transient('Connexion temporairement indisponible. Reprise automatique du suivi');
    if (!response.headers.get('content-type')?.includes('application/json'))
      throw Error('La connexion privée au site a expiré. Rouvrez CV Studio et reconnectez-vous si demandé. Votre CV est conservé.');
    let data;
    try { data = await response.json(); } catch { throw transient('Réponse interrompue. Reprise automatique du suivi'); }
    if (!response.ok) throw Error(data.error || `La demande a été refusée (HTTP ${response.status}). Votre CV est conservé.`);
    return data;
  }
  async function retry(operation) {
    while (now() - started < deadlineMs) {
      try { return await operation(); }
      catch (error) {
        if (!error.retryable) throw error;
        onProgress(error.message);
        await pause(2500);
      }
    }
    throw Error('Le suivi du calcul reste indisponible. Votre CV est conservé. Vérifiez votre connexion puis réessayez.');
  }
  let job = await retry(() => call('', { ...body, requestId }));
  while (now() - started < deadlineMs) {
    if (job.status === 'done') return job.result;
    if (job.status === 'failed') throw Error(job.error || 'Le traitement a échoué. Votre CV est conservé.');
    if (!job.id || job.status !== 'running') throw Error('Le suivi du calcul a renvoyé une réponse inattendue. Votre CV est conservé.');
    const seconds = Math.round((now() - started) / 1000);
    onProgress(`Calcul en cours · ${seconds} s écoulées. Vous pouvez laisser cette page ouverte`);
    await pause(2000);
    job = await retry(() => call('/' + encodeURIComponent(job.id)));
  }
  throw Error('Le calcul prend trop de temps. Votre CV est conservé ; réessayez dans quelques instants.');
}
