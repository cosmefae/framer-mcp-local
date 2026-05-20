# framer-mcp-local

> **Heads up:** This is a stopgap. When Framer ships an official MCP, switch to that. Official beats community every time: better support, better stability, longer runway. Figma did it right with native MCP + Skills across Claude, Cursor, and others. Framer will get there.
>
> Until then: this works.

---

Local bridge between Claude Code and Framer. Runs entirely on your machine.

## Why this exists

Most Framer MCP setups route your project through a third-party server. Every canvas change, every CMS item, every code file hitting someone else's infrastructure. Possibly Cloudflare. Possibly worse.

I didn't want that. So I built a local bridge: Claude → Node server on your machine → WebSocket → Framer plugin. Nothing leaves. No accounts, no API keys, no cloud dependency.

Scratched my own itch. If you have the same one, here you go.

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

Starts **Vite dev server only** (plugin UI on `http://localhost:5173`).

> **Why not start the MCP server here too?** Claude Code owns port 9374. It spawns `node server/dist/index.js` via stdio on startup. If `npm run dev` also starts it, both fight for the port, the Claude-managed process loses, and no tools register. Don't touch 9374.

## Use with Claude Code

**1. Register the MCP server (one-time):**

```bash
claude mcp add framer-local -- node /Users/cosmefae/git/framer-mcp-local/server/dist/index.js
```

**2. Restart Claude Code** in this directory. It will auto-start the server via stdio on every session.

**3. Connect Framer plugin:**

1. Open Framer → Plugins → **Open Development Plugin** (`⌥⌘L`)
2. Paste `http://localhost:5173` → **Open**
3. Plugin shows `Claude connected` when ready

That's it. Claude can now read and write the canvas, CMS, and code files.

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
| `inspectFramerApi` | List all methods on the `framer` object at runtime |
| `inspectNode` | List all methods/properties on a specific node at runtime |
| `inspectTextStyle` | Get a node's `inlineTextStyle` and available TextStyle methods |

## What the Framer API actually exposes

Confirmed at runtime (2026-05-20). These are the real methods — not the TypeScript type definitions, which include things that don't exist in production plugins.

**`framer` object:**
`addComponentInstance` · `addText` · `cloneNode` · `createCodeFile` · `createCollection` · `createColorStyle` · `createDesignPage` · `createFrameNode` · `createManagedCollection` · `createTextStyle` · `createWebPage` · `getActiveCollection` · `getCanvasRoot` · `getChildren` · `getCodeFile` · `getCodeFiles` · `getCollection` · `getCollections` · `getColorStyle` · `getColorStyles` · `getCurrentUser` · `getCustomCode` · `getFont` · `getFonts` · `getImage` · `getLocales` · `getManagedCollection` · `getManagedCollections` · `getNode` · `getNodesWithAttribute` · `getNodesWithAttributeSet` · `getNodesWithType` · `getParent` · `getPluginData` · `getProjectInfo` · `getPublishInfo` · `getRect` · `getRedirects` · `getSelection` · `getText` · `getTextStyle` · `getTextStyles` · `isAllowedTo` · `navigateTo` · `notify` · `removeNode` · `removeNodes` · `setAttributes` · `setCustomCode` · `setImage` · `setParent` · `setPluginData` · `setSelection` · `setText` · `showUI` · `subscribeToColorStyles` · `subscribeToSelection` · `subscribeToTextStyles` · `uploadImage` · `zoomIntoView`

**Text node properties:**
`id` · `name` · `getText` · `setText` · `setAttributes` · `inlineTextStyle` · `getChildren` · `remove` · `clone` · `select` · `walk` · `visible` · `locked` · `opacity` · `position` · `width` · `height` · `left` · `top` · `right` · `bottom` · `rotation` · `link` · `font` · `gridItem*`

**TextStyle properties** (via `node.inlineTextStyle` → `framer.getTextStyle(id)`):
`id` · `name` · `path` · `tag` · `font` · `boldFont` · `color` · `alignment` · `balance` · `fontSize` · `letterSpacing` · `lineHeight` · `paragraphSpacing` · `transform` · `decoration` · `breakpoints` — writable via `textStyle.setAttributes({...})`

**`balance` specifically:** lives on TextStyle, not the node. To set it: `framer.getTextStyle(node.inlineTextStyle.id).setAttributes({balance: true})`. The `updateXmlForNode` tool handles this automatically when you pass `{"balance": true}`.

**Does NOT exist at runtime:** `setTextStyleAttributes`, `getNodeByID`, `getPages`, `getSelectedNodes`, `exportReactComponents`, `getComponentInsertUrlAndTypes`

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

What people are using a local Claude ↔ Framer bridge for:

→ **Programmatic SEO:** keyword list in, CMS entries + pages out, automatically
→ **Marketing agents:** Claude updates copy, swaps headlines, refreshes CTAs based on briefs or test results
→ **Voice/narrative shifts:** rewrite sections to match a new brand tone without touching the editor
→ **Content pipelines:** pull from spreadsheets or APIs, push into Framer CMS directly
→ **Design audits:** scan for inconsistencies (wrong colors, stale text styles), fix in batch
→ **Launch automation:** flip "coming soon" to live content, swap placeholders, publish in one session

## How to actually use this

Two things make or break the workflow.

### Always select first

`getProjectXml` isn't reliable on large projects. Don't start from the tree.

Start from selection: click the element in Framer, then tell Claude what to do with it. That's the whole workflow.

1. Click the element in Framer
2. Tell Claude what to do with it

### Changing text content vs. renaming a layer

Two different operations. Claude needs to know which one:

| What you want | How to say it |
|---|---|
| Change the text people see on the page | "change the text to..." |
| Rename the layer in the layers panel | "rename the layer to..." |

Internally, `{"text": "..."}` changes visible content and `{"name": "..."}` renames the layer. Claude handles this automatically when you're clear about intent.

### Nodes inside components

Claude says node not found. Even though you just selected it. It's inside a component. `getNodeByID` doesn't reach those.

Fix: keep the element selected in Framer right before asking Claude to edit. The fallback reads from your active selection.

## Troubleshooting

- **"Unable to connect":** run `curl -s http://localhost:5173/framer.json`. Must return `{"id":"ze6ms4",...}`.
- **Plugin shows "Waiting for MCP server":** server not running. Check `lsof -i :9374`.
- **Port 5173 in use:** `lsof -ti :5173 | xargs kill`
- **Port 9374 in use / MCP tools missing:** another process stole the port before Claude. Run `lsof -ti :9374 | xargs kill`, then restart Claude Code. Do not run `node server/dist/index.js` manually.
- **Server changes not reflected:** rebuild with `npm run build` then `npm run dev`.

## About

Built by [Cosme Faé](https://linkedin.com/in/cosmefae), designer, indie hacker, AI workflow person.

→ [hellofae.com](https://hellofae.com)
