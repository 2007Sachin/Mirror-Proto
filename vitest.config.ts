import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    // The Today tests read these two stylesheets as text (focus, tap targets, 390 px rules).
    css: { include: [/pages[\\/]today\.css/, /src[\\/]landing\.css/, /landing[\\/]home\.css/] },
    include: ['server/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
