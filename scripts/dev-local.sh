#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
VITE_SCRIPT="$ROOT_DIR/node_modules/vite/bin/vite.js"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 24 or newer is required. Install Node.js and run npm ci." >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( NODE_MAJOR < 24 )); then
  echo "Node.js 24 or newer is required (found $(node --version))." >&2
  exit 1
fi
if [[ ! -f "$VITE_SCRIPT" ]]; then
  echo "Dependencies are missing. Run npm ci in $ROOT_DIR first." >&2
  exit 1
fi
if [[ ! "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || (( 10#$FRONTEND_PORT < 1 || 10#$FRONTEND_PORT > 65535 )); then
  echo "FRONTEND_PORT must be a number between 1 and 65535." >&2
  exit 1
fi

cd "$ROOT_DIR"
echo "Starting frontend and backend in development mode. Press Ctrl+C to stop."
exec node "$ROOT_DIR/scripts/dev-run.mjs"
