import { zodTextFormat } from "openai/helpers/zod";
const failure = (message, status = 503) =>
  Object.assign(new Error(message), { status });
export function createOllama({
  baseUrl = "http://127.0.0.1:11434",
  model = "qwen2.5:3b",
  timeoutMs = 300000,
  fetchImpl = fetch,
} = {}) {
  const url = new URL(baseUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "OLLAMA_BASE_URL doit désigner le serveur Ollama sur cette machine.",
    );
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(model) || /cloud/i.test(model))
    throw new Error(
      "Choisissez un modèle Ollama installé sur cette machine, sans service cloud.",
    );
  const endpoint = (path) => new URL(path, url).href;
  let busy = false;
  async function status() {
    try {
      const response = await fetchImpl(endpoint("/api/tags"), {
        signal: AbortSignal.timeout(1500),
        redirect: "error",
      });
      if (!response.ok) throw Error();
      const data = await response.json();
      const ready =
        data.models?.some(
          (item) =>
            [item.name, item.model].includes(model) ||
            [item.name, item.model].includes(model + ":latest"),
        ) || false;
      return {
        ready,
        message: ready
          ? `Ollama est prêt (${model}). Aucun crédit OpenAI utilisé.`
          : `Le modèle ${model} n’est pas encore installé. L’installation initiale peut prendre plusieurs minutes.`,
      };
    } catch {
      return {
        ready: false,
        message:
          "Ollama n’est pas encore démarré. L’édition du CV et le PDF restent disponibles.",
      };
    }
  }
  async function ask(schema, instructions, content, { textMode = false, requestTimeoutMs = timeoutMs } = {}) {
    if (busy)
      throw failure(
        "Une analyse est déjà en cours. Attendez sa fin avant de réessayer.",
        429,
      );
    if (content.some((item) => item.type !== "input_text"))
      throw failure(
        "Ce moteur analyse du texte. Importez un PDF avec texte sélectionnable, un DOCX ou un TXT.",
        400,
      );
    const format = zodTextFormat(schema, "cv_result").schema;
    const messages = [
      {
        role: "system",
        content:
          instructions + (textMode
            ? "\nRéponds uniquement par le texte réécrit, sans JSON, commentaire, guillemets ni balise."
            : "\nRespecte exactement ce schéma JSON : " + JSON.stringify(format)),
      },
      { role: "user", content: content.map((item) => item.text).join("\n\n") },
    ];
    const inputBytes = Buffer.byteLength(JSON.stringify(messages), "utf8");
    // Keep enough room for every input byte plus the bounded output. Small RH
    // passages need no 32K KV cache. Never silently truncate the source or offer.
    const outputLimit = textMode ? 2048 : 6000;
    const contextSize = textMode && inputBytes <= 6144 ? 8192
      : textMode && inputBytes <= 14336 ? 16384 : 32768;
    if (inputBytes > 22000)
      throw failure(
        "Ce CV ou cette offre est trop long pour ce modèle. Raccourcissez le document ou l’offre, puis réessayez.",
        413,
      );
    busy = true;
    try {
      const response = await fetchImpl(endpoint("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(Math.max(1, Math.min(timeoutMs, requestTimeoutMs))),
        body: JSON.stringify({
          model,
          messages,
          // RH has a tiny response contract, validated below. Avoid constrained
          // decoding entirely: even the generic JSON grammar can stall this
          // CPU runner before its first generated token.
          ...(textMode ? {} : { format }),
          stream: false,
          keep_alive: "5m",
          // Explicit, bounded CPU batches avoid the severe prefill stalls seen
          // with the default runner after a large import on the Sprite VM.
          options: { temperature: 0, num_ctx: contextSize, num_predict: outputLimit,
            num_thread: 4, num_batch: 128 },
        }),
      });
      if (response.status === 404)
        throw failure(
          `Le modèle ${model} est absent. Terminez son installation Ollama.`,
        );
      if (!response.ok)
        throw failure(
          "Ollama n’a pas pu analyser ce CV. Vérifiez la mémoire disponible et réessayez avec un document plus court.",
          502,
        );
      const data = await response.json();
      console.info("Ollama timing", JSON.stringify({ inputBytes, contextSize,
        promptTokens: data.prompt_eval_count, outputTokens: data.eval_count,
        prefillMs: Math.round((data.prompt_eval_duration || 0) / 1e6),
        generationMs: Math.round((data.eval_duration || 0) / 1e6) }));
      if (data.done !== true || data.done_reason === "length")
        throw failure(
          "La réponse Ollama est incomplète. Réessayez avec un document plus court.",
          502,
        );
      try {
        return schema.parse(textMode ? { text: data.message?.content?.trim() } : JSON.parse(data.message?.content));
      } catch {
        throw failure(
          "Ollama a produit une réponse invalide. Votre CV est conservé. Réessayez ou choisissez un modèle plus performant.",
          502,
        );
      }
    } catch (error) {
      if (error.status) throw error;
      if (["TimeoutError", "AbortError"].includes(error.name))
        throw failure(
          `Le moteur de rédaction n’a pas répondu en ${Math.ceil(Math.min(timeoutMs, requestTimeoutMs) / 1000)} secondes. Votre CV est conservé.` + (textMode ? " Les passages déjà traités seront réutilisés si vous relancez l’optimisation." : " Réessayez dans quelques instants."),
          504,
        );
      throw failure(
        "Impossible de joindre Ollama. Vérifiez que le moteur est démarré sur cette machine.",
      );
    } finally {
      busy = false;
    }
  }
  return { status, ask, model };
}
