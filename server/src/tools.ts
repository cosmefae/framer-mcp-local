import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import type { PluginBridge } from "./bridge.js"

function text(content: string) {
  return { content: [{ type: "text" as const, text: content }] }
}

async function call(bridge: PluginBridge, tool: string, params: Record<string, unknown> = {}) {
  const result = await bridge.invoke(tool, params)
  return text(result)
}

export function registerTools(server: McpServer, bridge: PluginBridge) {
  // ── Canvas / Nodes ──────────────────────────────────────────────────────────

  server.tool("getProjectXml", "Get full project XML (nodes tree)", {}, () =>
    call(bridge, "getProjectXml")
  )

  server.tool(
    "getNodeXml",
    "Get XML of a specific node by ID",
    { nodeId: z.string().describe("Node ID") },
    ({ nodeId }) => call(bridge, "getNodeXml", { nodeId })
  )

  server.tool("getSelectedNodesXml", "Get XML of currently selected nodes", {}, () =>
    call(bridge, "getSelectedNodesXml")
  )

  server.tool(
    "updateXmlForNode",
    "Update a node using XML. Returns updated node ID.",
    {
      nodeId: z.string().describe("Target node ID"),
      xml: z.string().describe("New XML for the node"),
    },
    ({ nodeId, xml }) => call(bridge, "updateXmlForNode", { nodeId, xml })
  )

  server.tool(
    "deleteNode",
    "Delete a node by ID",
    { nodeId: z.string().describe("Node ID to delete") },
    ({ nodeId }) => call(bridge, "deleteNode", { nodeId })
  )

  server.tool(
    "duplicateNode",
    "Duplicate a node",
    { nodeId: z.string().describe("Node ID to duplicate") },
    ({ nodeId }) => call(bridge, "duplicateNode", { nodeId })
  )

  server.tool(
    "createPage",
    "Create a new page",
    { name: z.string().describe("Page name") },
    ({ name }) => call(bridge, "createPage", { name })
  )

  server.tool(
    "zoomIntoView",
    "Zoom canvas to a specific node",
    { nodeId: z.string().describe("Node ID to zoom into") },
    ({ nodeId }) => call(bridge, "zoomIntoView", { nodeId })
  )

  // ── CMS ────────────────────────────────────────────────────────────────────

  server.tool("getCMSCollections", "List all CMS collections", {}, () =>
    call(bridge, "getCMSCollections")
  )

  server.tool(
    "getCMSItems",
    "Get items from a CMS collection",
    { collectionId: z.string().describe("Collection ID") },
    ({ collectionId }) => call(bridge, "getCMSItems", { collectionId })
  )

  server.tool(
    "upsertCMSItem",
    "Create or update a CMS item",
    {
      collectionId: z.string().describe("Collection ID"),
      itemId: z.string().optional().describe("Item ID (omit to create new)"),
      fields: z.record(z.unknown()).describe("Field values as key-value pairs"),
    },
    ({ collectionId, itemId, fields }) =>
      call(bridge, "upsertCMSItem", { collectionId, itemId, fields })
  )

  server.tool(
    "deleteCMSItem",
    "Delete a CMS item",
    {
      collectionId: z.string().describe("Collection ID"),
      itemId: z.string().describe("Item ID"),
    },
    ({ collectionId, itemId }) => call(bridge, "deleteCMSItem", { collectionId, itemId })
  )

  // ── Code Files ─────────────────────────────────────────────────────────────

  server.tool(
    "readCodeFile",
    "Read a code file by path",
    { path: z.string().describe("File path (e.g. Button.tsx)") },
    ({ path }) => call(bridge, "readCodeFile", { path })
  )

  server.tool(
    "createCodeFile",
    "Create a new code file",
    {
      path: z.string().describe("File path"),
      content: z.string().describe("File content"),
    },
    ({ path, content }) => call(bridge, "createCodeFile", { path, content })
  )

  server.tool(
    "updateCodeFile",
    "Update an existing code file",
    {
      path: z.string().describe("File path"),
      content: z.string().describe("New file content"),
    },
    ({ path, content }) => call(bridge, "updateCodeFile", { path, content })
  )

  server.tool(
    "exportReactComponents",
    "Export React components for selected nodes",
    { nodeIds: z.array(z.string()).optional().describe("Node IDs (omit for selection)") },
    ({ nodeIds }) => call(bridge, "exportReactComponents", { nodeIds })
  )

  server.tool(
    "getComponentInsertUrlAndTypes",
    "Get insert URL and type info for components",
    {},
    () => call(bridge, "getComponentInsertUrlAndTypes")
  )

  // ── Design System ──────────────────────────────────────────────────────────

  server.tool(
    "manageColorStyle",
    "Create, update, or delete a color style",
    {
      action: z.enum(["create", "update", "delete"]),
      name: z.string().describe("Style name"),
      color: z.string().optional().describe("Hex color (required for create/update)"),
      styleId: z.string().optional().describe("Style ID (required for update/delete)"),
    },
    (params) => call(bridge, "manageColorStyle", params)
  )

  server.tool(
    "manageTextStyle",
    "Create, update, or delete a text style",
    {
      action: z.enum(["create", "update", "delete"]),
      name: z.string().describe("Style name"),
      styleId: z.string().optional().describe("Style ID (required for update/delete)"),
      properties: z.record(z.unknown()).optional().describe("Text style properties"),
    },
    (params) => call(bridge, "manageTextStyle", params)
  )

  server.tool(
    "searchFonts",
    "Search available fonts",
    { query: z.string().describe("Font name search query") },
    ({ query }) => call(bridge, "searchFonts", { query })
  )

  server.tool("getProjectWebsiteUrl", "Get the project's published website URL", {}, () =>
    call(bridge, "getProjectWebsiteUrl")
  )
}
