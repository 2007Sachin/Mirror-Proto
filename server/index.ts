import { serve } from '@hono/node-server'
import { env } from './config.js'
import { buildApp } from './app.js'
import { createAuthProvider } from './auth/compose.js'
import { createRepoFactory } from './repo/factory.js'
import { isSupabaseConfigured } from './config.js'
import { attachVoiceGateway } from './voice/index.js'

export function buildServer() {
  const auth = createAuthProvider(env)
  const repoFor = createRepoFactory(env)
  const app = buildApp({ env, auth, repoFor })
  return { app, auth, repoFor }
}

export function startServer(port = env.port) {
  const { app, auth, repoFor } = buildServer()
  const server = serve({ fetch: app.fetch, port })
  attachVoiceGateway(server as unknown as import('node:http').Server, {
    env,
    auth,
    repoFor,
    log: msg => console.log(`[voice] ${msg}`),
  })
  return server
}

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
