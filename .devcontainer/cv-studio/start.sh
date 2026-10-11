#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../cv-studio" && pwd)"
cd "$project_dir"
mkdir -p work
cv_ai_provider="$(node --input-type=module -e "import dotenv from 'dotenv';dotenv.config({path:'.env.local',quiet:true});process.stdout.write(process.env.AI_PROVIDER||'ollama');")"
if [[ "$cv_ai_provider" == ollama ]]; then
  nohup bash scripts/setup-ollama.sh >work/ollama-setup.log 2>&1 </dev/null &
fi
cv_port="$(node --input-type=module -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local',quiet:true}); const p=Number(process.env.PORT||4317); if(!Number.isInteger(p)||p<1||p>65535)process.exit(1); process.stdout.write(String(p));")"
cv_url="http://127.0.0.1:${cv_port}/api/config"
if curl --silent --fail --max-time 2 "$cv_url" >/dev/null; then
  echo "CV Studio est déjà actif sur le port ${cv_port}."
  exit 0
fi
nohup node server.mjs > work/codespace-server.log 2>&1 < /dev/null &
cv_pid=$!
printf '%s\n' "$cv_pid" > work/codespace-server.pid
for attempt in {1..30}; do
  if curl --silent --fail --max-time 2 "$cv_url" >/dev/null; then
    echo "CV Studio est prêt. Ouvrez le port ${cv_port} dans l’onglet Ports."
    exit 0
  fi
  if ! kill -0 "$cv_pid" 2>/dev/null; then
    echo "CV Studio n’a pas démarré. Consultez cv-studio/work/codespace-server.log."
    exit 1
  fi
  sleep 1
done
echo "Le démarrage continue. Consultez cv-studio/work/codespace-server.log."
exit 1
