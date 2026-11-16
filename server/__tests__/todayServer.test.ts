import { describe, expect, it } from 'vitest'
import { focusLabel, gapFromAnswer } from '../domain/fallbacks.js'
import { COACH_SYSTEM, coachMessages } from '../providers/nim.js'
import type { OnboardingRequest } from '../providers/types.js'
import { as, j, makeApp, WS } from './helpers.js'

const JSON_HEADERS = { ...WS, 'Content-Type': 'application/json' }
const NOW = Date.parse('2026-06-15T10:00:00Z')
const JD = 'We need SQL, Python and clear communication from a data analyst.'
type App = ReturnType<typeof makeApp>['app']
const send = (app: App, method: string, path: string, body?: unknown, headers: Record<string, string> = JSON_HEADERS) =>
  app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
const newTarget = async (app: App, extra: Record<string, unknown> = {}, headers = JSON_HEADERS) =>
  j<{ id: string }>(await send(app, 'POST', '/targets', { company: 'Northwind', role: 'Analyst', jd: JD, ...extra }, headers))

describe('PATCH /targets/:id', () => {
  it('sets the interview date and returns the list shape', async () => {
    const { app } = makeApp({ now: () => NOW })
    const t = await newTarget(app)
    const res = await send(app, 'PATCH', `/targets/${t.id}`, { interviewDate: '2026-06-25' })
    expect(res.status).toBe(200)
    const body = await j(res)
    expect(body).toMatchObject({ id: t.id, company: 'Northwind', role: 'Analyst', interviewDate: '2026-06-25' })
    expect(Object.keys(body).sort()).toEqual(['company', 'createdAt', 'id', 'interviewDate', 'nextStep', 'nextStepSource', 'role', 'skills', 'status'])
    expect((await j<{ interviewDate: string }[]>(await send(app, 'GET', '/targets', undefined, WS)))[0].interviewDate).toBe('2026-06-25')
  })

  it('accepts today and clears the date with null', async () => {
    const { app } = makeApp({ now: () => NOW })
    const t = await newTarget(app, { interviewDate: '2026-07-01' })
    expect((await send(app, 'PATCH', `/targets/${t.id}`, { interviewDate: '2026-06-15' })).status).toBe(200)
    const cleared = await j(await send(app, 'PATCH', `/targets/${t.id}`, { interviewDate: null }))
    expect(cleared.interviewDate).toBeNull()
  })

  it('rejects a bad date and a past date', async () => {
    const { app } = makeApp({ now: () => NOW })
    const t = await newTarget(app, { interviewDate: '2026-07-01' })
    for (const bad of ['tomorrow', '2026-02-31', '2026-6-1', 20260701, undefined]) {
      expect((await send(app, 'PATCH', `/targets/${t.id}`, { interviewDate: bad })).status, String(bad)).toBe(400)
    }
    expect((await send(app, 'PATCH', `/targets/${t.id}`, { interviewDate: '2026-06-14' })).status).toBe(400)
    const after = await j<{ interviewDate: string }[]>(await send(app, 'GET', '/targets', undefined, WS))
    expect(after[0].interviewDate).toBe('2026-07-01')
  })

  it('is 404 for another user’s target and an unknown id', async () => {
    const { app } = makeApp({ now: () => NOW })
    const t = await newTarget(app)
    const bob = { ...as('bob'), 'Content-Type': 'application/json' }
    const res = await send(app, 'PATCH', `/targets/${t.id}`, { interviewDate: '2026-06-25' }, bob)
    expect(res.status).toBe(404)
    expect((await j(res)).error).toBe('target_not_found')
    expect((await send(app, 'PATCH', '/targets/nope', { interviewDate: null })).status).toBe(404)
    expect((await j<{ interviewDate: string | null }[]>(await send(app, 'GET', '/targets', undefined, WS)))[0].interviewDate).toBeNull()
  })
})

describe('focusLabel and gapFromAnswer', () => {
  const LABEL = 'Finishing the story: what you did and how it ended'
  it('cleans a stored quote and leaves clean labels alone', () => {
    expect(focusLabel('Going deeper on “Under CMVR rules we shipped late.”')).toBe(LABEL)
    expect(focusLabel('stakeholder trust')).toBe('stakeholder trust')
    expect(focusLabel(LABEL)).toBe(LABEL)
  })
  it('new profiles store the label, never the learner’s words', () => {
    const gap = gapFromAnswer('Under CMVR rules we shipped late. Then I called everyone.')
    expect(gap).toBe(LABEL)
    expect(gap).not.toContain('CMVR')
    expect(gapFromAnswer('   ')).not.toContain('Going deeper')
  })
})

describe('coach prompt', () => {
  it('carries the new rules and no longer asks for a tension', () => {
    expect(COACH_SYSTEM).toContain('Start with one specific thing that worked')
    expect(COACH_SYSTEM).toContain('finish with how it ended')
    expect(COACH_SYSTEM).toContain('never "you describe X but not Y"')
    expect(COACH_SYSTEM).toContain('at most two sentences')
    expect(COACH_SYSTEM).toContain('more than six words')
    expect(COACH_SYSTEM).toContain('only if one is given in the input')
    expect(COACH_SYSTEM).not.toMatch(/tension/i)
    expect(COACH_SYSTEM).not.toMatch(/gap between what they emphasized/i)
  })
  it('names a role and company only when a target is given', () => {
    const base: Extract<OnboardingRequest, { step: 'coach' }> = { step: 'coach', role: 'Interview practice', focus: 'Going deeper on “CMVR”', transcript: [{ question: 'Q?', answer: 'A.' }], inProgress: false }
    const without = coachMessages(base)[1].content
    expect(without).toContain('No target saved.')
    expect(without).not.toContain('CMVR')
    expect(coachMessages({ ...base, target: { company: 'Northwind', role: 'Analyst' } })[1].content).toContain('Target: Analyst at Northwind')
  })
})

describe('GET /profile and /coach-note with a target', () => {
  const profile = { role: 'Backend Engineer', story: 'We moved billing and I ran the weekend cutover.', pressureQuestion: 'What broke?', pressureAnswer: 'A retry loop double-charged forty customers.', summary: 'You led a migration.', focus: 'Going deeper on “Under CMVR rules we shipped late.”', firstQuestion: 'How did you win back finance?', resumeText: null, resumeName: null, mode: 'text' }
  const note = { observation: 'The cutover story had a clear owner. Add how it ended.', nextPractice: 'Retell the cutover to its end in ten minutes.', practiceQuestion: 'How did the cutover end for finance?' }

  it('reads old rows with the quote cleaned', async () => {
    const { app } = makeApp()
    await send(app, 'PUT', '/profile', profile)
    const got = await j<{ focus: string }>(await send(app, 'GET', '/profile', undefined, WS))
    expect(got.focus).toBe('Finishing the story: what you did and how it ended')
    const fallback = await j<{ observation: string }>(await send(app, 'GET', '/coach-note', undefined, WS))
    expect(fallback.observation).not.toContain('CMVR')
  })

  it('passes the nearest target to the model and keys the cache on it', async () => {
    const seen: OnboardingRequest[] = []
    const { app } = makeApp({
      now: () => NOW,
      provider: {
        async generateReflection() { throw new Error('unused') },
        async generateOnboarding(req) { if (req.step === 'coach') seen.push(req); return req.step === 'coach' ? note : { nextStep: 'Start with the SQL round tonight.' } },
      },
    })
    const coach = () => send(app, 'GET', '/coach-note', undefined, WS)
    const target = (r: OnboardingRequest | undefined) => (r as Extract<OnboardingRequest, { step: 'coach' }>).target
    await send(app, 'PUT', '/profile', profile)
    await coach()
    await coach()
    expect(seen).toHaveLength(1) // cached
    expect(target(seen[0])).toBeUndefined()

    await newTarget(app, { company: 'Later Co', interviewDate: '2026-08-01' })
    const soon = await newTarget(app, { company: 'Soon Co', interviewDate: '2026-06-20' })
    await coach()
    expect(seen).toHaveLength(2) // different target => different key
    expect(target(seen[1])).toEqual({ company: 'Soon Co', role: 'Analyst' })
    await coach()
    expect(seen).toHaveLength(2)

    await send(app, 'PATCH', `/targets/${soon.id}`, { interviewDate: null })
    await coach() // Later Co is now the soonest upcoming
    expect(seen).toHaveLength(3)
    expect(target(seen[2])).toEqual({ company: 'Later Co', role: 'Analyst' })
  })
})
