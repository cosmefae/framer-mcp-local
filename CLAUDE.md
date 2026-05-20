# CLAUDE.md

## Project
Local MCP bridge: Claude Code ↔ Framer Desktop via WebSocket.

## How to run

**Plugin dev server** (Vite only — port 5173):
```
npm run dev
```
Starts only the Framer plugin UI. Does NOT start the WS bridge.

**MCP server + WS bridge** (port 9374): Claude Code launches it automatically via stdio — no manual step needed.

⚠️ **Do NOT run `node server/dist/index.js` manually.** Claude Code owns port 9374. If something else binds 9374 first, the MCP server crashes on startup and no tools register in the session.

## Rebuild when needed
```
npm run build --workspace=server
```
Trigger: any edit to `server/src/*.ts`. The `server/dist/` files must be up to date for Claude to use.

## Verify server is running
```
lsof -i :9374
```
Should show a `node` process owned by Claude Code. If empty, restart Claude Code.
If it shows a process NOT owned by Claude Code, kill it and restart Claude Code — that's why tools aren't loading.

The Framer plugin must also be open at `http://localhost:5173` inside Framer Desktop — otherwise tool calls will hang waiting for the WebSocket connection.

## MCP registration (one-time, required)
```
claude mcp add framer-local -- node /Users/cosmefae/git/framer-mcp-local/server/dist/index.js
```
After this, Claude Code auto-starts the server via stdio on every session in this directory.
**Without this step, Claude cannot use any Framer tools** — the tools won't appear in the session.
If tools are missing, ask the user to run the command above and restart Claude Code.

## Architecture
```
Claude Code (stdio)
    ↓
server/src/index.ts   ← MCP server (@modelcontextprotocol/sdk)
    ↓ ws://127.0.0.1:9374
plugin/src/bridge.ts  ← WebSocket client inside Framer plugin
    ↓
Framer canvas / CMS / code files
```

## Available tools
See `README.md` § Available MCP tools for the full list (getProjectXml, upsertCMSItem, updateCodeFile, etc.).

## Key files
- `server/src/tools.ts` — all MCP tool definitions
- `server/src/bridge.ts` — WebSocket bridge (server side)
- `plugin/src/bridge.ts` — WebSocket client (Framer plugin side)
- `plugin/src/handlers.ts` — Framer API call implementations

## API behavior (known quirks)

**Always select first.** `getProjectXml` returns empty on large projects. Use `getSelectedNodesXml` as entry point. Tell user to select the node in Framer before any read/write operation.

**`getNodeByID` limitations.** Does not reach nodes nested inside components. `handlers.ts` already has a fallback: if `getNodeByID` fails, it searches the current selection. Selection must be active for this to work.

**`updateXmlForNode` JSON keys.**
- `{"text": "..."}` → changes visible canvas text (calls `node.setText`)
- `{"name": "..."}` → renames the layer in the panel (calls `setAttributes`)
- `{"balance": true}` / text-style keys → routes to `node.inlineTextStyle` → `framer.getTextStyle(id).setAttributes(attrs)`
When user says "change the text", use `text`. When user says "rename the layer", use `name`.

## Inspect before operating

Before attempting any Framer operation not covered above, use the inspection tools — don't guess:

- `inspectFramerApi` → full list of what the `framer` object exposes at runtime
- `inspectNode({ nodeId })` → full list of what a specific node exposes
- `inspectTextStyle({ nodeId })` → reads `inlineTextStyle` + TextStyle methods for that node

**Never use `?.` on a Framer API call without first confirming the method exists via inspect.** Silent `undefined` returns are the main failure mode.

## Confirmed API at runtime (2026-05-20)

**Methods that DO exist on `framer`:**
addComponentInstance, addText, cloneNode, createCodeFile, createCollection, createColorStyle, createDesignPage, createFrameNode, createManagedCollection, createTextStyle, createWebPage, getActiveCollection, getCanvasRoot, getChildren, getCodeFile, getCodeFiles, getCollection, getCollections, getColorStyle, getColorStyles, getCurrentUser, getCustomCode, getFont, getFonts, getImage, getLocales, getManagedCollection, getManagedCollections, getNode, getNodesWithAttribute, getNodesWithAttributeSet, getNodesWithType, getParent, getPluginData, getProjectInfo, getPublishInfo, getRect, getRedirects, getSelection, getText, getTextStyle, getTextStyles, isAllowedTo, navigateTo, notify, removeNode, removeNodes, setAttributes, setCustomCode, setImage, setParent, setPluginData, setSelection, setText, showUI, subscribeToColorStyles, subscribeToSelection, subscribeToTextStyles, uploadImage, zoomIntoView

**Methods that do NOT exist (return undefined):**
setTextStyleAttributes, getNodeByID, getPages, getSelectedNodes, exportReactComponents, getComponentInsertUrlAndTypes

**`balance`:** property of TextStyle, not the node. Access via `node.inlineTextStyle` → `framer.getTextStyle(id)` → `textStyle.setAttributes({balance: true})`. The `updateXmlForNode` handler does this automatically.
