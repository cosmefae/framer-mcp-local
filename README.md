# framer-mcp-local

> **Heads up:** This is a stopgap. When Framer ships an official MCP server — and they will, it's a matter of time — use that instead. Official tools are more stable, better supported, and the right long-term choice. Figma already went that route with native MCP + Skills integration across Claude, Cursor, and others. Framer will follow.
>
> Until then, this works.

---

Local bridge between Claude Code and Framer — runs entirely on your machine.

## Why this exists

Most Framer MCP servers route your project data through a third-party cloud. Every canvas change, every CMS item, every code file — logged on someone else's server. Possibly Cloudflare. Possibly elsewhere.

That didn't sit right. So I built something that keeps the whole loop local: Claude talks to a Node server on your machine, which talks directly to the Framer plugin over WebSocket. Nothing leaves your computer. No accounts, no API keys, no middlemen.

Scratched my own itch. Figured others might have the same one.

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

Starts **Vite dev server only** — plugin UI on `http://localhost:5173`.

> **Why not the MCP server too?** Claude Code auto-starts `node server/dist/index.js` via stdio (registered in `~/.claude/mcp.json`). If `npm run dev` also starts the server, both processes compete for port 9374 — the Claude-spawned instance crashes, and **no MCP tools appear in the session**. Port 9374 must be owned exclusively by Claude Code's MCP process.

## Use with Claude Code

**1. Register the MCP server (one-time):**

```bash
claude mcp add framer-local -- node /Users/cosmefae/git/framer-mcp-local/server/dist/index.js
```

**2. Restart Claude Code** in this directory — it will auto-start the server via stdio on every session.

**3. Connect Framer plugin:**

1. Open Framer → Plugins → **Open Development Plugin** (`⌥⌘L`)
2. Paste `http://localhost:5173` → **Open**
3. Plugin shows `Claude connected` when ready

Claude can now call all MCP tools directly (read/edit canvas, CMS, code files).

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

## What you can build with this

Some things people are actually doing (or could do) with a local Claude ↔ Framer bridge:

- **Programmatic SEO pages** — feed Claude a keyword list, have it generate and populate CMS entries, create pages, and wire up content automatically
- **Marketing agents** — let Claude update copy, swap headlines, and refresh CTAs across multiple pages based on campaign briefs or A/B test results
- **Narrative-driven sites** — have Claude rewrite page sections to match a new brand voice, tone shift, or audience segment
- **Content pipelines** — pull from a spreadsheet or API, push structured content into Framer CMS without touching the editor
- **Design audits** — scan the canvas for inconsistencies (wrong colors, outdated text styles) and fix them in batch
- **Launch automation** — update "coming soon" → live content, swap placeholder text, and publish — all in one Claude session

## How to actually use this

### Always select first

Before asking Claude to read or change anything on the canvas, **click the element in Framer first**. The project tree API doesn't work reliably on large projects, so selection is how Claude finds what you're pointing at.

Workflow:
1. Click the element in Framer
2. Tell Claude what to do with it

That's it.

### Changing text content vs. renaming a layer

These are two different things and Claude needs to know which one you mean:

| What you want | How to say it |
|---|---|
| Change the text people see on the page | "change the text to..." |
| Rename the layer in the layers panel | "rename the layer to..." |

Internally, `{"text": "..."}` changes visible content and `{"name": "..."}` renames the layer. Claude handles this automatically when you're clear about intent.

### Nodes inside components

If Claude says it can't find a node — even though you just selected it — it's likely inside a component. The fix: make sure the element is selected in Framer right before you ask Claude to edit it. The fallback reads from your current selection.

## Troubleshooting

- **"Unable to connect"** — run `curl -s http://localhost:5173/framer.json`; must return `{"id":"ze6ms4",...}`.
- **Plugin shows "Waiting for MCP server"** — server not running. Check: `lsof -i :9374`.
- **Port 5173 in use** — `lsof -ti :5173 | xargs kill`
- **Port 9374 in use / MCP tools missing** — another process stole the port before Claude. Run `lsof -ti :9374 | xargs kill`, then restart Claude Code. Do not run `node server/dist/index.js` manually.
- **Server changes not reflected** — rebuild: `npm run build` then `npm run dev`.

## About

Built by [Cosme Faé](https://linkedin.com/in/cosmefae) — designer, indie hacker, and AI workflow nerd.

If you're building something with this or want to talk agentic design workflows: [hellofae.com](https://hellofae.com)
