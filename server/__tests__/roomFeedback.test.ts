import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeApp } from './helpers.js'

const A = { 'X-Test-User': 'alpha', 'Content-Type': 'application/json' }
const B = { 'X-Test-User': 'beta', 'Content-Type': 'application/json' }

async function setup() {
  const { app } = makeApp()
  const created = await app.request('/interviews', { method: 'POST', headers: A, body: JSON.stringify({ role: 'Analyst' }) })
  const { id } = await created.json() as { id: string }
  return { app, id }
}
const post = (app: ReturnType<typeof makeApp>['app'], headers: Record<string, string>, body: unknown) =>
  app.request('/room/feedback', { method: 'POST', headers, body: JSON.stringify(body) })

afterEach(() => vi.restoreAllMocks())

describe('POST /room/feedback', () => {
  it('logs one line and returns 204 for the owner', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { app, id } = await setup()
    expect((await post(app, A, { interviewId: id, followed: true })).status).toBe(204)
    expect(spy).toHaveBeenCalledWith(JSON.stringify({ event: 'room_feedback', interviewId: id, followed: true }))
  })
  it('404s for another user interview and logs nothing', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { app, id } = await setup()
    expect((await post(app, B, { interviewId: id, followed: false })).status).toBe(404)
    expect(spy).not.toHaveBeenCalled()
  })
  it('validates the body and needs a signed-in user', async () => {
    const { app, id } = await setup()
    expect((await post(app, A, { interviewId: id, followed: 'yes' })).status).toBe(400)
    expect((await post(app, A, { followed: true })).status).toBe(400)
    expect((await post(app, {}, { interviewId: id, followed: true })).status).toBe(401)
  })
})
