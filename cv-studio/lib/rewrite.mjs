import { z } from 'zod';
import { resumeSchema } from '../shared/model.mjs';
const text = z.string().max(1000);
const entry = z.object({ id: z.number().int(), title: z.string().max(200), bullets: z.array(text).max(12) });
const missionFields = source => Object.fromEntries(source.experiences.flatMap((e, i) => e.bullets.map((b, j) => [`e${i}_b${j}`, b])));
export function rhSchema(source) {
  return z.object({ rewrittenProfile: z.string().max(3000),
    missions: z.object(Object.fromEntries(Object.keys(missionFields(source)).map(key => [key, text]))).strict(),
    notes: z.array(z.string().max(2000)).max(20),
  });
}
export function rhInput(source) {
  return { profile: source.profile, title: source.title, missions: missionFields(source),
    context: source.experiences.map(({title,organization,period},id) => ({id,title,organization,period})) };
}
export function expandRh(source, raw) {
  const result = rhSchema(source).parse(raw);
  return { ...rewriteInput(source), profile: result.rewrittenProfile,
    experiences: source.experiences.map((e, i) => ({ id: i, title: e.title,
      bullets: e.bullets.map((_, j) => result.missions[`e${i}_b${j}`]) })), notes: result.notes };
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
