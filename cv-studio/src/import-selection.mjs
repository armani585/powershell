import { blankEntry, resumeSchema } from "../shared/model.mjs";
export const textTargets = [
  ["name", "Nom et prénom"],
  ["title", "Titre du CV"],
  ["email", "E-mail"],
  ["phone", "Téléphone"],
  ["location", "Ville ou région"],
  ["website", "Site professionnel"],
  ["profile", "Profil"],
  ["skills", "Compétences (une par ligne)"],
  ["languages", "Langues (une par ligne)"],
  ["interests", "Centres d’intérêt (un par ligne)"],
];
export function applySelection(resume, target, selection) {
  const text = selection.trim();
  if (!text) throw new Error("Sélectionnez un passage dans le texte extrait.");
  const next = structuredClone(resume);
  if (textTargets.some(([key]) => key === target)) {
    next[target] = ["skills", "languages", "interests"].includes(target)
      ? text
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : text;
  } else if (target === "new-experience" || target === "new-education") {
    next[target === "new-experience" ? "experiences" : "education"].push({
      ...blankEntry(),
      title: text,
    });
  } else {
    const match =
      /^(experiences|education):(\d+):(title|organization|period|location|bullets)$/.exec(
        target,
      );
    if (!match || !next[match[1]][Number(match[2])])
      throw new Error("Choisissez un champ du CV.");
    next[match[1]][Number(match[2])][match[3]] =
      match[3] === "bullets"
        ? text
            .split(/\n+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : text;
  }
  const parsed = resumeSchema.safeParse(next);
  if (!parsed.success)
    throw new Error(
      "Ce passage est trop long ou contient trop de lignes pour ce champ. Sélectionnez un passage plus court.",
    );
  return parsed.data;
}
