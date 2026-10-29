#!/usr/bin/env bash
# Start the AI Business Operator stack (backend + frontend) for local use.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Starting API on :8000"
(cd "$ROOT/backend" && .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000) &
API_PID=$!

trap 'kill $API_PID 2>/dev/null || true' EXIT

echo "==> Starting web app on :5173"
(cd "$ROOT/frontend" && npm run dev -- --host 0.0.0.0 --port 5173)
