#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

[ -f server/dist/index.js ] || (cd server && npm run build)

node server/dist/index.js &
SERVER_PID=$!

trap "kill $SERVER_PID 2>/dev/null || true" EXIT INT TERM

cd plugin
npm run dev
