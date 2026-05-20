import { WebSocketServer, WebSocket } from "ws"

type PendingCall = {
  resolve: (value: string) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class PluginBridge {
  private wss: WebSocketServer
  private socket: WebSocket | null = null
  private pending = new Map<string, PendingCall>()
  private connectionPromise: Promise<void>
  private resolveConnection!: () => void
  private idCounter = 0

  constructor(port: number) {
    this.connectionPromise = new Promise((res) => {
      this.resolveConnection = res
    })

    this.wss = new WebSocketServer({ port, host: "127.0.0.1" })

    this.wss.on("connection", (ws) => {
      this.socket = ws
      this.resolveConnection()

      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString()) as {
          id: string
          result?: string
          error?: string
        }
        const call = this.pending.get(msg.id)
        if (!call) return
        this.pending.delete(msg.id)
        clearTimeout(call.timer)
        if (msg.error) call.reject(new Error(msg.error))
        else call.resolve(msg.result ?? "")
      })

      ws.on("close", () => {
        this.socket = null
        this.connectionPromise = new Promise((res) => {
          this.resolveConnection = res
        })
        for (const [id, call] of this.pending) {
          clearTimeout(call.timer)
          call.reject(new Error("Plugin disconnected"))
          this.pending.delete(id)
        }
      })
    })
  }

  async waitForPlugin(timeoutMs = 10000): Promise<void> {
    return Promise.race([
      this.connectionPromise,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Plugin not connected. Open Framer with the MCP Local plugin active.")), timeoutMs)
      ),
    ])
  }

  async invoke(tool: string, params: Record<string, unknown>): Promise<string> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Plugin not connected. Open Framer with the MCP Local plugin active.")
    }
    const id = String(++this.idCounter)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Tool ${tool} timed out after 30s`))
      }, 30000)
      this.pending.set(id, { resolve, reject, timer })
      this.socket!.send(JSON.stringify({ id, tool, params }))
    })
  }

  get connected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN
  }
}
