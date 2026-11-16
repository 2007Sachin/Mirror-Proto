import { describe, expect, it } from 'vitest'
import { makeApp } from './helpers.js'

const A = { 'X-Test-User': 'alpha', 'Content-Type': 'application/json' }
const story = { title: 'Fixed churn', themes: ['ownership'], situation: 's', task: 't', action: 'a', result: 'r', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null }
const ALL = ['leadership', 'conflict', 'failure', 'ownership', 'ambiguity', 'influence', 'deadline-pressure', 'data-driven', 'customer-focus', 'learning', 'collaboration', 'mistake-recovery']

describe('stories validation', () => {
  const post = (app: ReturnType<typeof makeApp>['app'], body: unknown) => app.request('/stories', { method: 'POST', headers: A, body: JSON.stringify(body) })

  it('accepts all 12 themes', async () => {
    const { app } = makeApp()
    expect((await post(app, { ...story, themes: ALL })).status).toBe(201)
  })
  it('rejects unknown, duplicate and more than 12 themes', async () => {
    const { app } = makeApp()
    expect((await post(app, { ...story, themes: [...ALL, 'leadership'] })).status).toBe(400)
    expect((await post(app, { ...story, themes: ['impact'] })).status).toBe(400)
    expect((await post(app, { ...story, themes: ['failure', 'failure'] })).status).toBe(400)
  })
  it('caps field lengths and validates patches too', async () => {
    const { app } = makeApp()
    expect((await post(app, { ...story, situation: 'x'.repeat(2001) })).status).toBe(400)
    const made = (await (await post(app, story)).json()) as { id: string }
    const patch = (b: unknown) => app.request(`/stories/${made.id}`, { method: 'PATCH', headers: A, body: JSON.stringify(b) })
    expect((await patch({ themes: ['nope'] })).status).toBe(400)
    expect((await patch({ themes: ['learning'] })).status).toBe(200)
  })
})
