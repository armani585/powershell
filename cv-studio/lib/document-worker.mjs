import { parentPort, workerData } from "node:worker_threads";
import path from "node:path";
import { createRequire } from "node:module";
import mammoth from "mammoth";
const MAX_TEXT = 60000;
function validateText(text) {
  const clean = text
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
  if (!clean)
    throw new Error(
      "Aucun texte extractible. Pour un document scanné ou une image, utilisez un outil de reconnaissance de texte (OCR) puis importez le résultat en TXT.",
    );
  if (clean.length > MAX_TEXT)
    throw new Error(
      "Le document dépasse 60 000 caractères. Importez un document plus court.",
    );
  return clean;
}
async function extract({ name, buffer }) {
  const data = Buffer.from(buffer);
  const extension = path.extname(name).toLowerCase();
  let text = "";
  const notes = [];
  if (extension === ".txt") {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(data);
    } catch {
      throw new Error("Le fichier texte doit être enregistré en UTF-8.");
    }
  } else if (extension === ".docx" && data.subarray(0, 2).toString() === "PK") {
    try {
      const result = await mammoth.extractRawText({ buffer: data });
      text = result.value;
      if (result.messages.length)
        notes.push(
          "Certaines parties du document Word peuvent ne pas avoir été extraites. Vérifiez le texte.",
        );
    } catch {
      throw new Error(
        "Ce fichier Word est illisible ou endommagé. Essayez un export TXT ou PDF.",
      );
    }
  } else if (
    extension === ".pdf" &&
    data.subarray(0, 5).toString() === "%PDF-"
  ) {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdfRoot = path.dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
    const loading = getDocument({
      standardFontDataUrl: path.join(pdfRoot, "standard_fonts") + path.sep,
      cMapUrl: path.join(pdfRoot, "cmaps") + path.sep,
      cMapPacked: true,
      wasmUrl: path.join(pdfRoot, "wasm") + path.sep,
      data: new Uint8Array(data),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
    });
    try {
      const document = await loading.promise;
      if (document.numPages > 20)
        throw new Error(
          "Le PDF dépasse 20 pages. Importez uniquement les pages du CV.",
        );
      const pages = [];
      const empty = [];
      for (let index = 1; index <= document.numPages; index++) {
        const page = await document.getPage(index);
        const content = await page.getTextContent();
        const pageText = content.items
          .filter((item) => "str" in item)
          .map((item) => item.str + (item.hasEOL ? "\n" : " "))
          .join("")
          .trim();
        if (!pageText) empty.push(index);
        pages.push(pageText);
        text = pages.join("\n\n");
        if (text.length > MAX_TEXT)
          throw new Error(
            "Le document dépasse 60 000 caractères. Importez un document plus court.",
          );
        page.cleanup();
      }
      if (empty.length)
        notes.push(
          `Pages sans texte extractible : ${empty.join(", ")}. Les images et les scans nécessitent un OCR.`,
        );
      notes.push(
        "L’ordre des lignes peut changer dans un PDF à plusieurs colonnes. Le texte présent dans les images n’est pas extrait.",
      );
    } catch (error) {
      if (error.name === "PasswordException")
        throw new Error(
          "Ce PDF est protégé par un mot de passe. Importez une copie déverrouillée.",
        );
      if (/dépasse/.test(error.message)) throw error;
      throw new Error(
        "Ce PDF est illisible ou endommagé. Essayez un export TXT ou DOCX.",
      );
    } finally {
      await loading.destroy();
    }
  } else {
    throw new Error(
      "Import sans IA : PDF avec texte sélectionnable, DOCX ou TXT UTF-8, 8 Mo maximum. Les images nécessitent un OCR.",
    );
  }
  return { text: validateText(text), notes };
}
try {
  parentPort.postMessage({ ok: true, result: await extract(workerData) });
} catch (error) {
  parentPort.postMessage({ ok: false, error: error.message });
}
