#!/usr/bin/env bash
# Start both backend (uvicorn :8000) and frontend (next :3000).
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ backend"
(
  cd "$ROOT/backend"
  if [[ ! -d .venv ]]; then python3 -m venv .venv; fi
  source .venv/bin/activate
  pip install -q -r requirements.txt
  uvicorn app.main:app --port 8000 --host 127.0.0.1
) &
BACK_PID=$!

echo "→ frontend"
(
  cd "$ROOT/frontend"
  if [[ ! -d node_modules ]]; then npm install; fi
  npm run dev
) &
FRONT_PID=$!

trap "kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT INT TERM
wait
