import { describe, expect, it } from 'vitest'
import { buildApp } from '../app.js'
import { createMemoryRepository } from '../repo/memory.js'
import { buildScreeningQuestions, screenTimeUp, SCREEN_GRACE_MS, type ScreenSkill } from '../domain/screening.js'
import { j, makeEnv } from './helpers.js'

const JD = 'We need someone who can build dashboards in Tableau for the sales team. You will write SQL against our warehouse every day. Nice to have: experience with Airflow pipelines.'
const skills: ScreenSkill[] = [
  { name: 'Tableau', weight: 'core', quote: 'build dashboards in Tableau for the sales team' },
  { name: 'SQL', weight: 'core', quote: 'write SQL against our warehouse every day' },
  { name: 'Airflow', weight: 'nice', quote: 'experience with Airflow pipelines' },
  { name: 'Excel', weight: 'nice' },
]
const target = { id: 'target-1', role: 'Data Analyst', company: 'Acme', skills }

const BANNED = /\b(great|good|excellent|nice answer|well done|tip|hint|try to|remember to|make sure|star method|you should|don'?t forget)\b/i
// Product, vendor and competitor names that must never appear in what the interviewer says (skills come from the learner's own posting).
const THIRD_PARTY = /\b(google|amazon|microsoft|meta|apple|openai|chatgpt|gpt|claude|anthropic|nvidia|sarvam|hirevue|pymetrics|linkedin|indeed|glassdoor|zoom|teams|mirror|interviewer bot)\b/i

describe('buildScreeningQuestions', () => {
  it('is stable for the same target and clamps the count to 5..8', () => {
    expect(buildScreeningQuestions(target, 6)).toEqual(buildScreeningQuestions(target, 6))
    expect(buildScreeningQuestions(target, 1)).toHaveLength(5)
    expect(buildScreeningQuestions(target, 99)).toHaveLength(8)
    for (let n = 5; n <= 8; n++) expect(buildScreeningQuestions({ ...target, skills: [] }, n)).toHaveLength(n)
  })

  it('opens plainly, closes with a fixed closer, and keeps every question valid and unique', () => {
    for (let n = 5; n <= 8; n++) {
      const qs = buildScreeningQuestions(target, n)
      expect(qs[0]).toBe('Can you tell me about your background and why this role?')
      expect(qs[qs.length - 1]).toBe('Is there anything about your experience that we have not covered yet?')
      expect(new Set(qs.map(q => q.toLowerCase())).size).toBe(qs.length)
      for (const q of qs) { expect(q.length).toBeGreaterThanOrEqual(8); expect(q.length).toBeLessThanOrEqual(300); expect(q.endsWith('?')).toBe(true) }
    }
  })

  it('draws from core skills first, with the posting’s own words verbatim', () => {
    const qs = buildScreeningQuestions(target, 5)
    const quoted = qs.flatMap(q => [...q.matchAll(/mentions "([^"]+)"/g)].map(m => m[1]))
    expect(quoted.length).toBeGreaterThan(0)
    for (const q of quoted) expect(JD).toContain(q)
    // Three middle slots: ownership, plus two skills. Both core skills are used before any nice one.
    expect(qs.join(' ')).toContain('Tableau')
    expect(qs.join(' ')).toContain('SQL')
    expect(qs.join(' ')).not.toContain('Airflow')
  })

  it('uses up to two résumé probes', () => {
    const probes = ['Your résumé says you led a migration. What was the result?', 'You list Python. Where did you use it last?', 'A third probe that should not be used?']
    const qs = buildScreeningQuestions({ ...target, probes }, 8)
    expect(qs).toContain(probes[0])
    expect(qs).toContain(probes[1])
    expect(qs).not.toContain(probes[2])
    expect(qs).toHaveLength(8)
  })

  it('has no coaching, praise or third-party names', () => {
    for (let n = 5; n <= 8; n++) {
      for (const q of buildScreeningQuestions({ ...target, skills: [] }, n)) {
        expect(q).not.toMatch(BANNED)
        expect(q).not.toMatch(THIRD_PARTY)
      }
      for (const q of buildScreeningQuestions(target, n)) expect(q).not.toMatch(BANNED)
    }
  })
})

describe('screenTimeUp', () => {
  const i = { kind: 'screen' as const, startedAt: '2026-01-01T00:00:00.000Z', timeCapSeconds: 300 }
  const t0 = Date.parse(i.startedAt)
  it('allows the grace after the cap, then it is up', () => {
    expect(screenTimeUp(i, t0 + 300_000)).toBe(false)
    expect(screenTimeUp(i, t0 + 300_000 + SCREEN_GRACE_MS)).toBe(false)
    expect(screenTimeUp(i, t0 + 300_000 + SCREEN_GRACE_MS + 1500)).toBe(true)
    expect(screenTimeUp({ ...i, kind: 'practice' as never }, t0 + 10_000_000)).toBe(false)
  })
})

describe('POST /interviews for a screening call', () => {
  const setup = async () => {
    let clock = Date.parse('2026-01-01T00:00:00.000Z')
    const repo = createMemoryRepository()
    const app = buildApp({ env: makeEnv(), repo, now: () => clock })
    const t = await repo.createTarget('dev', { company: 'Acme', role: 'Data Analyst', interviewDate: null, jd: JD })
    await repo.updateTarget('dev', t.id, { status: 'ready', skills: skills.map(s => ({ ...s, area: 'tools' as const, quote: s.quote ?? s.name })) })
    const H = { 'X-Dev-Workspace': 'dev', 'Content-Type': 'application/json' }
    const post = (path: string, body: unknown) => app.request(path, { method: 'POST', headers: H, body: JSON.stringify(body) })
    return { app, repo, t, post, advance: (ms: number) => { clock += ms } }
  }

  it('builds the questions from the target and seeds the clock', async () => {
    const { post, t } = await setup()
    const res = await post('/interviews', { role: 'x', kind: 'screen', targetId: t.id, timeCapMinutes: 6, questionCount: 7 })
    expect(res.status).toBe(201)
    const body = await j(res)
    expect(body).toMatchObject({ kind: 'screen', questionCap: 7, timeCapSeconds: 360, targetId: t.id, startedAt: '2026-01-01T00:00:00.000Z', role: 'Data Analyst' })
    expect(body.questions).toEqual(buildScreeningQuestions({ id: t.id, role: 'Data Analyst', company: 'Acme', skills: skills.map(s => ({ ...s, quote: s.quote ?? s.name })) }, 7))
    expect(body.currentQuestion).toBe(body.questions[0])
  })

  it('refuses a target with no skills or an unknown target', async () => {
    const { post, repo } = await setup()
    const empty = await repo.createTarget('dev', { company: 'B', role: 'R', interviewDate: null, jd: 'x' })
    expect((await post('/interviews', { role: 'x', kind: 'screen', targetId: empty.id })).status).toBe(400)
    expect((await post('/interviews', { role: 'x', kind: 'screen', targetId: crypto.randomUUID() })).status).toBe(404)
  })

  it('uses a stored résumé probe when the match feature saved one', async () => {
    const { post, repo, t } = await setup()
    await repo.replaceGapMatches('dev', t.id, [{ skill: 'SQL', area: 'sql', weight: 'core', status: 'partial', claimQuote: null, note: 'n', probeQuestion: 'Your résumé mentions reporting. What did you change with it?', source: 'fallback' }])
    const body = await j(await post('/interviews', { role: 'x', kind: 'screen', targetId: t.id, questionCount: 8 }))
    expect(body.questions).toContain('Your résumé mentions reporting. What did you change with it?')
  })

  it('takes an answer inside the grace, then ends early on the next call', async () => {
    const { post, t, advance } = await setup()
    const s = await j(await post('/interviews', { role: 'x', kind: 'screen', targetId: t.id, timeCapMinutes: 5 }))
    const answer = (i: number) => post(`/interviews/${s.id}/turns`, { questionIndex: i, answer: `Answer number ${i} with enough detail.` })
    expect((await answer(0)).status).toBe(201)
    advance(300_000 + 10_000) // past the cap, inside the grace
    expect((await answer(1)).status).toBe(201)
    advance(30_000) // grace used up
    const late = await answer(2)
    expect(late.status).toBe(409)
    expect(JSON.stringify(await j(late))).toContain('screen_time_up')
    const after = await j(await post(`/interviews/${s.id}/complete`, { early: true }))
    expect(after.status).toBe('completed')
    expect(after.turns).toHaveLength(2)
  })
})
