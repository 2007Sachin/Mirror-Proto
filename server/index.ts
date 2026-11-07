import { serve } from '@hono/node-server'
import { env } from './config.js'
import { buildApp } from './app.js'
import { createMemoryRepository } from './repo/memory.js'
import { createSupabaseRepository } from './repo/supabase.js'
import { isSupabaseConfigured } from './config.js'
import { attachVoiceGateway } from './voice/index.js'
import type { Repository } from './repo/types.js'

export function createRepository(): Repository {
  return isSupabaseConfigured(env)
    ? createSupabaseRepository(env.supabaseUrl!, env.supabaseServiceRoleKey!)
    : createMemoryRepository()
}

export function buildServer() {
  const repo = createRepository()
  const app = buildApp({ env, repo })
  return { app, repo }
}

export function startServer(port = env.port) {
  const { app, repo } = buildServer()
  const server = serve({ fetch: app.fetch, port })
  attachVoiceGateway(server as unknown as import('node:http').Server, { env, repo, log: msg => console.log(`[voice] ${msg}`) })
  return server
}

// Run only when executed directly (not when imported by tests).
const isMain = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  const selfPath = new URL(import.meta.url).pathname.replace(/^\//, '')
  return entry.replace(/\\/g, '/').endsWith(selfPath)
})()
if (isMain) {
  startServer()
  console.log(`MIRROR server listening on http://localhost:${env.port} (mode: ${isSupabaseConfigured(env) ? 'supabase' : 'memory'})`)
}
