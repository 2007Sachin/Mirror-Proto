import { beforeAll, describe, expect, it } from 'vitest'
import { as, j, makeApp } from './helpers.js'

/** The 12 mirror_* tables, and the API route family that reads or writes each (route patterns as registered, without the /api prefix). */
const TABLES = [
  'mirror_workspaces',
  'mirror_interviews',
  'mirror_turns',
  'mirror_reflections',
  'mirror_profiles',
  'mirror_targets',
  'mirror_practice_attempts',
  'mirror_answer_attempts',
  'mirror_stories',
  'mirror_resume_claims',
  'mirror_target_gap_matches',
  'mirror_replay_schedule',
] as const
type Table = (typeof TABLES)[number]

const TABLE_ROUTES: Record<Table, string[]> = {
  mirror_workspaces: ['GET /me/export'], // written by every authenticated request (requireUser), read back by the export
  mirror_interviews: ['GET /interviews', 'GET /interviews/:id', 'POST /interviews/:id/complete', 'POST /interviews/:id/abandon', 'POST /interviews/:id/next-question'],
  mirror_turns: ['POST /interviews/:id/turns', 'GET /interviews/:id'],
  mirror_reflections: ['POST /interviews/:id/reflect', 'GET /interviews/:id'],
  mirror_profiles: ['GET /profile', 'GET /coach-note', 'PUT /profile', 'DELETE /profile'],
  mirror_targets: ['GET /targets', 'GET /targets/:id', 'POST /targets/:id/sql-turn', 'POST /targets/:id/sql-debrief', 'PATCH /targets/:id', 'DELETE /targets/:id'],
  mirror_practice_attempts: ['GET /practice/summary', 'POST /practice/attempts'],
  mirror_answer_attempts: ['GET /replay/attempts', 'POST /replay/attempts', 'DELETE /replay/attempts'],
  mirror_stories: ['GET /stories', 'GET /stories/:id', 'PATCH /stories/:id', 'DELETE /stories/:id', 'POST /stories', 'DELETE /stories'],
  mirror_resume_claims: ['GET /resume/claims', 'PUT /resume/claims', 'DELETE /resume/claims'],
  mirror_target_gap_matches: ['GET /targets/:id/match', 'POST /targets/:id/match', 'PUT /targets/:id/match'],
  mirror_replay_schedule: ['GET /practice/schedule', 'PUT /practice/schedule', 'DELETE /practice/schedule'],
}

const MARK = 'ALICE-SECRET'
const json = { 'Content-Type': 'application/json' }
type Ids = { interview: string; open: string; target: string; story: string; item: string }
type Attack = { req: (ids: Ids) => [string, RequestInit]; expect: 'notFound' | 'empty' | 'noEffect' | 'ownExport' | 'emptySummary' }
const send = (method: string, path: string, body?: unknown): [string, RequestInit] => [path, { method, headers: { ...json }, body: body === undefined ? undefined : JSON.stringify(body) }]

const story = (title: string, mark = MARK) => ({ title, themes: [], situation: `${mark} situation`, task: '', action: `${mark} action`, result: '', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null })
const claim = { claims: [{ quote: `${MARK} cut churn by a lot`, skills: ['SQL'], hasNumber: false, vague: true }] }
const profile = { role: 'Data Analyst', story: `${MARK} story of a launch`, pressureQuestion: 'What if it fails?', pressureAnswer: `${MARK} I would check the data first.`, summary: 'A summary.', focus: 'Say the result first.', firstQuestion: 'Tell me about a launch you owned.', resumeText: `${MARK} Led SQL dashboards for a team. Built Python tools.`, resumeName: null, mode: 'text' }
const match = { matches: [{ skill: 'SQL', area: 'Data', weight: 'core', status: 'gap', claimQuote: null, note: `${MARK} note`, probeQuestion: null, source: 'fallback' }] }

/** What each route does when Bob calls it with ALICE's ids. Reads come before Bob's own writes within a table. */
const ATTACKS: Record<string, Attack> = {
  'GET /me/export': { req: () => send('GET', '/me/export'), expect: 'ownExport' },
  'GET /interviews': { req: () => send('GET', '/interviews'), expect: 'empty' },
  'GET /interviews/:id': { req: i => send('GET', `/interviews/${i.interview}`), expect: 'notFound' },
  'POST /interviews/:id/complete': { req: i => send('POST', `/interviews/${i.open}/complete`, {}), expect: 'notFound' },
  'POST /interviews/:id/abandon': { req: i => send('POST', `/interviews/${i.open}/abandon`), expect: 'notFound' },
  'POST /interviews/:id/next-question': { req: i => send('POST', `/interviews/${i.open}/next-question`), expect: 'notFound' },
  'POST /interviews/:id/turns': { req: i => send('POST', `/interviews/${i.open}/turns`, { questionIndex: 0, answer: 'Bob writing into Alice’s interview, long enough to be valid.' }), expect: 'notFound' },
  'POST /interviews/:id/reflect': { req: i => send('POST', `/interviews/${i.interview}/reflect`), expect: 'notFound' },
  'GET /profile': { req: () => send('GET', '/profile'), expect: 'notFound' },
  'GET /coach-note': { req: () => send('GET', '/coach-note'), expect: 'notFound' },
  'PUT /profile': { req: () => send('PUT', '/profile', { ...profile, role: 'Bob’s role', story: 'Bob', pressureAnswer: 'Bob', resumeText: 'Bob only' }), expect: 'noEffect' },
  'DELETE /profile': { req: () => send('DELETE', '/profile'), expect: 'noEffect' },
  'GET /targets': { req: () => send('GET', '/targets'), expect: 'empty' },
  'GET /targets/:id': { req: i => send('GET', `/targets/${i.target}`), expect: 'notFound' },
  'POST /targets/:id/sql-turn': { req: i => send('POST', `/targets/${i.target}/sql-turn`, { problem: { id: 'p', title: 't', prompt: 'p' }, query: 'select 1', passed: true }), expect: 'notFound' },
  'POST /targets/:id/sql-debrief': { req: i => send('POST', `/targets/${i.target}/sql-debrief`, { attempts: [{ problemId: 'p', title: 't', query: 'select 1', passed: true }] }), expect: 'notFound' },
  'PATCH /targets/:id': { req: i => send('PATCH', `/targets/${i.target}`, { interviewDate: '2099-01-01' }), expect: 'notFound' },
  'DELETE /targets/:id': { req: i => send('DELETE', `/targets/${i.target}`), expect: 'noEffect' },
  'GET /practice/summary': { req: () => send('GET', '/practice/summary'), expect: 'emptySummary' },
  'POST /practice/attempts': { req: i => send('POST', '/practice/attempts', { itemId: i.item, track: 'sql', topic: 't', level: 1, correct: false, seconds: 1, hintsUsed: 0 }), expect: 'noEffect' },
  'GET /replay/attempts': { req: () => send('GET', '/replay/attempts'), expect: 'empty' },
  'POST /replay/attempts': { req: i => send('POST', '/replay/attempts', { interviewId: i.interview, questionIndex: 0, question: 'Q', attempt: 1, answer: 'Bob’s answer', kind: 'retry' }), expect: 'noEffect' },
  'DELETE /replay/attempts': { req: () => send('DELETE', '/replay/attempts'), expect: 'noEffect' },
  'GET /stories': { req: () => send('GET', '/stories'), expect: 'empty' },
  'GET /stories/:id': { req: i => send('GET', `/stories/${i.story}`), expect: 'notFound' },
  'PATCH /stories/:id': { req: i => send('PATCH', `/stories/${i.story}`, { title: 'Bob took this' }), expect: 'notFound' },
  'DELETE /stories/:id': { req: i => send('DELETE', `/stories/${i.story}`), expect: 'noEffect' },
  'POST /stories': { req: () => send('POST', '/stories', { ...story('Bob story'), situation: 'Bob', action: 'Bob', workspaceId: 'alice' }), expect: 'noEffect' },
  'DELETE /stories': { req: () => send('DELETE', '/stories'), expect: 'noEffect' },
  'GET /resume/claims': { req: () => send('GET', '/resume/claims'), expect: 'empty' },
  'PUT /resume/claims': { req: () => send('PUT', '/resume/claims', { claims: [{ quote: 'Bob only', skills: [], hasNumber: false, vague: false }] }), expect: 'noEffect' },
  'DELETE /resume/claims': { req: () => send('DELETE', '/resume/claims'), expect: 'noEffect' },
  'GET /targets/:id/match': { req: i => send('GET', `/targets/${i.target}/match`), expect: 'notFound' },
  'POST /targets/:id/match': { req: i => send('POST', `/targets/${i.target}/match`), expect: 'notFound' },
  'PUT /targets/:id/match': { req: i => send('PUT', `/targets/${i.target}/match`, { matches: [{ ...match.matches[0], note: 'Bob' }] }), expect: 'notFound' },
  'GET /practice/schedule': { req: () => send('GET', '/practice/schedule'), expect: 'empty' },
  'PUT /practice/schedule': { req: i => send('PUT', '/practice/schedule', { itemId: i.item, dueAt: '2030-01-01', intervalDays: 9, rung: 9, lastResult: false }), expect: 'noEffect' },
  'DELETE /practice/schedule': { req: i => send('DELETE', `/practice/schedule?itemId=${i.item}`), expect: 'noEffect' },
}

type App = ReturnType<typeof makeApp>['app']
const call = (app: App, user: string, [path, init]: [string, RequestInit]) => app.request(path, { ...init, headers: { ...(init.headers as Record<string, string>), ...as(user) } })
const alice = (app: App, method: string, path: string, body?: unknown) => call(app, 'alice', send(method, path, body))

/** Alice's whole account as the API exports it, without the clock. */
async function snapshot(app: App) {
  const out = await j(await alice(app, 'GET', '/me/export'))
  delete out.exportedAt
  return out
}

describe('user isolation across the API (memory repo, test auth)', () => {
  const { app } = makeApp()
  let ids: Ids
  let before: unknown

  beforeAll(async () => {
    // Alice builds data in every table through the API.
    const created = await j(await alice(app, 'POST', '/interviews', { role: 'Data Analyst', openingQuestion: `${MARK} tell me about a launch?` }))
    for (let i = 0; i < 4; i++) {
      const res = await alice(app, 'POST', `/interviews/${created.id}/turns`, { questionIndex: i, answer: `${MARK} answer ${i} with enough detail to be valid.` })
      expect(res.status).toBe(201)
    }
    expect((await alice(app, 'POST', `/interviews/${created.id}/reflect`)).status).toBe(201)
    const open = await j(await alice(app, 'POST', '/interviews', { role: 'Data Analyst', openingQuestion: `${MARK} still open?` }))
    expect((await alice(app, 'PUT', '/profile', profile)).status).toBe(200)
    const target = await j(await alice(app, 'POST', '/targets', { company: `${MARK} Acme`, role: 'Data Analyst', jd: 'We need SQL, Python and clear communication from a data analyst.' }))
    for (let n = 0; n < 50; n++) {
      if ((await j(await alice(app, 'GET', `/targets/${target.id}`))).status === 'ready') break
      await new Promise(r => setTimeout(r, 10))
    }
    expect((await alice(app, 'PUT', '/resume/claims', claim)).status).toBe(200)
    expect((await alice(app, 'PUT', `/targets/${target.id}/match`, match)).status).toBe(200)
    const item = 'shared-item' // same id on both sides: an upsert by itemId must stay per user
    expect((await alice(app, 'POST', '/practice/attempts', { itemId: item, track: 'sql', topic: 't', level: 1, correct: true, seconds: 5, hintsUsed: 0 })).status).toBe(201)
    expect((await alice(app, 'POST', '/replay/attempts', { interviewId: created.id, questionIndex: 0, question: 'Q', attempt: 1, answer: `${MARK} retry`, kind: 'retry' })).status).toBe(201)
    const s = await j(await alice(app, 'POST', '/stories', story('Alice story')))
    expect((await alice(app, 'PUT', '/practice/schedule', { itemId: item, dueAt: '2026-01-01', intervalDays: 1, rung: 0, lastResult: true })).status).toBe(200)
    ids = { interview: created.id, open: open.id, target: target.id, story: s.id, item }
    before = await snapshot(app)
    const b = before as Record<string, unknown[]>
    for (const k of ['interviews', 'turns', 'reflections', 'targets', 'practiceAttempts', 'answerAttempts', 'stories', 'resumeClaims', 'gapMatches', 'replaySchedule']) expect(b[k].length, `alice has ${k}`).toBeGreaterThan(0)
    expect(b.profile).not.toBeNull()
  })

  it('every table has a route entry, and every listed route exists and has an attack', () => {
    expect(Object.keys(TABLE_ROUTES).sort()).toEqual([...TABLES].sort())
    const registered = new Set(app.routes.filter(r => r.method !== 'ALL' && !r.path.startsWith('/api')).map(r => `${r.method} ${r.path}`))
    for (const t of TABLES) {
      expect(TABLE_ROUTES[t].length, t).toBeGreaterThan(0)
      for (const r of TABLE_ROUTES[t]) {
        expect(registered.has(r), `${t}: ${r} is not a registered route`).toBe(true)
        expect(ATTACKS[r], `${t}: no attack for ${r}`).toBeDefined()
      }
    }
  })

  for (const table of TABLES) {
    it(`${table}: Bob cannot read, update or delete Alice's rows through any route`, async () => {
      for (const route of TABLE_ROUTES[table]) {
        const attack = ATTACKS[route]
        const res = await call(app, 'bob', attack.req(ids))
        const text = await res.text()
        expect(text, `${route} leaked Alice's data`).not.toContain(MARK)
        expect(res.status, `${route} must not fail on the server`).toBeLessThan(500)
        const body = text ? (JSON.parse(text) as unknown) : null
        switch (attack.expect) {
          case 'notFound':
            expect(res.status, route).toBe(404)
            break
          case 'empty':
            expect(res.status, route).toBe(200)
            expect(body, route).toEqual([])
            break
          case 'emptySummary':
            expect(body, route).toEqual({ items: [], days: [] })
            break
          case 'ownExport':
            expect(body).toMatchObject({ workspace: 'bob', interviews: [], turns: [], reflections: [], profile: null })
            break
          case 'noEffect':
            expect([200, 201, 204, 404], route).toContain(res.status)
            break
        }
        // Whatever Bob did, Alice's account is exactly as she left it.
        expect(await snapshot(app), `${route} changed Alice's data`).toEqual(before)
      }
    })
  }

  it('Alice’s ids do not work on the /api prefix or when guessed in another route family', async () => {
    expect((await call(app, 'bob', send('GET', `/api/interviews/${ids.interview}`))).status).toBe(404)
    expect((await call(app, 'bob', send('GET', `/api/targets/${ids.target}`))).status).toBe(404)
    expect((await call(app, 'bob', send('GET', `/api/stories/${ids.story}`))).status).toBe(404)
    // A screen built on Alice's target is not Bob's to start.
    expect((await call(app, 'bob', send('POST', '/interviews', { role: 'Data Analyst', kind: 'screen', targetId: ids.target }))).status).toBe(404)
    // Unknown ids behave the same as someone else's ids.
    expect((await call(app, 'bob', send('GET', '/interviews/00000000-0000-0000-0000-000000000000'))).status).toBe(404)
    expect(await snapshot(app)).toEqual(before)
  })

  it('Bob’s own data stays separate in lists, and Alice still sees only hers', async () => {
    const mine = await j(await call(app, 'bob', send('POST', '/interviews', { role: 'Designer', openingQuestion: 'Bob question?' })))
    expect((await call(app, 'bob', send('POST', '/stories', story('Bob only', 'Bob')))).status).toBe(201)
    expect((await call(app, 'bob', send('POST', '/targets', { company: 'Bob Co', role: 'Designer', jd: 'We need Figma and clear writing from a designer.' }))).status).toBe(201)
    const bobsInterviews = await j<{ id: string }[]>(await call(app, 'bob', send('GET', '/interviews')))
    expect(bobsInterviews.map(i => i.id)).toEqual([mine.id])
    expect((await j<unknown[]>(await call(app, 'bob', send('GET', '/stories')))).length).toBe(1)
    expect((await j<{ company: string }[]>(await call(app, 'bob', send('GET', '/targets')))).map(t => t.company)).toEqual(['Bob Co'])
    // Alice's side did not gain Bob's rows.
    const now = await snapshot(app)
    expect(now).toEqual(before)
    expect(JSON.stringify(now)).not.toContain('Bob')
    // And Alice cannot open Bob's interview.
    expect((await alice(app, 'GET', `/interviews/${mine.id}`)).status).toBe(404)
  })

  it('a workspace id in the body or a spoofed header cannot cross users', async () => {
    const res = await app.request('/stories', { method: 'POST', headers: { ...as('bob'), ...json }, body: JSON.stringify({ ...story('Spoof', 'Bob'), workspaceId: 'alice', workspace: 'alice' }) })
    expect(res.status).toBe(201)
    expect((await j(res)).workspaceId).toBe('bob')
    const spoof = await app.request('/stories', { headers: { ...as('bob'), 'X-Dev-Workspace': 'alice' } })
    expect(JSON.stringify(await j(spoof))).not.toContain(MARK)
    expect(await snapshot(app)).toEqual(before)
  })
})
