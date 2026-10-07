#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
: "${CV_PUBLIC_ORIGIN:?Définir l’origine HTTPS privée de ce Sprite}"
export AI_PROVIDER=ollama OLLAMA_MODEL=qwen2.5:3b OLLAMA_BASE_URL=http://127.0.0.1:11434
export CV_LISTEN_HOST=0.0.0.0 PORT=4317
export PLAYWRIGHT_BROWSERS_PATH="$PWD/work/browsers"
exec node server.mjs --production
