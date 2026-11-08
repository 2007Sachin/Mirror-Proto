import { describe, expect, it } from 'vitest'
import { j, makeApp, makeEnv, WS } from './helpers.js'

describe('GET /integration-status', () => {
  it('is reachable without the workspace header', async () => {
    const { app } = makeApp()
    const res = await app.request('/integration-status')
    expect(res.status).toBe(200)
    expect((await j(res)).nim.model).toBe('nvidia/nemotron-3.5-bolt-e4b')
  })

  it('reports unconfigured providers without secrets or URLs', async () => {
    const { app } = makeApp()
    const res = await app.request('/integration-status', { headers: WS })
    expect(res.status).toBe(200)
    const body = await j(res)
    expect(body.supabase).toEqual({ configured: false, live: false })
    expect(body.nim).toEqual({ configured: false, live: false, model: 'nvidia/nemotron-3.5-bolt-e4b' })
    expect(body.voice).toEqual({
      configured: false,
      live: false,
      provider: 'mock',
      sttModel: 'saaras:v4',
      ttsModel: 'bulbul:v3',
      language: 'en-IN',
      speaker: 'shubh',
    })
    expect(JSON.stringify(body)).not.toContain('http')
    expect(JSON.stringify(body)).not.toMatch(/api-subscription-key|SARVAM_API_KEY|secret/i)
  })

  it('reports voice configured/live when a Sarvam key is present', async () => {
    const { app } = makeApp({ env: makeEnv({ sarvamApiKey: 'test-key' }) })
    const res = await app.request('/integration-status', { headers: WS })
    const body = await j(res)
    expect(body.voice.configured).toBe(true)
    expect(body.voice.live).toBe(true)
    expect(body.voice.provider).toBe('sarvam')
    expect(JSON.stringify(body)).not.toContain('test-key')
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

  it('marks configured supabase as not live when the phase-1 tables are unreachable', async () => {
    const { app } = makeApp({
      env: makeEnv({
        supabaseUrl: 'https://example.invalid.supabase.co',
        supabaseSecretKey: 'secret-role',
      }),
    })
    const res = await app.request('/integration-status', { headers: WS })
    const body = await j(res)
    expect(body.supabase.configured).toBe(true)
    expect(body.supabase.live).toBe(false)
  })
})
