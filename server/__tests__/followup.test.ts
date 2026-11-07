import { describe, expect, it } from 'vitest'
import { createNimClient, type NimLog } from '../providers/nim.js'
import { j, makeApp, makeEnv, WS } from './helpers.js'

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}

function completion(output: unknown): Response {
  return jsonResponse(200, { choices: [{ message: { content: JSON.stringify(output) } }] })
}

describe('NIM follow-up generation', () => {
  it('asks a contextual follow-up from role and previous answers', async () => {
    let prompt = ''
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      prompt = String(init?.body)
      return completion({ question: 'How did you decide to run that pilot?' })
    }) as typeof fetch
    const env = makeEnv({ nimApiKey: 'test-key' })
    const provider = createNimClient(env, fetchImpl, () => {}, 2000, 0, 2)
    const { app } = makeApp({ env, provider })
    const created = await app.request('/interviews', {
      method: 'POST',
      headers: { ...WS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Product Analyst' }),
    })
    const { id } = (await j(created)) as { id: string }
    const res = await app.request(`/interviews/${id}/turns`, {
      method: 'POST',
      headers: { ...WS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionIndex: 0,
        answer: 'I redesigned onboarding after a product update caused confusion.',
      }),
    })
    expect(res.status).toBe(201)
    expect((await j(res)).nextQuestion).toBe('How did you decide to run that pilot?')
    expect(prompt).toContain('Product Analyst')
    expect(prompt).toContain('Return the next question')
  })

  it('retries transient 500s a bounded number of times', async () => {
    let calls = 0
    const fetchImpl = (async () => {
      calls += 1
      if (calls < 3) return jsonResponse(500, { error: 'busy' })
      return completion({ question: 'What was yours to own?' })
    }) as typeof fetch
    const logs: { attempt?: number }[] = []
    const log: NimLog = entry => logs.push(entry)
    const env = makeEnv({ nimApiKey: 'test-key' })
    const provider = createNimClient(env, fetchImpl, log, 2000, 0, 3)
    const question = await provider.generateFollowUp({
      role: 'Product Analyst',
      industry: null,
      turns: [{ question: 'Q1', answer: 'A1 with enough detail.' }],
      nextIndex: 1,
    })
    expect(question).toBe('What was yours to own?')
    expect(calls).toBe(3)
  })
})
