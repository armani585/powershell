#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
mkdir -p work
exec 9>work/ollama-setup.lock
flock -n 9 || exit 0
cv_model="$(node --input-type=module -e "import dotenv from 'dotenv';dotenv.config({path:'.env.local',quiet:true});process.stdout.write(process.env.OLLAMA_MODEL||'qwen2.5:3b');")"
if [[ ! "$cv_model" =~ ^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$ || "${cv_model,,}" == *cloud* ]]; then
  echo 'Modèle Ollama invalide : choisissez un modèle installé sur cette machine.'
  exit 1
fi
runtime_dir="$project_dir/work/ollama-runtime"
if command -v ollama >/dev/null 2>&1; then
  cv_ollama="$(command -v ollama)"
elif [[ -x "$runtime_dir/bin/ollama" ]]; then
  cv_ollama="$runtime_dir/bin/ollama"
else
  case "$(uname -m)" in
    x86_64) cv_arch=amd64 ;;
    aarch64|arm64) cv_arch=arm64 ;;
    *) echo 'Installez Ollama pour cette architecture depuis ollama.com.'; exit 1 ;;
  esac
  if ! command -v zstd >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y zstd
  fi
  mkdir -p "$runtime_dir"
  echo 'Téléchargement du moteur Ollama depuis sa distribution officielle…'
  curl --fail --location --retry 3 --output "$runtime_dir/ollama.tar.zst.part" "https://ollama.com/download/ollama-linux-${cv_arch}.tar.zst"
  mv "$runtime_dir/ollama.tar.zst.part" "$runtime_dir/ollama.tar.zst"
  tar --zstd -xf "$runtime_dir/ollama.tar.zst" -C "$runtime_dir"
  rm "$runtime_dir/ollama.tar.zst"
  cv_ollama="$runtime_dir/bin/ollama"
fi
export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_MODELS="$project_dir/work/ollama-models"
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_NUM_PARALLEL=1
if ! curl --silent --fail --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null; then
  nohup "$cv_ollama" serve >work/ollama.log 2>&1 </dev/null 9>&- &
fi
cv_ready=false
for attempt in {1..30}; do
  if curl --silent --fail --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null; then cv_ready=true; break; fi
  sleep 1
done
if [[ "$cv_ready" != true ]]; then echo 'Ollama ne répond pas. Consultez work/ollama.log.'; exit 1; fi
if ! "$cv_ollama" show "$cv_model" >/dev/null 2>&1; then
  echo "Téléchargement du modèle ${cv_model}. Cette première installation peut prendre plusieurs minutes."
  "$cv_ollama" pull "$cv_model"
fi
echo "Ollama est prêt avec ${cv_model}. Aucun crédit API OpenAI nécessaire."
