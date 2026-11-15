import { describe, expect, it } from 'vitest'
import { j, makeApp, makeEnv, WS } from './helpers.js'
import { createMemoryRepository } from '../repo/memory.js'
import { createSupabaseRepository } from '../repo/supabase.js'

type App = ReturnType<typeof makeApp>['app']
const A = { 'X-Dev-Workspace': 'alpha', 'Content-Type': 'application/json' }
const B = { 'X-Dev-Workspace': 'beta', 'Content-Type': 'application/json' }
const send = (app: App, method: string, path: string, headers: Record<string, string>, body?: unknown) =>
  app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })

const attempt = { interviewId: null, questionIndex: null, question: 'Why that join?', attempt: 1, answer: 'Because of the keys.', kind: 'explain', itemId: 'sql-1' }
const story = { title: 'Fixed churn', themes: ['impact'], situation: 's', task: 't', action: 'a', result: 'r', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null }
const QS = ['Tell me about a project you led?', 'What was your own part in it?', 'What got in the way?', 'What changed because of it?', 'What would you do differently?', 'Why this role now?']

describe('answer attempts routes', () => {
  it('adds, lists with filters, isolates workspaces, deletes', async () => {
    const { app } = makeApp()
    const created = await send(app, 'POST', '/replay/attempts', A, attempt)
    expect(created.status).toBe(201)
    expect((await j(created)).transcriptSource).toBe('text')
    await send(app, 'POST', '/api/replay/attempts', A, { ...attempt, kind: 'retry', itemId: null, interviewId: 'i1', questionIndex: 0 })
    expect(await j(await send(app, 'GET', '/replay/attempts', A))).toHaveLength(2)
    expect(await j(await send(app, 'GET', '/replay/attempts?kind=explain', A))).toHaveLength(1)
    expect(await j(await send(app, 'GET', '/replay/attempts?interviewId=i1', A))).toHaveLength(1)
    expect((await send(app, 'GET', '/replay/attempts?kind=bogus', A)).status).toBe(400)
    expect(await j(await send(app, 'GET', '/replay/attempts', B))).toEqual([])
    expect((await send(app, 'DELETE', '/replay/attempts', B)).status).toBe(204)
    expect(await j(await send(app, 'GET', '/replay/attempts', A))).toHaveLength(2)
    expect((await send(app, 'DELETE', '/replay/attempts', A)).status).toBe(204)
    expect(await j(await send(app, 'GET', '/replay/attempts', A))).toEqual([])
  })

  it('validates the body and requires the workspace header', async () => {
    const { app } = makeApp()
    expect((await send(app, 'POST', '/replay/attempts', A, { ...attempt, kind: 'nope' })).status).toBe(400)
    expect((await send(app, 'POST', '/replay/attempts', A, { ...attempt, answer: '' })).status).toBe(400)
    expect((await send(app, 'GET', '/replay/attempts', {})).status).toBe(400)
  })
})

describe('stories routes', () => {
  it('create, get, patch, list newest first, delete, delete all, isolation', async () => {
    const { app } = makeApp()
    const one = await j(await send(app, 'POST', '/stories', A, story))
    const two = await j(await send(app, 'POST', '/stories', A, { ...story, title: 'Second' }))
    expect((await j(await send(app, 'GET', '/stories', A))).map((s: { title: string }) => s.title)).toEqual(['Second', 'Fixed churn'])
    expect((await send(app, 'GET', `/stories/${one.id}`, B)).status).toBe(404)
    const patched = await j(await send(app, 'PATCH', `/stories/${one.id}`, A, { title: 'Renamed' }))
    expect(patched).toMatchObject({ id: one.id, title: 'Renamed', result: 'r' })
    expect((await send(app, 'PATCH', '/stories/missing', A, { title: 'x' })).status).toBe(404)
    expect((await send(app, 'PATCH', `/stories/${one.id}`, A, { title: '' })).status).toBe(400)
    expect((await send(app, 'POST', '/stories', A, { ...story, title: '' })).status).toBe(400)
    expect((await send(app, 'DELETE', `/stories/${two.id}`, A)).status).toBe(204)
    expect(await j(await send(app, 'GET', '/stories', A))).toHaveLength(1)
    await send(app, 'POST', '/stories', B, story)
    expect((await send(app, 'DELETE', '/stories', A)).status).toBe(204)
    expect(await j(await send(app, 'GET', '/stories', A))).toEqual([])
    expect(await j(await send(app, 'GET', '/stories', B))).toHaveLength(1)
  })
})

describe('resume claims and gap match routes', () => {
  it('replaces and lists claims per workspace', async () => {
    const { app } = makeApp()
    const claims = [{ quote: 'Built weekly reports', skills: ['SQL'], hasNumber: false, vague: false }]
    expect((await j(await send(app, 'PUT', '/resume/claims', A, { claims }))).length).toBe(1)
    await send(app, 'PUT', '/resume/claims', A, { claims: [...claims, { ...claims[0], quote: 'Cut costs by 10' }] })
    expect(await j(await send(app, 'GET', '/resume/claims', A))).toHaveLength(2)
    expect(await j(await send(app, 'GET', '/resume/claims', B))).toEqual([])
    expect((await send(app, 'PUT', '/resume/claims', A, { claims: [{ quote: '' }] })).status).toBe(400)
    expect((await send(app, 'DELETE', '/resume/claims', A)).status).toBe(204)
    expect(await j(await send(app, 'GET', '/resume/claims', A))).toEqual([])
  })

  it('gap matches need an existing target in the workspace', async () => {
    const { app } = makeApp()
    const target = await j(await send(app, 'POST', '/targets', A, { company: 'Acme', role: 'Analyst', jd: 'We need strong SQL and Python skills for this role.' }))
    const match = { skill: 'SQL', area: 'sql', weight: 'core', status: 'gap', claimQuote: null, note: 'n', probeQuestion: null, source: 'fallback' }
    const put = await send(app, 'PUT', `/targets/${target.id}/match`, A, { matches: [match] })
    expect(put.status).toBe(200)
    expect((await j(await send(app, 'GET', `/targets/${target.id}/match`, A))).matches).toHaveLength(1)
    expect((await send(app, 'GET', `/targets/${target.id}/match`, B)).status).toBe(404)
    expect((await send(app, 'PUT', `/targets/${target.id}/match`, B, { matches: [match] })).status).toBe(404)
    expect((await send(app, 'PUT', `/targets/${target.id}/match`, A, { matches: [{ ...match, status: 'x' }] })).status).toBe(400)
    await send(app, 'DELETE', `/targets/${target.id}`, A)
    expect((await send(app, 'GET', `/targets/${target.id}/match`, A)).status).toBe(404)
  })
})

describe('replay schedule routes', () => {
  it('upserts one row per item and deletes by itemId', async () => {
    const { app } = makeApp()
    const item = { itemId: 'sql-1', dueAt: '2026-02-05T00:00:00.000Z', intervalDays: 3, rung: 1, lastResult: true }
    await send(app, 'PUT', '/practice/schedule', A, item)
    await send(app, 'PUT', '/practice/schedule', A, { ...item, rung: 2 })
    const list = await j(await send(app, 'GET', '/practice/schedule', A))
    expect(list).toHaveLength(1)
    expect(list[0].rung).toBe(2)
    expect(await j(await send(app, 'GET', '/practice/schedule', B))).toEqual([])
    expect((await send(app, 'DELETE', '/practice/schedule', A)).status).toBe(400)
    expect((await send(app, 'DELETE', '/practice/schedule?itemId=sql-1', A)).status).toBe(204)
    expect(await j(await send(app, 'GET', '/practice/schedule', A))).toEqual([])
  })
})

describe('DELETE /data', () => {
  it('clears the new stores for the workspace only', async () => {
    const { app } = makeApp()
    await send(app, 'POST', '/stories', A, story)
    await send(app, 'POST', '/stories', B, story)
    await send(app, 'POST', '/replay/attempts', A, attempt)
    expect((await send(app, 'DELETE', '/data', A)).status).toBe(204)
    expect(await j(await send(app, 'GET', '/stories', A))).toEqual([])
    expect(await j(await send(app, 'GET', '/replay/attempts', A))).toEqual([])
    expect(await j(await send(app, 'GET', '/stories', B))).toHaveLength(1)
  })
})

describe('GET /capabilities', () => {
  it('memory mode keeps the new data on the server and allows long screens', async () => {
    const { app } = makeApp()
    expect(await j(await app.request('/capabilities'))).toEqual({ newData: 'server', screenLongCalls: true })
  })

  it('supabase mode keeps new data in the browser; long screens need SCREEN_DB_READY', async () => {
    const base = { supabaseUrl: 'https://example.supabase.co', supabaseSecretKey: 'k' }
    const repo = createSupabaseRepository(base.supabaseUrl, base.supabaseSecretKey)
    const off = makeApp({ env: makeEnv(base), repo })
    expect(await j(await off.app.request('/api/capabilities'))).toEqual({ newData: 'browser', screenLongCalls: false })
    const on = makeApp({ env: makeEnv({ ...base, screenDbReady: true }), repo })
    expect(await j(await on.app.request('/capabilities'))).toEqual({ newData: 'browser', screenLongCalls: true })
  })

  it('a not-ready store answers 503 storage_not_ready', async () => {
    const repo = createSupabaseRepository('https://example.supabase.co', 'k')
    const app = makeApp({ repo: { ...repo, ensureWorkspace: async () => {} } }).app
    const res = await send(app, 'GET', '/stories', A)
    expect(res.status).toBe(503)
    expect((await j(res)).error).toBe('storage_not_ready')
  })
})

describe('screen interviews', () => {
  const create = (app: App, body: Record<string, unknown> = {}) =>
    send(app, 'POST', '/interviews', { ...WS, 'Content-Type': 'application/json' }, { role: 'Analyst', kind: 'screen', questions: QS.slice(0, 5), timeCapMinutes: 8, ...body })
  const answer = (app: App, id: string, i: number) =>
    send(app, 'POST', `/interviews/${id}/turns`, { ...WS, 'Content-Type': 'application/json' }, { questionIndex: i, answer: `Answer number ${i} with enough detail in it.` })

  it('creates a screen with the metadata and every question seeded', async () => {
    const { app } = makeApp()
    const res = await create(app, { questions: QS })
    expect(res.status).toBe(201)
    const body = await j(res)
    expect(body).toMatchObject({ kind: 'screen', questionCap: 6, timeCapSeconds: 480, targetId: null, nextQuestionIndex: 0, pendingFollowUp: false })
    expect(body.questions).toEqual(QS)
    expect(typeof body.startedAt).toBe('string')
    expect(body.currentQuestion).toBe(QS[0])
  })

  it('rejects a screen without questions, or with too few or malformed ones', async () => {
    const { app } = makeApp()
    expect((await create(app, { questions: undefined })).status).toBe(400)
    expect((await create(app, { questions: QS.slice(0, 4) })).status).toBe(400)
    expect((await create(app, { questions: [...QS.slice(0, 4), 'no question mark here at all'] })).status).toBe(400)
    expect((await create(app, { timeCapMinutes: 3 })).status).toBe(400)
  })

  it('walks all of its questions without asking for any follow-up, then completes', async () => {
    const { app } = makeApp({ provider: { async generateReflection() { throw new Error('unused') }, async generateFollowUp() { throw new Error('follow-ups must be skipped') } } })
    const { id } = await j(await create(app, { questions: QS.slice(0, 5) }))
    for (let i = 0; i < 4; i++) {
      const r = await j(await answer(app, id, i))
      expect(r).toMatchObject({ nextQuestion: QS[i + 1], nextQuestionIndex: i + 1, status: 'in_progress' })
    }
    const last = await answer(app, id, 4)
    expect(await j(last)).toMatchObject({ status: 'completed', nextQuestion: null })
    expect((await answer(app, id, 5)).status).toBe(409)
  })

  it('rejects an index past the per-interview total', async () => {
    const { app } = makeApp()
    const { id } = await j(await create(app))
    const res = await answer(app, id, 11)
    expect(res.status).toBe(409)
    expect((await answer(app, id, 12)).status).toBe(400)
  })

  it('ends early only when asked, with at least one answer, and notes then work', async () => {
    const { app } = makeApp()
    const { id } = await j(await create(app))
    const headers = { ...WS, 'Content-Type': 'application/json' }
    expect((await send(app, 'POST', `/interviews/${id}/complete`, headers, { early: true })).status).toBe(409)
    await answer(app, id, 0)
    await answer(app, id, 1)
    expect((await send(app, 'POST', `/interviews/${id}/complete`, headers)).status).toBe(409)
    const done = await send(app, 'POST', `/interviews/${id}/complete`, headers, { early: true })
    expect(done.status).toBe(200)
    expect((await j(done)).status).toBe('completed')
    const notes = await send(app, 'POST', `/interviews/${id}/reflect`, headers)
    expect(notes.status).toBe(201)
  })

  it('practice interviews ignore early and still need all four answers', async () => {
    const { app } = makeApp()
    const headers = { ...WS, 'Content-Type': 'application/json' }
    const { id } = await j(await send(app, 'POST', '/interviews', headers, { role: 'Analyst' }))
    await answer(app, id, 0)
    const res = await send(app, 'POST', `/interviews/${id}/complete`, headers, { early: true })
    expect(res.status).toBe(409)
    expect((await j(res)).error).toBe('interview_incomplete')
    const reflect = await send(app, 'POST', `/interviews/${id}/reflect`, headers)
    expect(reflect.status).toBe(409)
  })
})

it('memory repo and supabase repo expose the same method names', () => {
  const mem = Object.keys(createMemoryRepository()).sort()
  const sb = Object.keys(createSupabaseRepository('https://example.supabase.co', 'k')).sort()
  expect(sb).toEqual(mem)
})
