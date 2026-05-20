import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import framer from "vite-plugin-framer"

export default defineConfig({
  plugins: [react(), framer()],
  server: {
    port: 5173,
  },
})
