import { describe, expect, it } from 'vitest'
import { j, makeApp, makeEnv, WS } from './helpers.js'
import { createNimClient, type NimLog } from '../providers/nim.js'

const answers = [
  'I redesigned the customer onboarding journey and brought support and product together.',
  'I personally owned the rollout plan and decided to simplify the workflow itself.',
  'I encountered resistance from two teams, so I ran a five-person pilot to prove value.',
  'Completion improved measurably and next time I would involve support much earlier.',
]

type LogEntry = { provider: 'nim'; status?: number; latencyMs: number }

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}

function completion(output: unknown): Response {
  return jsonResponse(200, { choices: [{ message: { content: JSON.stringify(output) } }] })
}

function validOutput(turnIds: string[]) {
  return {
    readinessLabel: 'solid',
    readinessRange: { low: 62, high: 72 },
    evidence: turnIds.map((turnId, i) => ({
      turnId,
      quote: answers[i].split('.')[0] + '.',
      observation: `Observed competency ${i + 1}.`,
      competency: ['Ownership', 'Decision-making', 'Adaptability', 'Impact'][i],
    })),
    focus: 'Make the result as clear as the action.',
  }
}

async function completeInterview(app: ReturnType<typeof makeApp>['app']) {
  const created = await app.request('/interviews', {
    method: 'POST',
    headers: { ...WS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'Product Analyst' }),
  })
  const { id } = (await j(created)) as { id: string }
  const turnIds: string[] = []
  for (let i = 0; i < 4; i++) {
    const res = await app.request(`/interviews/${id}/turns`, {
      method: 'POST',
      headers: { ...WS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIndex: i, answer: answers[i] }),
    })
    const body = await j(res)
    turnIds.push(body.turn.id as string)
  }
  return { id, turnIds }
}

function makeNimApp(fetchImpl: typeof fetch, log?: NimLog) {
  const env = makeEnv({ nimApiKey: 'test-key' })
  const nim = createNimClient(env, fetchImpl, log, 5_000, 0, 3)
  return makeApp({
    env,
    provider: {
      generateReflection: request => nim.generateReflection(request),
    },
  })
}

describe('POST /interviews/:id/reflect', () => {
  it('returns 503 when NIM is not configured', async () => {
    const { app } = makeApp()
    const created = await app.request('/interviews', {
      method: 'POST',
      headers: { ...WS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Product Analyst' }),
    })
    const { id } = (await j(created)) as { id: string }
    for (let i = 0; i < 4; i++) {
      await app.request(`/interviews/${id}/turns`, {
        method: 'POST',
        headers: { ...WS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIndex: i, answer: answers[i] }),
      })
    }
    const res = await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(res.status).toBe(503)
    expect((await j(res)).error).toBe('reflection_provider_unavailable')
  })

  it('accepts valid provider output, persists it, and reloads it', async () => {
    let capturedPrompt = ''
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      capturedPrompt = String(init?.body)
      return completion(validOutput(turnIds))
    }) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id, turnIds } = await completeInterview(app)

    const res = await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(res.status).toBe(201)
    const body = await j(res)
    expect(body.readinessLabel).toBe('solid')
    expect(body.readinessRange).toEqual({ low: 62, high: 72 })
    expect(body.evidence.length).toBe(4)
    expect(body.model).toBe('meta/llama-3.3-70b-instruct')

    const reload = await app.request(`/interviews/${id}`, { headers: WS })
    const session = await j(reload)
    expect(session.reflection.evidence.length).toBe(4)
    expect(session.reflection.id).toBe(body.id)
    expect(capturedPrompt).toContain('Product Analyst')
  })

  it('rejects evidence referencing an unknown turn id with 400', async () => {
    const output = validOutput(['turn-1', 'turn-2', 'turn-3', 'turn-4'])
    const fetchImpl = (async () => completion(output)) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id } = await completeInterview(app)
    const res = await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(res.status).toBe(400)
    expect((await j(res)).error).toBe('invalid_evidence_turn_id')
  })

  it('rejects a paraphrased quote that is not an exact substring with 400', async () => {
    const output = {
      readinessLabel: 'solid',
      readinessRange: { low: 62, high: 72 },
      evidence: [
        { turnId: 'PLACEHOLDER', quote: 'I totally restructured onboarding from the ground up.', observation: 'Obs.', competency: 'Ownership' },
      ],
      focus: 'Focus.',
    }
    const fetchImpl = (async () => completion(output)) as typeof fetch
    const appState = makeNimApp(fetchImpl)
    const session = await completeInterview(appState.app)
    output.evidence[0].turnId = session.turnIds[0]
    const res = await appState.app.request(`/interviews/${session.id}/reflect`, { method: 'POST', headers: WS })
    expect(res.status).toBe(400)
    expect((await j(res)).error).toBe('invalid_evidence_quote')
  })

  it('strips a numeric readiness range when evidence is empty', async () => {
    const output = {
      readinessLabel: 'solid',
      readinessRange: { low: 62, high: 72 },
      evidence: [],
      focus: 'Focus.',
    }
    const fetchImpl = (async () => completion(output)) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id } = await completeInterview(app)
    const res = await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(res.status).toBe(201)
    const body = await j(res)
    expect(body.readinessRange).toBeNull()
  })

  it('returns 502 when fetch throws', async () => {
    const fetchImpl = (async () => { throw new Error('network down') }) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id } = await completeInterview(app)
    const res = await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(res.status).toBe(502)
    expect((await j(res)).error).toBe('reflection_provider_failed')
  })

  it('returns 502 when the provider responds 500', async () => {
    const fetchImpl = (async () => jsonResponse(500, { error: 'boom' })) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id } = await completeInterview(app)
    const res = await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(res.status).toBe(502)
    expect((await j(res)).error).toBe('reflection_provider_failed')
  })

  it('returns 502 when the provider returns garbage', async () => {
    const fetchImpl = (async () => jsonResponse(200, { choices: [{ message: { content: 'not json at all' } }] })) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id } = await completeInterview(app)
    const res = await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(res.status).toBe(502)
    expect((await j(res)).error).toBe('reflection_provider_failed')
  })

  it('retries with json_object when json_schema is rejected (400) and succeeds', async () => {
    const bodies: string[] = []
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      bodies.push(String(init?.body))
      if (bodies.length === 1) return jsonResponse(400, { error: 'unsupported response_format' })
      return completion(validOutput(turnIds))
    }) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id, turnIds } = await completeInterview(app)
    const res = await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(res.status).toBe(201)
    expect(JSON.parse(bodies[0]).response_format.type).toBe('json_schema')
    expect(JSON.parse(bodies[1]).response_format.type).toBe('json_object')
  })

  it('logs contain no answer or prompt content', async () => {
    const logs: LogEntry[] = []
    const log: NimLog = entry => logs.push(entry)
    const output = { readinessLabel: 'emerging', readinessRange: null, evidence: [], focus: 'Focus.' }
    const fetchImpl = (async () => completion(output)) as typeof fetch
    const { app } = makeNimApp(fetchImpl, log)
    const { id } = await completeInterview(app)
    await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(logs.length).toBeGreaterThan(0)
    const serialized = JSON.stringify(logs)
    for (const answer of answers) {
      expect(serialized).not.toContain(answer.slice(0, 40))
    }
    expect(serialized).not.toContain('Q1:')
    expect(serialized).not.toContain('redesigned')
    expect(logs[0]).toHaveProperty('provider', 'nim')
    expect(typeof logs[0].latencyMs).toBe('number')
  })

  it('retries reflection without duplicating turns', async () => {
    const fetchImpl = (async () => completion(validOutput(turnIds))) as typeof fetch
    const { app, repo } = makeNimApp(fetchImpl)
    const { id, turnIds } = await completeInterview(app)
    const first = await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(first.status).toBe(201)
    const second = await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(second.status).toBe(201)
    expect((await repo.getTurns('dev', id)).length).toBe(4)
  })

  it('does not attach another role’s evidence to this interview', async () => {
    const foreign = {
      readinessLabel: 'strong' as const,
      readinessRange: { low: 80, high: 90 },
      evidence: [
        { turnId: 'other-interview-turn', quote: answers[0].slice(0, 20), observation: 'From another role.', competency: 'Ownership' },
      ],
      focus: 'Focus.',
    }
    const { app } = makeNimApp((async () => completion(foreign)) as typeof fetch)
    const session = await completeInterview(app)
    const res = await app.request(`/interviews/${session.id}/reflect`, { method: 'POST', headers: WS })
    expect(res.status).toBe(400)
    expect((await j(res)).error).toBe('invalid_evidence_turn_id')
  })
})
