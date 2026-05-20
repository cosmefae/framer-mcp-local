#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Only start Vite plugin server — WS bridge (9374) is owned by Claude Code MCP server
# Running node server/dist/index.js here conflicts with Claude Code's MCP spawn
cd plugin
npm run dev
