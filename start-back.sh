#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK_DIR="$ROOT_DIR/back"

BACK_HOST="${BACK_HOST:-127.0.0.1}"
BACK_PORT="${BACK_PORT:-8000}"
BACK_RELOAD="${BACK_RELOAD:-0}"

cd "$BACK_DIR"
source .venv/bin/activate

if [[ "$BACK_RELOAD" == "1" ]]; then
  exec uvicorn app.main:app --host "$BACK_HOST" --port "$BACK_PORT" --reload
else
  exec uvicorn app.main:app --host "$BACK_HOST" --port "$BACK_PORT"
fi
