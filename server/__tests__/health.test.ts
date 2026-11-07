import { describe, expect, it } from 'vitest'
import { j, makeApp, WS } from './helpers.js'

describe('GET /health', () => {
  it('returns ok with memory mode and uptime', async () => {
    const { app } = makeApp()
    const res = await app.request('/health', { headers: WS })
    expect(res.status).toBe(200)
    const body = await j(res)
    expect(body.status).toBe('ok')
    expect(body.mode).toBe('memory')
    expect(typeof body.uptime).toBe('number')
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
})
