// WebSocket client — connects to the local MCP server bridge
// All tool calls from Claude arrive here as JSON messages

import * as handlers from "./handlers.js"

type Message = {
  id: string
  tool: string
  params: Record<string, unknown>
}

type Response = {
  id: string
  result?: string
  error?: string
}

const WS_URL = "ws://127.0.0.1:9374"
const RECONNECT_DELAY = 2000

let ws: WebSocket | null = null

export type ConnectionStatus = "connecting" | "connected" | "disconnected"
let onStatusChange: ((s: ConnectionStatus) => void) | null = null

export function setStatusCallback(cb: (s: ConnectionStatus) => void) {
  onStatusChange = cb
}

function setStatus(s: ConnectionStatus) {
  onStatusChange?.(s)
}

async function handleMessage(msg: Message): Promise<Response> {
  const handler = (handlers as Record<string, (p: unknown) => Promise<string>>)[msg.tool]
  if (!handler) {
    return { id: msg.id, error: `Unknown tool: ${msg.tool}` }
  }
  try {
    const result = await handler(msg.params)
    return { id: msg.id, result }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { id: msg.id, error: message }
  }
}

function connect() {
  setStatus("connecting")
  ws = new WebSocket(WS_URL)

  ws.onopen = () => setStatus("connected")

  ws.onmessage = async (event) => {
    try {
      const msg: Message = JSON.parse(event.data as string)
      const response = await handleMessage(msg)
      ws?.send(JSON.stringify(response))
    } catch (err) {
      console.error("[framer-mcp] Error handling message:", err)
    }
  }

  ws.onclose = () => {
    setStatus("disconnected")
    setTimeout(connect, RECONNECT_DELAY)
  }

  ws.onerror = () => {
    ws?.close()
  }
}

connect()
