import { Worker } from "node:worker_threads";
const failure = (message, status = 400) =>
  Object.assign(new Error(message), { status });
export function extractDocument(file) {
  if (!file) return Promise.reject(failure("Sélectionnez un fichier."));
  if (file.buffer.length > 8 * 1024 * 1024)
    return Promise.reject(failure("Le fichier dépasse 8 Mo."));
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./document-worker.mjs", import.meta.url),
      {
        workerData: {
          name: file.originalname,
          buffer: new Uint8Array(file.buffer),
        },
        resourceLimits: { maxOldGenerationSizeMb: 256 },
      },
    );
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      if (error) reject(error);
      else resolve(result);
    };
    const timer = setTimeout(
      () =>
        finish(
          failure(
            "Ce document est trop complexe à lire. Essayez un export TXT ou un fichier plus court.",
            422,
          ),
        ),
      25000,
    );
    worker.once("message", (message) =>
      message.ok
        ? finish(null, message.result)
        : finish(failure(message.error)),
    );
    worker.once("error", () =>
      finish(
        failure(
          "Impossible de lire ce document. Essayez un fichier plus court ou un export TXT.",
          422,
        ),
      ),
    );
    worker.once("exit", () => {
      if (!settled)
        finish(
          failure(
            "La lecture du document a été interrompue. Essayez un export TXT.",
            422,
          ),
        );
    });
  });
}
