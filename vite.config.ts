import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  // The SQL round loads sql.js lazily. Without this, the dev server discovers it on first use, re-optimises
  // and reloads the whole page, which throws the user back to the landing screen.
  optimizeDeps: { include: ['sql.js'] },
  // The SQL worker loads each database with a dynamic import, which needs ES-module workers.
  worker: { format: 'es' },
  server: {
    port: 3000,
    watch: { ignored: ['**/*.stackdump'] }, // Git Bash crash dumps are locked files; watching them kills the dev server (EBUSY)
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        rewrite: p => p.replace(/^\/api/, ''),
      },
      '/ws/voice': {
        target: 'ws://localhost:8787',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
