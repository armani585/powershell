import { z } from 'zod';
import { resumeSchema } from '../shared/model.mjs';
const text = z.string().max(1000);
const entry = z.object({ id: z.number().int(), title: z.string().max(200), bullets: z.array(text).max(12) });
// Identical sentences in identical roles can share a wording, but every original
// position is kept in the CV. Only explicitly proposed edits are applied.
function rhGroups(source) {
  const groups = []; const keys = new Map();
  source.experiences.forEach((e, i) => e.bullets.forEach((text, j) => {
    const key = JSON.stringify([e.title, text]);
    let group = keys.get(key);
    if (!group) { group = { id: 'm' + groups.length, title: e.title, text, positions: [] }; groups.push(group); keys.set(key, group); }
    group.positions.push([i, j]);
  }));
  return groups;
}
export function rhSchema() {
  return z.object({ profile: z.string().max(3000).nullable(),
    edits: z.array(z.object({ id: z.string().max(30), text })).max(240),
  }).strict();
}
export function rhInput(source) {
  return { language: source.language, profile: source.profile, title: source.title,
    missions: rhGroups(source).map(({id,title,text}) => ({id,title,text})) };
}
export function expandRh(source, raw) {
  const result = rhSchema().parse(raw);
  const groups = new Map(rhGroups(source).map(g => [g.id, g]));
  const output = rewriteInput(structuredClone(source));
  const used = new Set();let changed = 0;
  const numbers = text => [...new Set(text.match(/\d+(?:[.,]\d+)*/g) || [])].sort().join('|');
  for (const edit of result.edits) {
    const original = groups.get(edit.id);
    if (!original || used.has(edit.id)) reject('La proposition contient une mission inconnue ou dupliquée. Elle a été refusée.');
    used.add(edit.id);
    if (original.text.trim() && !edit.text.trim()) reject('La rédaction RH a effacé une mission. Elle a été refusée.');
    if (numbers(original.text) !== numbers(edit.text)) reject('La rédaction RH a modifié les chiffres d’une mission. Elle a été refusée.');
    for (const [i,j] of original.positions) {
      output.experiences[i].bullets[j] = edit.text;
      if (edit.text !== original.text) changed++;
    }
  }
  if (result.profile !== null) {
    if (source.profile.trim() && !result.profile.trim()) reject('La rédaction RH a effacé le profil. Elle a été refusée.');
    if (numbers(source.profile) !== numbers(result.profile)) reject('La rédaction RH a modifié les chiffres du profil. Elle a été refusée.');
    output.profile = result.profile;
  }
  return { ...output, notes: [changed ? `${changed} formulation(s) de mission améliorée(s). Les autres missions sont conservées.` : 'Les formulations des missions ont été conservées.',
    output.profile !== source.profile ? 'Profil reformulé : relisez la proposition avant application.' : 'Profil conservé.'] };
}
export const rewriteSchema = z.object({
  title: z.string().max(200), profile: z.string().max(3000),
  experiences: z.array(entry).max(20), education: z.array(entry).max(15),
  skills: z.array(z.string().max(200)).max(40),
  languages: z.array(z.string().max(200)).max(15),
  interests: z.array(z.string().max(200)).max(15),
  notes: z.array(z.string().max(2000)).max(20),
});
export const rewriteInput = resume => ({ ...resume,
  experiences: resume.experiences.map((entry, id) => ({ ...entry, id })),
  education: resume.education.map((entry, id) => ({ ...entry, id })),
});
const reject = message => { throw Object.assign(new Error(message + ' Votre CV est conservé. Réessayez.'), { status: 502 }); };
export function mergeRewrite(source, raw, action) {
  const result = rewriteSchema.parse(raw);
  const translation = action === 'translate';
  const resume = { ...source, profile: result.profile,
    title: translation ? result.title : source.title,
    language: translation ? (source.language === 'fr' ? 'en' : 'fr') : source.language };
  for (const key of ['experiences', 'education']) {
    if (result[key].length !== source[key].length || result[key].some((e, i) => e.id !== i))
      reject('La proposition a supprimé, ajouté ou déplacé une expérience ou une formation. Elle a été refusée.');
    resume[key] = source[key].map((entry, i) => ({ ...entry,
      title: translation ? result[key][i].title : entry.title,
      bullets: result[key][i].bullets }));
  }
  for (const key of ['skills', 'languages', 'interests']) {
    if (translation && result[key].length !== source[key].length)
      reject('La traduction a changé le nombre de compétences, langues ou centres d’intérêt. Elle a été refusée.');
    resume[key] = translation ? result[key] : source[key];
  }
  if (translation) {
    const prose = r => JSON.stringify([r.title, r.profile, r.experiences.map(e => [e.title, e.bullets]), r.education.map(e => [e.title, e.bullets]), r.skills, r.languages, r.interests]);
    if (prose(resume) === prose(source)) reject('Le moteur a recopié le CV sans le traduire. La proposition a été refusée.');
  }
  // Reject newly invented numeric claims. Wording still requires human review.
  const numbers = value => JSON.stringify(value).match(/\d+(?:[.,]\d+)*/g) || [];
  const originalNumbers = new Set(numbers(source));
  if (numbers(resume).some(n => !originalNumbers.has(n)))
    reject('La proposition a ajouté des chiffres absents du CV. Elle a été refusée.');
  return { resume: resumeSchema.parse(resume), notes: result.notes };
}
