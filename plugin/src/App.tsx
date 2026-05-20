import { useState, useEffect } from "react"
import { setStatusCallback, type ConnectionStatus } from "./bridge.js"

const STATUS_STYLES: Record<ConnectionStatus, { color: string; label: string; dot: string }> = {
  connected: { color: "#22c55e", label: "Claude conectado", dot: "●" },
  connecting: { color: "#eab308", label: "Conectando...", dot: "◌" },
  disconnected: { color: "#ef4444", label: "Aguardando MCP server", dot: "○" },
}

export function App() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting")

  useEffect(() => {
    setStatusCallback(setStatus)
  }, [])

  const s = STATUS_STYLES[status]

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: 12,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        color: "#e5e7eb",
        background: "#111",
        padding: "0 16px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 24, color: s.color }}>{s.dot}</div>
      <div style={{ fontWeight: 600, color: s.color }}>{s.label}</div>
      {status === "disconnected" && (
        <div style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5 }}>
          Inicie o MCP server:
          <br />
          <code style={{ color: "#9ca3af" }}>
            node ~/git/framer-mcp-local/server/dist/index.mjs
          </code>
        </div>
      )}
      {status === "connected" && (
        <div style={{ color: "#6b7280", fontSize: 11 }}>
          ws://127.0.0.1:9374
        </div>
      )}
    </div>
  )
}
