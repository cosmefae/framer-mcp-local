import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { PluginBridge } from "./bridge.js"
import { registerTools } from "./tools.js"

const WS_PORT = 9374

const bridge = new PluginBridge(WS_PORT)
process.stderr.write(`[framer-mcp] WebSocket bridge listening on ws://127.0.0.1:${WS_PORT}\n`)
process.stderr.write(`[framer-mcp] Open Framer and activate the MCP Local plugin to connect\n`)

const server = new McpServer({
  name: "framer-local",
  version: "1.0.0",
})

registerTools(server, bridge)

const transport = new StdioServerTransport()
await server.connect(transport)
