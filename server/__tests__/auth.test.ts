import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { demoAuth } from '../auth/demo.js'
import { createAuthProvider } from '../auth/compose.js'
import { requireUser } from '../auth/requireUser.js'
import { testAuth } from '../auth/testAuth.js'
import { createMemoryRepository } from '../repo/memory.js'
import { createVoiceGateway } from '../voice/gateway.js'
import { as, j, makeApp, makeEnv } from './helpers.js'

const json = { 'Content-Type': 'application/json' }

describe('requireUser', () => {
  it('answers 401 without a user and never builds a repo', async () => {
    let built = 0
    const app = new Hono()
    app.use(
      '/x',
      requireUser(testAuth(), () => {
        built++
        return createMemoryRepository()
      }),
    )
    app.get('/x', c => c.text('ok'))
    const res = await app.request('/x')
    expect(res.status).toBe(401)
    expect(await j(res)).toEqual({ error: 'unauthenticated' })
    expect(built).toBe(0)
  })

  it('sets user, workspace and repo, and ensures the workspace', async () => {
    const ensured: string[] = []
    const spy = { ...createMemoryRepository(), ensureWorkspace: async (id: string) => void ensured.push(id) }
    const app = new Hono()
    app.use('/x', requireUser(testAuth(), () => spy))
    app.get('/x', c => c.json({ user: c.get('user').id, workspace: c.get('workspace'), sameRepo: c.get('repo') === spy }))
    const res = await app.request('/x', { headers: as('u1') })
    expect(await j(res)).toEqual({ user: 'u1', workspace: 'u1', sameRepo: true })
    expect(ensured).toEqual(['u1'])
  })
})

describe('auth providers', () => {
  it('demoAuth is the fixed dev user, and is only composed with DEMO_MODE', async () => {
    const c = {} as never
    expect(await demoAuth().fromContext(c)).toEqual({ id: 'dev', email: null, accessToken: null })
    expect(await createAuthProvider(makeEnv({ demoMode: true })).fromContext(c)).toMatchObject({ id: 'dev' })
    expect(await createAuthProvider(makeEnv()).fromContext(c)).toBeNull()
  })
})

describe('guarded routes with test auth', () => {
  it('401 without a user on every guarded group', async () => {
    const { app } = makeApp()
    for (const path of ['/interviews', '/profile', '/targets', '/stories', '/practice/summary', '/resume/claims', '/replay/attempts', '/coach-note']) {
      expect((await app.request(path)).status, path).toBe(401)
    }
    expect((await app.request('/data', { method: 'DELETE' })).status).toBe(401)
    expect((await app.request('/api/interviews')).status).toBe(401)
  })

  it('keeps two users apart on a few routes', async () => {
    const { app } = makeApp()
    const post = (user: string, path: string, body: unknown) =>
      app.request(path, { method: 'POST', headers: { ...as(user), ...json }, body: JSON.stringify(body) })
    const created = await j(await post('ann', '/interviews', { role: 'Analyst', openingQuestion: 'Tell me about a time.' }))
    await post('ann', '/stories', { title: 'T', themes: [], situation: '', task: '', action: '', result: '', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null })
    expect((await app.request(`/interviews/${created.id}`, { headers: as('ann') })).status).toBe(200)
    expect((await app.request(`/interviews/${created.id}`, { headers: as('bob') })).status).toBe(404)
    expect(await j(await app.request('/stories', { headers: as('bob') }))).toEqual([])
    expect(await j(await app.request('/stories', { headers: as('ann') }))).toHaveLength(1)
  })

  it('keeps health, capabilities and integration-status public', async () => {
    const { app } = makeApp()
    for (const path of ['/health', '/capabilities', '/integration-status', '/api/health']) {
      expect((await app.request(path)).status, path).toBe(200)
    }
  })

  it('capabilities say server data in demo mode', async () => {
    const { app } = makeApp({ env: makeEnv({ demoMode: true, supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' }) })
    expect((await j(await app.request('/capabilities'))).newData).toBe('server')
  })
})

describe('voice upgrade', () => {
  async function connect(headers?: Record<string, string>) {
    const http = createServer()
    const repo = createMemoryRepository()
    const gateway = createVoiceGateway({ env: makeEnv(), auth: testAuth(), repoFor: () => repo, provider: null })
    gateway.attach(http)
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
    const port = (http.address() as AddressInfo).port
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`, { headers: { origin: 'http://localhost:3000', ...headers } })
    const outcome = await new Promise<string>(resolve => {
      ws.on('open', () => resolve('open'))
      ws.on('unexpected-response', (_req, res) => resolve(`http ${res.statusCode}`))
      ws.on('error', () => undefined)
    })
    ws.terminate()
    gateway.close()
    http.close()
    return outcome
  }

  it('refuses a socket without a user', async () => {
    expect(await connect()).toBe('http 401')
  })

  it('accepts a socket with a user', async () => {
    expect(await connect({ 'x-test-user': 'ann' })).toBe('open')
  })
})
