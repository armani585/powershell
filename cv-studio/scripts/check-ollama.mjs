import assert from 'node:assert/strict';
import { resultSchema } from '../shared/model.mjs';
const base = 'http://127.0.0.1:4317';
try {
  const configResponse = await fetch(`${base}/api/config`, {signal: AbortSignal.timeout(5000)});
  assert.equal(configResponse.status, 200, 'CV Studio ne répond pas correctement.');
  const config = await configResponse.json();
  console.log(JSON.stringify({provider: config.aiProvider, ready: config.aiConfigured, message: config.aiMessage}));
  assert.equal(config.aiProvider, 'ollama', 'La version active utilise encore un autre moteur.');
  assert.equal(config.aiConfigured, true, 'Ollama ou son modèle ne sont pas prêts.');
  const form = new FormData();
  form.set('kind', 'cv');
  form.set('file', new Blob([`Camille Exemple
Cheffe de projet digital
camille@example.com
Lyon
Expérience : Atelier Fictif, 2022-2025. Coordination de projets et animation de réunions.
Formation : Master communication, 2020.
Compétences : gestion de projet, communication.
Langues : français, anglais.`], {type:'text/plain'}), 'cv-fictif.txt');
  console.log('Analyse réelle du CV fictif en cours (jusqu’à cinq minutes)…');
  const response = await fetch(`${base}/api/import`, {method:'POST', headers:{'x-cv-token':config.token}, body:form, signal:AbortSignal.timeout(310000)});
  const body = await response.json();
  if (!response.ok) throw Error(`Analyse refusée (HTTP ${response.status}) : ${body.error || 'consulter le journal du serveur'}`);
  const { resume } = resultSchema.parse(body);
  assert.equal(resume.name, 'Camille Exemple', 'Nom mal extrait.');
  assert.equal(resume.email, 'camille@example.com', 'Adresse fictive mal extraite.');
  assert.ok(resume.experiences.some(item=>/Atelier Fictif/i.test(item.organization)), 'Expérience fictive absente.');
  console.log('SUCCÈS : analyse réelle avec Ollama, nom, adresse et expérience vérifiés. Aucun brouillon modifié.');
} catch (error) {
  console.error('ÉCHEC : ' + error.message);
  process.exitCode = 1;
}
