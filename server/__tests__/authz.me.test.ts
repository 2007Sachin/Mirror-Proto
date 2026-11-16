import { describe, expect, it } from 'vitest'
import { as, j, makeApp } from './helpers.js'

type App = ReturnType<typeof makeApp>['app']
const json = { 'Content-Type': 'application/json' }
const req = (app: App, user: string, method: string, path: string, body?: unknown) =>
  app.request(path, { method, headers: { ...as(user), ...json }, body: body === undefined ? undefined : JSON.stringify(body) })

const profile = { role: 'Analyst', story: 'A story', pressureQuestion: 'Q?', pressureAnswer: 'An answer', summary: 'S', focus: 'Focus', firstQuestion: 'First question here?', resumeText: 'Led SQL work.', resumeName: null, mode: 'text' }
const story = { title: 'T', themes: [], situation: 's', task: '', action: 'a', result: '', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null }

async function seed(app: App, user: string) {
  const i = await j(await req(app, user, 'POST', '/interviews', { role: 'Analyst', openingQuestion: 'Tell me about a launch?' }))
  for (let n = 0; n < 4; n++) await req(app, user, 'POST', `/interviews/${i.id}/turns`, { questionIndex: n, answer: `${user} answer ${n} with enough detail to be valid.` })
  await req(app, user, 'POST', `/interviews/${i.id}/reflect`)
  await req(app, user, 'PUT', '/profile', profile)
  await req(app, user, 'POST', '/targets', { company: `${user} Co`, role: 'Analyst', jd: 'We need SQL and clear communication from an analyst.' })
  await req(app, user, 'POST', '/practice/attempts', { itemId: 'p1', track: 'sql', topic: 't', level: 1, correct: true, seconds: 3, hintsUsed: 0 })
  await req(app, user, 'POST', '/replay/attempts', { interviewId: i.id, questionIndex: 0, question: 'Q', attempt: 1, answer: 'again', kind: 'retry' })
  await req(app, user, 'POST', '/stories', story)
  await req(app, user, 'PUT', '/resume/claims', { claims: [{ quote: 'Led SQL work.', skills: ['SQL'], hasNumber: false, vague: false }] })
  await req(app, user, 'PUT', '/practice/schedule', { itemId: 'p1', dueAt: '2026-01-01', intervalDays: 1, rung: 0, lastResult: true })
}

const ARRAYS = ['interviews', 'turns', 'reflections', 'targets', 'practiceAttempts', 'answerAttempts', 'stories', 'resumeClaims', 'gapMatches', 'replaySchedule'] as const

describe('GET /me/export', () => {
  it('is a JSON attachment with exactly the user’s rows and no one else’s', async () => {
    const { app } = makeApp()
    await seed(app, 'ann')
    await seed(app, 'bob')
    const res = await req(app, 'ann', 'GET', '/me/export')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="mirror-export-\d{4}-\d{2}-\d{2}\.json"$/)
    const out = await j(res)
    expect(out.workspace).toBe('ann')
    expect(out.workspaceRow).toMatchObject({ slug: 'ann' })
    expect(Number.isNaN(Date.parse(out.exportedAt))).toBe(false)
    expect(out.profile).not.toBeNull()
    for (const k of ARRAYS) if (k !== 'gapMatches') expect(out[k], k).not.toHaveLength(0)
    expect(JSON.stringify(out)).not.toContain('bob')
    expect(out.interviews.every((x: { workspaceId: string }) => x.workspaceId === 'ann')).toBe(true)
    expect(JSON.stringify(out)).not.toMatch(/token|password|secret|apikey/i)
  })

  it('answers 401 without a user', async () => {
    const { app } = makeApp()
    expect((await app.request('/me/export')).status).toBe(401)
  })
})

describe('DELETE /me/data', () => {
  it('rejects a missing or wrong confirmation and deletes nothing', async () => {
    const { app } = makeApp()
    await seed(app, 'ann')
    for (const body of [undefined, {}, { confirm: 'delete' }, { confirm: true }, { confirm: 'yes' }]) {
      const res = await req(app, 'ann', 'DELETE', '/me/data', body)
      expect(res.status, JSON.stringify(body)).toBe(400)
      expect((await j(res)).error).toBe('confirmation_required')
    }
    expect((await j(await req(app, 'ann', 'GET', '/me/export'))).interviews).not.toHaveLength(0)
  })

  it('removes every store of that user only, and a second delete is fine', async () => {
    const { app } = makeApp()
    await seed(app, 'ann')
    await seed(app, 'bob')
    const bobBefore = await j(await req(app, 'bob', 'GET', '/me/export'))
    const res = await req(app, 'ann', 'DELETE', '/me/data', { confirm: 'DELETE' })
    expect(res.status).toBe(200)
    const out = await j(res)
    expect(out.deleted).toBe(true)
    expect(out.message).toMatch(/sign-in account/)
    const gone = await j(await req(app, 'ann', 'GET', '/me/export'))
    expect(gone.profile).toBeNull()
    for (const k of ARRAYS) expect(gone[k], k).toHaveLength(0)
    expect((await req(app, 'ann', 'GET', '/profile')).status).toBe(404)
    expect(await j(await req(app, 'ann', 'GET', '/interviews'))).toEqual([])
    // Bob is untouched.
    const bobAfter = await j(await req(app, 'bob', 'GET', '/me/export'))
    expect({ ...bobAfter, exportedAt: 0 }).toEqual({ ...bobBefore, exportedAt: 0 })
    // Idempotent, and the user can start again.
    expect((await req(app, 'ann', 'DELETE', '/me/data', { confirm: 'DELETE' })).status).toBe(200)
    expect((await req(app, 'ann', 'POST', '/stories', story)).status).toBe(201)
  })

  it('answers 401 without a user', async () => {
    const { app } = makeApp()
    expect((await app.request('/me/data', { method: 'DELETE', headers: json, body: JSON.stringify({ confirm: 'DELETE' }) })).status).toBe(401)
  })

  it('drops the user’s cached coach note and idempotent replies', async () => {
    const { app } = makeApp()
    await seed(app, 'ann')
    const i = await j(await req(app, 'ann', 'POST', '/interviews', { role: 'Analyst', openingQuestion: 'One more?' }))
    const turn = () => app.request(`/interviews/${i.id}/turns`, { method: 'POST', headers: { ...as('ann'), ...json, 'Idempotency-Key': 'k1' }, body: JSON.stringify({ questionIndex: 0, answer: 'A fresh answer that is long enough.' }) })
    expect((await turn()).status).toBe(201)
    await req(app, 'ann', 'DELETE', '/me/data', { confirm: 'DELETE' })
    // With the cache gone, the same key on a deleted interview is a real lookup again: not found, not a replay.
    expect((await turn()).status).toBe(404)
  })
})
