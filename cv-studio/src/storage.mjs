import { resumeSchema, designSchema } from "../shared/model.mjs";
export const DRAFT_KEY = "cv-studio-draft-v1";
export function parseBackup(text) {
  const data = JSON.parse(text);
  return {
    resume: resumeSchema.parse(data.resume),
    design: designSchema.parse(data.design),
  };
}
export function readDraft(storage) {
  try {
    const value = storage.getItem(DRAFT_KEY);
    return value
      ? { draft: parseBackup(value), error: null }
      : { draft: null, error: null };
  } catch {
    return {
      draft: null,
      error:
        "Le brouillon est illisible ou inaccessible. Les modifications restent en mémoire. Sauvegardez un fichier JSON avant de réinitialiser le brouillon.",
    };
  }
}
