# framer-mcp-local

Local bridge between Claude Code and Framer via MCP + WebSocket.

Claude Code sends tool calls → MCP server (Node) → WebSocket bridge → Framer plugin → Framer API.

## Requirements

- Node 20+
- npm 10+
- Framer Desktop

## One-time setup

```bash
cd ~/git/framer-mcp-local
npm install
npm run build        # compiles server/dist/index.js
```

## Run

```bash
npm run dev
```

Starts both:
- **MCP server** — WebSocket bridge on port 9374
- **Vite dev server** — plugin UI on `http://localhost:5173`

Press `Ctrl+C` to stop both.

## Connect from Framer

1. Open Framer → Plugins menu → **Open Development Plugin** (`⌥⌘L`).
2. Paste: `http://localhost:5173`
3. Click **Open**.

The plugin panel shows the connection status (`Connecting…` → `Claude connected`).

## Register the MCP server in Claude Code

Add to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "framer-local": {
      "command": "node",
      "args": ["/Users/cosmefae/git/framer-mcp-local/server/dist/index.js"]
    }
  }
}
```

Or via CLI:

```bash
claude mcp add framer-local -- node /Users/cosmefae/git/framer-mcp-local/server/dist/index.js
```

> The MCP server communicates over **stdio** (standard MCP transport). It forwards tool calls to the Framer plugin via a local WebSocket — so the plugin must be open in Framer while Claude Code is running.

## Available MCP tools

| Tool | Description |
|---|---|
| `getProjectXml` | Full project nodes tree as XML |
| `getNodeXml` | XML for a specific node by ID |
| `getSelectedNodesXml` | XML of currently selected nodes |
| `updateXmlForNode` | Update a node's properties via XML |
| `deleteNode` | Delete a node by ID |
| `duplicateNode` | Duplicate a node |
| `createPage` | Create a new page |
| `zoomIntoView` | Zoom canvas to a node |
| `getCMSCollections` | List all CMS collections |
| `getCMSItems` | Get items in a collection |
| `upsertCMSItem` | Create or update a CMS item |
| `deleteCMSItem` | Delete a CMS item |
| `readCodeFile` | Read a code file |
| `createCodeFile` | Create a code file |
| `updateCodeFile` | Update a code file |
| `exportReactComponents` | Export nodes as React components |
| `getComponentInsertUrlAndTypes` | Component insert info |
| `manageColorStyle` | Create/update color styles |
| `manageTextStyle` | Create/update text styles |
| `searchFonts` | Search available fonts |
| `getProjectWebsiteUrl` | Get the project's published URL |

## Architecture

```
Claude Code (claude mcp)
    │ stdio
    ▼
server/src/index.ts   ← MCP server (Node, @modelcontextprotocol/sdk)
    │ WebSocket ws://127.0.0.1:9374
    ▼
plugin/src/bridge.ts  ← WS client inside Framer plugin
    │ framer-plugin SDK
    ▼
Framer canvas / CMS / code files
```

## Troubleshooting

- **"Unable to connect"** — run `curl -s http://localhost:5173/framer.json`; must return `{"id":"ze6ms4",...}`.
- **Plugin shows "Waiting for MCP server"** — server not running. Check: `lsof -i :9374`.
- **Port 5173 in use** — `lsof -ti :5173 | xargs kill`
- **Port 9374 in use** — `lsof -ti :9374 | xargs kill`
- **Server changes not reflected** — rebuild: `npm run build` then `npm run dev`.
