import { describe, expect, it } from 'vitest'
import { FIXED_QUESTIONS } from '../domain/questions.js'
import { j, makeApp, WS } from './helpers.js'

const answers = [
  'Our customer onboarding process was causing confusion after a major product update.',
  'I owned the research and the rollout plan, and chose to simplify the workflow itself.',
  'Two teams worried the change would create more work, so I ran a small pilot first.',
  'Completion improved and new customers needed fewer manual walkthroughs afterwards.',
]

async function createInterview(app: ReturnType<typeof makeApp>['app'], role = 'Product Analyst') {
  const res = await app.request('/interviews', {
    method: 'POST',
    headers: { ...WS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, industry: 'Technology / SaaS' }),
  })
  expect(res.status).toBe(201)
  return (await j(res)) as { id: string }
}

async function postTurn(
  app: ReturnType<typeof makeApp>['app'],
  id: string,
  questionIndex: number,
  answer: string,
  extraHeaders: Record<string, string> = {},
) {
  return app.request(`/interviews/${id}/turns`, {
    method: 'POST',
    headers: { ...WS, 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify({ questionIndex, answer }),
  })
}

describe('POST /interviews', () => {
  it('creates an interview with the four fixed questions', async () => {
    const { app } = makeApp()
    const res = await app.request('/interviews', {
      method: 'POST',
      headers: { ...WS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Product Manager' }),
    })
    expect(res.status).toBe(201)
    const body = await j(res)
    expect(body.status).toBe('in_progress')
    expect(body.questions).toEqual(FIXED_QUESTIONS)
    expect(body.nextQuestionIndex).toBe(0)
    expect(body.turns).toEqual([])
    expect(body.workspace).toBe('dev')
  })

  it('rejects a missing role with 400', async () => {
    const { app } = makeApp()
    const res = await app.request('/interviews', {
      method: 'POST',
      headers: { ...WS, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /interviews/:id/turns', () => {
  it('accepts four ordered turns and completes on the fourth', async () => {
    const { app } = makeApp()
    const { id } = await createInterview(app)
    for (let i = 0; i < 4; i++) {
      const res = await postTurn(app, id, i, answers[i])
      expect(res.status).toBe(201)
      const body = await j(res)
      expect(body.turn.questionIndex).toBe(i)
      expect(body.turn.question).toBe(FIXED_QUESTIONS[i])
      expect(body.status).toBe(i === 3 ? 'completed' : 'in_progress')
      expect(body.nextQuestionIndex).toBe(i === 3 ? null : i + 1)
    }
  })

  it('rejects an empty answer with 400', async () => {
    const { app } = makeApp()
    const { id } = await createInterview(app)
    const res = await postTurn(app, id, 0, '   ')
    expect(res.status).toBe(400)
    expect((await j(res)).error).toBe('empty_answer')
  })

  it('rejects a duplicate question index with 409', async () => {
    const { app } = makeApp()
    const { id } = await createInterview(app)
    await postTurn(app, id, 0, answers[0])
    const res = await postTurn(app, id, 0, answers[0])
    expect(res.status).toBe(409)
    expect((await j(res)).error).toBe('duplicate_question_index')
  })

  it('rejects an out-of-order question index with 409 and expected index', async () => {
    const { app } = makeApp()
    const { id } = await createInterview(app)
    const res = await postTurn(app, id, 2, answers[2])
    expect(res.status).toBe(409)
    const body = await j(res)
    expect(body.error).toBe('out_of_order_question_index')
    expect(body.expected).toBe(0)
  })

  it('rejects a fifth turn after completion with 409', async () => {
    const { app } = makeApp()
    const { id } = await createInterview(app)
    for (let i = 0; i < 4; i++) await postTurn(app, id, i, answers[i])
    const res = await postTurn(app, id, 3, answers[3])
    expect(res.status).toBe(409)
    expect((await j(res)).error).toBe('interview_already_completed')
  })

  it('returns 404 for an unknown interview', async () => {
    const { app } = makeApp()
    const res = await postTurn(app, 'no-such-id', 0, answers[0])
    expect(res.status).toBe(404)
    expect((await j(res)).error).toBe('interview_not_found')
  })

  it('replays the cached response for a repeated Idempotency-Key', async () => {
    const { app, repo } = makeApp()
    const { id } = await createInterview(app)
    const first = await postTurn(app, id, 0, answers[0], { 'Idempotency-Key': 'abc' })
    expect(first.status).toBe(201)
    const firstBody = await j(first)
    const second = await postTurn(app, id, 0, answers[0], { 'Idempotency-Key': 'abc' })
    expect(second.status).toBe(201)
    expect(await j(second)).toEqual(firstBody)
    // No duplicate insert happened.
    expect((await repo.getTurns('dev', id)).length).toBe(1)
  })

  it('reflect on an incomplete interview returns 409 with answer count', async () => {
    const { app } = makeApp()
    const { id } = await createInterview(app)
    for (let i = 0; i < 3; i++) await postTurn(app, id, i, answers[i])
    const res = await app.request(`/interviews/${id}/reflect`, { method: 'POST', headers: WS })
    expect(res.status).toBe(409)
    const body = await j(res)
    expect(body.error).toBe('interview_incomplete')
    expect(body.answers).toBe(3)
  })
})

describe('GET /interviews/:id', () => {
  it('reloads a full session including turns', async () => {
    const { app } = makeApp()
    const { id } = await createInterview(app)
    for (let i = 0; i < 4; i++) await postTurn(app, id, i, answers[i])
    const res = await app.request(`/interviews/${id}`, { headers: WS })
    expect(res.status).toBe(200)
    const body = await j(res)
    expect(body.status).toBe('completed')
    expect(body.turns.length).toBe(4)
    expect(body.reflection).toBeNull()
    expect(body.questions).toEqual(FIXED_QUESTIONS)
  })

  it('returns 404 across the workspace boundary', async () => {
    const { app } = makeApp()
    const { id } = await createInterview(app)
    const res = await app.request(`/interviews/${id}`, { headers: { 'X-Dev-Workspace': 'other' } })
    expect(res.status).toBe(404)
  })
})
