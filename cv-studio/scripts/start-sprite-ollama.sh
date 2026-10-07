#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export OLLAMA_HOST=127.0.0.1:11434 OLLAMA_MODELS="$PWD/work/ollama-models"
export OLLAMA_NUM_PARALLEL=1 OLLAMA_MAX_LOADED_MODELS=1 OLLAMA_NO_CLOUD=true
exec "$PWD/work/ollama-runtime/bin/ollama" serve
