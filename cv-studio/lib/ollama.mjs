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
  async function ask(schema, instructions, content, { jsonMode = false, requestTimeoutMs = timeoutMs } = {}) {
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
          instructions + (jsonMode
            ? "\nRéponds avec les valeurs demandées, jamais avec un schéma JSON."
            : "\nRespecte exactement ce schéma JSON : " + JSON.stringify(format)),
      },
      { role: "user", content: content.map((item) => item.text).join("\n\n") },
    ];
    // A conservative UTF-8 byte bound leaves room in the 32K context for the answer.
    if (Buffer.byteLength(JSON.stringify(messages), "utf8") > 22000)
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
          format: jsonMode ? "json" : format,
          stream: false,
          keep_alive: "5m",
          options: { temperature: 0, num_ctx: 32768, num_predict: 6000 },
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
      if (data.done !== true || data.done_reason === "length")
        throw failure(
          "La réponse Ollama est incomplète. Réessayez avec un document plus court.",
          502,
        );
      try {
        return schema.parse(JSON.parse(data.message?.content));
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
          "L’analyse Ollama a dépassé cinq minutes. Essayez un document plus court ou davantage de ressources de calcul.",
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
