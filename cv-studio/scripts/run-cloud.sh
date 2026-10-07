#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p work
# Keep the editor available while the local model downloads.
export AI_PROVIDER=ollama
export OLLAMA_BASE_URL=http://127.0.0.1:11434
export OLLAMA_MODEL=qwen2.5:3b
export PORT=4317
npx --yes pnpm@10 install --frozen-lockfile
nohup bash scripts/setup-ollama.sh >work/ollama-setup.log 2>&1 </dev/null &
echo 'Installation Ollama en arrière-plan : work/ollama-setup.log'
echo 'L’import de texte est disponible sans attendre le modèle.'
exec node server.mjs
