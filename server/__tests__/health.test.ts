import { describe, expect, it } from 'vitest'
import { j, makeApp, makeEnv, WS } from './helpers.js'
import { PersistenceError, PHASE1_TABLES } from '../repo/supabase.js'

describe('GET /health', () => {
  it('returns ok with memory mode and uptime', async () => {
    const { app } = makeApp()
    const res = await app.request('/health', { headers: WS })
    expect(res.status).toBe(200)
    const body = await j(res)
    expect(body.status).toBe('ok')
    expect(body.mode).toBe('memory')
    expect(typeof body.uptime).toBe('number')
    expect(body.voice).toEqual({ configured: false, provider: 'mock' })
  })

  it('is also reachable under /api', async () => {
    const { app } = makeApp()
    const res = await app.request('/api/health', { headers: WS })
    expect(res.status).toBe(200)
  })

  it('is reachable without the workspace header', async () => {
    const { app } = makeApp()
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect((await j(res)).status).toBe('ok')
  })

  it('interviews still require the workspace header', async () => {
    const { app } = makeApp()
    const res = await app.request('/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Product Analyst' }),
    })
    expect(res.status).toBe(400)
    expect((await j(res)).error).toBe('workspace_header_required')
  })

  it('reports supabase mode when url and secret are set', async () => {
    const { app } = makeApp({
      env: makeEnv({
        supabaseUrl: 'https://example.supabase.co',
        supabaseSecretKey: 'secret-role',
      }),
    })
    const res = await app.request('/health')
    expect((await j(res)).mode).toBe('supabase')
  })
})

describe('phase-1 supabase table names', () => {
  it('does not use the production public.turns table', () => {
    expect(PHASE1_TABLES.workspaces).toBe('mirror_workspaces')
    expect(PHASE1_TABLES.interviews).toBe('mirror_interviews')
    expect(PHASE1_TABLES.turns).toBe('mirror_turns')
    expect(PHASE1_TABLES.reflections).toBe('mirror_reflections')
  })
})

describe('persistence failures', () => {
  it('maps PersistenceError to 503 persistence_unavailable', async () => {
    const { app } = makeApp({
      repo: {
        async ensureWorkspace() {
          throw new PersistenceError('failed to ensure workspace: missing table')
        },
        async createInterview() {
          throw new PersistenceError('failed to create interview: missing table')
        },
        async getInterview() {
          return null
        },
        async updateInterviewStatus() {},
        async appendAskedQuestion() {
          return null
        },
        async listInterviewsByRole() {
          return []
        },
        async addTurn() {
          throw new PersistenceError('failed to add turn: missing table')
        },
        async getTurns() {
          return []
        },
        async saveReflection() {
          throw new PersistenceError('failed to save reflection: missing table')
        },
        async getReflection() {
          return null
        },
      },
    })
    const res = await app.request('/interviews', {
      method: 'POST',
      headers: { ...WS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Product Analyst' }),
    })
    expect(res.status).toBe(503)
    expect((await j(res)).error).toBe('persistence_unavailable')
  })
})
