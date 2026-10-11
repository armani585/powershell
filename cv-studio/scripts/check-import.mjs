import assert from 'node:assert/strict';
const port = Number(process.env.CV_CHECK_PORT || 4317);
assert.ok(Number.isInteger(port) && port > 0 && port < 65536, 'Port invalide.');
const base = `http://127.0.0.1:${port}`;
try {
  const configResponse = await fetch(`${base}/api/config`, {signal: AbortSignal.timeout(5000)});
  if (!configResponse.ok) throw Error(`Serveur indisponible (HTTP ${configResponse.status}).`);
  const config = await configResponse.json();
  console.log(JSON.stringify({provider:config.aiProvider ?? 'ancienne version',ready:config.aiConfigured,message:config.aiMessage}));
  const sample = 'Camille Exemple\ncamille@example.com\nExpérience : Atelier Fictif, 2022–2025.';
  const form = new FormData();
  form.set('kind', 'content');
  form.set('file', new Blob([sample], {type:'text/plain'}), 'cv-fictif.txt');
  const response = await fetch(`${base}/api/import-text`, {method:'POST',headers:{'x-cv-token':config.token},body:form,signal:AbortSignal.timeout(30000)});
  if (response.status === 404) throw Error('Le serveur actif est trop ancien : redémarrer CV Studio après la mise à jour.');
  if (!response.ok) throw Error(`Import refusé (HTTP ${response.status}).`);
  const result = await response.json();
  assert.equal(result.text, sample, 'Le texte extrait diffère du document fictif.');
  console.log('SUCCÈS : fichier TXT importé et texte vérifié par le serveur actif. Aucun brouillon modifié. Analyse IA non testée.');
} catch (error) {
  console.error('ÉCHEC : ' + error.message);
  process.exitCode = 1;
}
