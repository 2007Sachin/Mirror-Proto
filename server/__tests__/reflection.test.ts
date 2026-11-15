import { describe, expect, it } from 'vitest'
import { j, makeApp, makeEnv, WS } from './helpers.js'
import { createNimClient, type NimLog } from '../providers/nim.js'

const answers = [
  'I redesigned the customer onboarding journey and brought support and product together.',
  'I personally owned the rollout plan and decided to simplify the workflow itself.',
  'I encountered resistance from two teams, so I ran a five-person pilot to prove value.',
  'Completion improved measurably and next time I would involve support much earlier.',
]
const NOT_DONE = 'This session was not finished, so there are no notes to write yet.'

type LogEntry = { provider: 'nim'; status?: number; latencyMs: number }

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}

function completion(output: unknown): Response {
  return jsonResponse(200, { choices: [{ message: { content: JSON.stringify(output) } }] })
}

/** The three sections: verbatim quotes, the gap still open, one concrete suggestion. */
function validOutput(turnIds: string[]) {
  return {
    whatStoodOut: turnIds.slice(0, 3).map((turnId, i) => ({ turnId, quote: answers[i].split(',')[0] })),
    keepWorkingOn: 'The result is still vaguer than the action that led to it.',
    suggestion: 'Next time, say the outcome in one sentence before you explain how you got there.',
  }
}

const post = (app: ReturnType<typeof makeApp>['app'], path: string, body?: unknown) =>
  app.request(path, { method: 'POST', headers: { ...WS, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })

async function completeInterview(app: ReturnType<typeof makeApp>['app'], turnsToAnswer = 4) {
  const { id } = (await j(await post(app, '/interviews', { role: 'Product Analyst' }))) as { id: string }
  const turnIds: string[] = []
  for (let i = 0; i < turnsToAnswer; i++) {
    const body = await j(await post(app, `/interviews/${id}/turns`, { questionIndex: i, answer: answers[i] }))
    turnIds.push(body.turn.id as string)
  }
  return { id, turnIds }
}

function makeNimApp(fetchImpl: typeof fetch, log?: NimLog) {
  const env = makeEnv({ nimApiKey: 'test-key' })
  const nim = createNimClient(env, fetchImpl, log, 5_000, 0, 3)
  return makeApp({ env, provider: { generateReflection: request => nim.generateReflection(request) } })
}

const reflect = (app: ReturnType<typeof makeApp>['app'], id: string) => app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })

describe('POST /interviews/:id/reflect', () => {
  it('writes notes from their own words when NIM is not configured', async () => {
    const { app } = makeApp()
    const { id } = await completeInterview(app)
    const res = await reflect(app, id)
    expect(res.status).toBe(201)
    const body = await j(res)
    expect(body.source).toBe('fallback')
    expect(body.model).toBe('fallback')
    expect(body.suggestion).toMatch(/^Next time/)
    for (const e of body.evidence as { quote: string }[]) expect(answers.some(a => a.includes(e.quote))).toBe(true)
  })

  it('returns the three sections, persists them, and never stores a score', async () => {
    let capturedPrompt = ''
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      capturedPrompt = String(init?.body)
      return completion(validOutput(turnIds))
    }) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id, turnIds } = await completeInterview(app)

    const res = await reflect(app, id)
    expect(res.status).toBe(201)
    const body = await j(res)
    expect(body.evidence.map((e: { quote: string }) => e.quote)).toEqual([
      'I redesigned the customer onboarding journey and brought support and product together.',
      'I personally owned the rollout plan and decided to simplify the workflow itself.',
      'I encountered resistance from two teams',
    ])
    expect(body.focus).toBe('The result is still vaguer than the action that led to it.')
    expect(body.suggestion).toBe('Next time, say the outcome in one sentence before you explain how you got there.')
    expect(body.readinessLabel).toBeNull()
    expect(body.readinessRange).toBeNull()

    const session = await j(await app.request(`/interviews/${id}`, { headers: WS }))
    expect(session.reflection.id).toBe(body.id)
    expect(session.reflection.suggestion).toBe(body.suggestion)
    expect(capturedPrompt).toContain('Product Analyst')
    expect(capturedPrompt).toContain('Do not score, grade, or praise.')
  })

  it('passes the previous session’s focus so it can say whether they moved', async () => {
    const prompts: string[] = []
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      prompts.push(String(init?.body))
      return completion(validOutput(turnIds))
    }) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    let { id, turnIds } = await completeInterview(app)
    expect((await reflect(app, id)).status).toBe(201)
    expect(prompts[0]).not.toContain('previous_focus:')
    ;({ id, turnIds } = await completeInterview(app))
    expect((await reflect(app, id)).status).toBe(201)
    expect(prompts[1]).toContain('previous_focus: The result is still vaguer than the action that led to it.')
  })

  it('refuses an unfinished session with the agreed message', async () => {
    const { app } = makeNimApp((async () => completion({})) as typeof fetch)
    const { id } = await completeInterview(app, 2)
    const res = await reflect(app, id)
    expect(res.status).toBe(409)
    const body = await j(res)
    expect(body.error).toBe('interview_incomplete')
    expect(body.message).toBe(NOT_DONE)
  })

  it('falls back to their own words when a quote references an unknown turn id', async () => {
    const fetchImpl = (async () => completion(validOutput(['turn-1', 'turn-2', 'turn-3']))) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id } = await completeInterview(app)
    const res = await reflect(app, id)
    expect(res.status).toBe(201)
    expect((await j(res)).source).toBe('fallback')
  })

  it('falls back when a quote is not verbatim', async () => {
    const output = {
      whatStoodOut: [{ turnId: 'PLACEHOLDER', quote: 'I totally restructured onboarding from the ground up.' }],
      keepWorkingOn: 'Name your own part first.',
      suggestion: 'Open with the decision you made.',
    }
    const appState = makeNimApp((async () => completion(output)) as typeof fetch)
    const session = await completeInterview(appState.app)
    output.whatStoodOut[0].turnId = session.turnIds[0]
    const res = await reflect(appState.app, session.id)
    expect(res.status).toBe(201)
    const body = await j(res)
    expect(body.source).toBe('fallback')
    for (const e of body.evidence as { quote: string }[]) expect(answers.some(a => a.includes(e.quote))).toBe(true)
  })

  it('keeps at most three quotes', async () => {
    const fetchImpl = (async () =>
      completion({ ...validOutput(turnIds), whatStoodOut: turnIds.map((turnId, i) => ({ turnId, quote: answers[i].slice(0, 20) })) })) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id, turnIds } = await completeInterview(app)
    const res = await reflect(app, id)
    expect(res.status).toBe(201)
    expect((await j(res)).evidence.length).toBe(3)
  })

  it('falls back when fetch throws', async () => {
    const { app } = makeNimApp((async () => { throw new Error('network down') }) as typeof fetch)
    const { id } = await completeInterview(app)
    const res = await reflect(app, id)
    expect(res.status).toBe(201)
    expect((await j(res)).source).toBe('fallback')
  })

  it('falls back when the provider responds 500', async () => {
    const { app } = makeNimApp((async () => jsonResponse(500, { error: 'boom' })) as typeof fetch)
    const { id } = await completeInterview(app)
    const res = await reflect(app, id)
    expect(res.status).toBe(201)
    expect((await j(res)).source).toBe('fallback')
  })

  it('falls back within the deadline when the provider never answers', async () => {
    const env = makeEnv({ nimApiKey: 'test-key' })
    const nim = createNimClient(env, (() => new Promise(() => {})) as unknown as typeof fetch, undefined, 5_000, 0, 3, 30)
    const { app } = makeApp({ env, provider: nim, aiDeadlineMs: 30 })
    const { id } = await completeInterview(app)
    const started = Date.now()
    const res = await reflect(app, id)
    expect(Date.now() - started).toBeLessThan(1_000)
    expect(res.status).toBe(201)
    expect((await j(res)).source).toBe('fallback')
  })

  it('keeps the fallback marker after a reload', async () => {
    const { app, repo } = makeApp()
    const { id } = await completeInterview(app)
    await reflect(app, id)
    const { app: reloaded } = makeApp({ repo })
    const body = await j(await reloaded.request(`/interviews/${id}`, { headers: WS }))
    expect(body.reflection.source).toBe('fallback')
  })

  it('accepts nested JSON with alternate field names', async () => {
    const fetchImpl = (async () => {
      const valid = validOutput(turnIds)
      return completion({
        reflection: {
          what_stood_out: valid.whatStoodOut.map(q => ({ turn_id: q.turnId, excerpt: q.quote })),
          keep_working_on: valid.keepWorkingOn,
          next_step: valid.suggestion,
        },
      })
    }) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id, turnIds } = await completeInterview(app)
    const res = await reflect(app, id)
    expect(res.status).toBe(201)
    expect((await j(res)).suggestion).toBe(validOutput(turnIds).suggestion)
  })

  it('parses JSON embedded in prose', async () => {
    const fetchImpl = (async () =>
      jsonResponse(200, { choices: [{ message: { content: `Here are the notes.\n${JSON.stringify(validOutput(turnIds))}` } }] })) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id, turnIds } = await completeInterview(app)
    expect((await reflect(app, id)).status).toBe(201)
  })

  it('falls back when the provider returns garbage', async () => {
    const fetchImpl = (async () => jsonResponse(200, { choices: [{ message: { content: 'not json at all' } }] })) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id } = await completeInterview(app)
    const res = await reflect(app, id)
    expect(res.status).toBe(201)
    expect((await j(res)).source).toBe('fallback')
  })

  it('retries with json_object when json_schema returns non-JSON prose', async () => {
    const bodies: string[] = []
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      bodies.push(String(init?.body))
      if (bodies.length === 1) return jsonResponse(200, { choices: [{ message: { content: 'Looks like a solid session overall.' } }] })
      return completion(validOutput(turnIds))
    }) as typeof fetch
    const { app } = makeNimApp(fetchImpl)
    const { id, turnIds } = await completeInterview(app)
    expect((await reflect(app, id)).status).toBe(201)
    expect(JSON.parse(bodies[0]).response_format.type).toBe('json_schema')
    expect(JSON.parse(bodies[1]).response_format.type).toBe('json_object')
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
    expect((await reflect(app, id)).status).toBe(201)
    expect(JSON.parse(bodies[1]).response_format.type).toBe('json_object')
  })

  it('logs contain no answer or prompt content', async () => {
    const logs: LogEntry[] = []
    const fetchImpl = (async () => completion(validOutput(turnIds))) as typeof fetch
    const { app } = makeNimApp(fetchImpl, entry => logs.push(entry))
    const { id, turnIds } = await completeInterview(app)
    await reflect(app, id)
    expect(logs.length).toBeGreaterThan(0)
    const serialized = JSON.stringify(logs)
    for (const answer of answers) expect(serialized).not.toContain(answer.slice(0, 40))
    expect(serialized).not.toContain('Q1:')
    expect(logs[0]).toHaveProperty('provider', 'nim')
  })

  it('retries reflection without duplicating turns', async () => {
    const fetchImpl = (async () => completion(validOutput(turnIds))) as typeof fetch
    const { app, repo } = makeNimApp(fetchImpl)
    const { id, turnIds } = await completeInterview(app)
    expect((await reflect(app, id)).status).toBe(201)
    expect((await reflect(app, id)).status).toBe(201)
    expect((await repo.getTurns('dev', id)).length).toBe(4)
  })

  it('never attaches another session’s quotes; it falls back to this session’s words', async () => {
    const foreign = {
      whatStoodOut: [{ turnId: 'other-interview-turn', quote: answers[0].slice(0, 20) }],
      keepWorkingOn: 'Something from elsewhere.',
      suggestion: 'Something from elsewhere.',
    }
    const { app } = makeNimApp((async () => completion(foreign)) as typeof fetch)
    const session = await completeInterview(app)
    const res = await reflect(app, session.id)
    expect(res.status).toBe(201)
    const body = await j(res)
    expect(body.source).toBe('fallback')
    expect(body.evidence.every((e: { turnId: string }) => session.turnIds.includes(e.turnId))).toBe(true)
  })
})
