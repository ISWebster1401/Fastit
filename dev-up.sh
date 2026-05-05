#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK_DIR="$ROOT_DIR/back"
FRONT_DIR="$ROOT_DIR/front"

BACK_HOST="${BACK_HOST:-127.0.0.1}"
BACK_PORT="${BACK_PORT:-8000}"
FRONT_HOST="${FRONT_HOST:-127.0.0.1}"
FRONT_PORT="${FRONT_PORT:-5173}"
BACK_RELOAD="${BACK_RELOAD:-0}"

BACK_PID=""
FRONT_PID=""

port_in_use() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

cleanup() {
  echo ""
  echo "Stopping dev servers..."
  if [[ -n "$FRONT_PID" ]] && kill -0 "$FRONT_PID" 2>/dev/null; then
    kill "$FRONT_PID" 2>/dev/null || true
  fi
  if [[ -n "$BACK_PID" ]] && kill -0 "$BACK_PID" 2>/dev/null; then
    kill "$BACK_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}

trap cleanup INT TERM EXIT

if [[ ! -d "$BACK_DIR/.venv" ]]; then
  echo "Error: backend virtualenv not found at $BACK_DIR/.venv"
  echo "Create it first:"
  echo "  cd back && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

if [[ ! -f "$FRONT_DIR/package.json" ]]; then
  echo "Error: frontend package.json not found at $FRONT_DIR"
  exit 1
fi

if [[ ! -f "$FRONT_DIR/node_modules/vite/package.json" ]]; then
  echo "Error: frontend dependencies look incomplete."
  echo "Run this first:"
  echo "  cd front && npm install"
  exit 1
fi

if port_in_use "$BACK_PORT"; then
  echo "Error: backend port $BACK_PORT is already in use."
  echo "Use another one: BACK_PORT=8001 ./dev-up.sh"
  exit 1
fi

if port_in_use "$FRONT_PORT"; then
  echo "Error: frontend port $FRONT_PORT is already in use."
  echo "Use another one: FRONT_PORT=5174 ./dev-up.sh"
  exit 1
fi

echo "Starting backend on http://$BACK_HOST:$BACK_PORT ..."
(
  cd "$BACK_DIR"
  source .venv/bin/activate
  if [[ "$BACK_RELOAD" == "1" ]]; then
    uvicorn app.main:app --host "$BACK_HOST" --port "$BACK_PORT" --reload
  else
    uvicorn app.main:app --host "$BACK_HOST" --port "$BACK_PORT"
  fi
) &
BACK_PID=$!

echo "Starting frontend on http://$FRONT_HOST:$FRONT_PORT ..."
(
  cd "$FRONT_DIR"
  npm run dev -- --host "$FRONT_HOST" --port "$FRONT_PORT"
) &
FRONT_PID=$!

echo ""
echo "Fastit dev servers running:"
echo "  Front: http://$FRONT_HOST:$FRONT_PORT"
echo "  Back:  http://$BACK_HOST:$BACK_PORT"
echo ""
echo "Press Ctrl+C to stop both."

while true; do
  if ! kill -0 "$BACK_PID" 2>/dev/null; then
    wait "$BACK_PID" 2>/dev/null || true
    echo "Backend server exited unexpectedly."
    exit 1
  fi

  if ! kill -0 "$FRONT_PID" 2>/dev/null; then
    wait "$FRONT_PID" 2>/dev/null || true
    echo "Frontend server exited unexpectedly."
    exit 1
  fi

  sleep 1
done
