import { describe, expect, it } from 'vitest'
import { j, makeApp, makeEnv, WS } from './helpers.js'

describe('GET /integration-status', () => {
  it('is reachable without the workspace header', async () => {
    const { app } = makeApp()
    const res = await app.request('/integration-status')
    expect(res.status).toBe(200)
    expect((await j(res)).nim.model).toBe('meta/llama-3.3-70b-instruct')
  })

  it('reports unconfigured providers without secrets or URLs', async () => {
    const { app } = makeApp()
    const res = await app.request('/integration-status', { headers: WS })
    expect(res.status).toBe(200)
    const body = await j(res)
    expect(body.supabase).toEqual({ configured: false, live: false })
    expect(body.nim).toEqual({ configured: false, live: false, model: 'meta/llama-3.3-70b-instruct' })
    expect(JSON.stringify(body)).not.toContain('http')
    expect(JSON.stringify(body)).not.toContain('key')
  })

  it('reports nim configured/live when a key is present', async () => {
    const { app } = makeApp({ env: makeEnv({ nimApiKey: 'test-key' }) })
    const res = await app.request('/integration-status', { headers: WS })
    const body = await j(res)
    expect(body.nim.configured).toBe(true)
    expect(body.nim.live).toBe(true)
  })

  it('marks supabase unconfigured-but-present url as not live', async () => {
    const { app } = makeApp({ env: makeEnv({ supabaseUrl: 'https://example.supabase.co' }) })
    const res = await app.request('/integration-status', { headers: WS })
    const body = await j(res)
    expect(body.supabase.configured).toBe(false)
    expect(body.supabase.live).toBe(false)
  })
})
