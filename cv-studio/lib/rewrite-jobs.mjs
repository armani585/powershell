import { createHash, randomUUID } from 'node:crypto';
const failure = (message, status) => Object.assign(new Error(message), { status });
// Results stay only in this process, with a bounded retention period.
export function createRewriteJobs({ execute, now = Date.now, retentionMs = 600000, maxJobs = 12 }) {
  const jobs = new Map();
  const requests = new Map();
  const prune = () => {
    for (const [id, job] of jobs) if (job.finishedAt !== undefined && now() - job.finishedAt > retentionMs) {
      jobs.delete(id); requests.delete(job.requestId);
    }
  };
  const view = job => ({ id: job.id, status: job.status,
    ...(job.status === 'done' ? { result: job.result } : {}),
    ...(job.status === 'failed' ? { error: job.error } : {}),
  });
  function start(requestId, input) {
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId || '')) throw failure('Identifiant de demande invalide.', 400);
    prune();
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const previous = jobs.get(requests.get(requestId));
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw failure('Cette demande correspond à un autre contenu.', 409);
      return view(previous);
    }
    if ([...jobs.values()].some(job => job.status === 'running')) throw failure('Une demande est déjà en cours. Attendez sa fin avant de réessayer.', 429);
    if (jobs.size >= maxJobs) {
      const oldest = [...jobs.values()].sort((a, b) => a.finishedAt - b.finishedAt)[0];
      jobs.delete(oldest.id); requests.delete(oldest.requestId);
    }
    const job = { id: randomUUID(), requestId, fingerprint, status: 'running' };
    jobs.set(job.id, job); requests.set(requestId, job.id);
    // Respond before waiting for inference. Repeated submissions reuse this job.
    Promise.resolve().then(() => execute(input)).then(result => {
      job.result = result; job.status = 'done';
    }, error => {
      job.error = error.status && error.status < 600 ? error.message : 'Le traitement a échoué. Votre CV est conservé. Réessayez.';
      job.status = 'failed';
    }).finally(() => { job.finishedAt = now(); });
    return view(job);
  }
  function get(id) {
    prune();
    const job = jobs.get(id);
    if (!job) throw failure('Cette demande a expiré ou le serveur a redémarré. Votre CV est conservé ; relancez l’action.', 404);
    return view(job);
  }
  const timer = setInterval(prune, Math.min(retentionMs, 60000)); timer.unref();
  return { start, get, close: () => clearInterval(timer) };
}
