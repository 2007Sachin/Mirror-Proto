import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { testAuth } from '../auth/testAuth.js'
import { createMemoryRepository } from '../repo/memory.js'
import { createVoiceGateway } from '../voice/gateway.js'
import { j, makeApp, makeEnv } from './helpers.js'

// Public on purpose. Everything else the app registers must answer 401 without a user.
const PUBLIC = [/^(\/api)?\/health$/, /^(\/api)?\/capabilities$/, /^(\/api)?\/integration-status$/, /^(\/api)?\/auth(\/|$)/]
const isPublic = (path: string) => PUBLIC.some(re => re.test(path))

/** Every concrete method + path the app registers, read from Hono's own route table (middleware entries are 'ALL'). */
function registeredRoutes(app: ReturnType<typeof makeApp>['app']) {
  const seen = new Set<string>()
  const out: { method: string; path: string }[] = []
  for (const r of app.routes) {
    if (r.method === 'ALL') continue
    const path = r.path.replace(/:[A-Za-z]+(\{[^}]*\})?/g, 'x').replace(/\*/g, 'x')
    const key = `${r.method} ${path}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push({ method: r.method, path })
    }
  }
  return out
}

describe('unauthenticated requests', () => {
  const { app } = makeApp()
  const routes = registeredRoutes(app)

  it('the route table is read and covers the known groups', () => {
    expect(routes.length).toBeGreaterThan(30)
    for (const p of ['/interviews', '/profile', '/targets', '/stories', '/practice/summary', '/resume/claims', '/replay/attempts', '/me/export', '/me/data', '/data']) {
      expect(routes.some(r => r.path === p), p).toBe(true)
    }
  })

  it('every route outside the public allow-list answers 401 unauthenticated, for every method', async () => {
    const guarded = routes.filter(r => !isPublic(r.path))
    expect(guarded.length).toBeGreaterThan(30)
    for (const { method, path } of guarded) {
      const res = await app.request(path, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'GET' || method === 'DELETE' ? undefined : '{}' })
      expect(res.status, `${method} ${path}`).toBe(401)
      expect(await j(res), `${method} ${path}`).toEqual({ error: 'unauthenticated' })
    }
  })

  it('a path no route handles is guarded too (default deny)', async () => {
    expect((await app.request('/not-a-route-yet')).status).toBe(401)
    expect((await app.request('/api/not-a-route-yet', { method: 'POST' })).status).toBe(401)
  })

  it('a blank X-Test-User is no user', async () => {
    const res = await app.request('/interviews', { headers: { 'X-Test-User': '   ' } })
    expect(res.status).toBe(401)
  })

  it('the old X-Dev-Workspace header is not a credential', async () => {
    const res = await app.request('/interviews', { headers: { 'X-Dev-Workspace': 'dev' } })
    expect(res.status).toBe(401)
  })

  it('the public routes stay public', async () => {
    for (const p of ['/health', '/capabilities', '/integration-status']) expect((await app.request(p)).status, p).toBe(200)
  })

  it('a WebSocket upgrade without a user is refused, and with one is accepted', async () => {
    const http = createServer()
    const gateway = createVoiceGateway({ env: makeEnv(), auth: testAuth(), repoFor: () => createMemoryRepository(), provider: null })
    gateway.attach(http)
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
    const port = (http.address() as AddressInfo).port
    const connect = async (headers?: Record<string, string>) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`, { headers })
      const outcome = await new Promise<string>(resolve => {
        ws.on('open', () => resolve('open'))
        ws.on('unexpected-response', (_req, res) => resolve(`http ${res.statusCode}`))
        ws.on('error', () => undefined)
      })
      ws.terminate()
      return outcome
    }
    try {
      expect(await connect()).toBe('http 401')
      expect(await connect({ 'x-test-user': 'ann' })).toBe('open')
    } finally {
      gateway.close()
      http.close()
    }
  })
})
