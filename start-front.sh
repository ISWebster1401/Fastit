#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT_DIR="$ROOT_DIR/front"

FRONT_HOST="${FRONT_HOST:-127.0.0.1}"
FRONT_PORT="${FRONT_PORT:-5173}"

cd "$FRONT_DIR"
exec npm run dev -- --host "$FRONT_HOST" --port "$FRONT_PORT"
