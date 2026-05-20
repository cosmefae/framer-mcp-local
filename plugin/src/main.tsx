import { createRoot } from "react-dom/client"
import { framer } from "framer-plugin"
import { App } from "./App.js"

// Initialize bridge (WebSocket connection to local MCP server)
import "./bridge.js"

framer.showUI({
  position: "top right",
  width: 240,
  height: 120,
})

const root = document.getElementById("root")!
createRoot(root).render(<App />)
