#!/usr/bin/env bash
set -eo pipefail

BACK_PORT="${BACK_PORT:-8000}"
FRONT_PORT="${FRONT_PORT:-5173}"

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [[ -n "$pids" ]]; then
    echo "Stopping processes on port $port: $pids"
    kill $pids
  else
    echo "No listener on port $port"
  fi
}

kill_port "$BACK_PORT"
kill_port "$FRONT_PORT"
