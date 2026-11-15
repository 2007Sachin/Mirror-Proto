import { describe, expect, it } from 'vitest'
import { buildRounds, extractSkills } from '../domain/scout.js'
import { ProviderFailure } from '../providers/nim.js'
import type { ReflectionProvider } from '../providers/types.js'
import type { Target } from '../repo/types.js'
import { j, makeApp, WS } from './helpers.js'

const JSON_HEADERS = { ...WS, 'Content-Type': 'application/json' }
const JD = `Data Analyst at Acme

Requirements:
- Strong SQL for reporting and ad hoc analysis
- Experience with Tableau dashboards

Nice to have:
- Python and pandas
- Comfortable with A/B testing

You will present findings to stakeholders every week.`

type TestApp = ReturnType<typeof makeApp>['app']
const post = (app: TestApp, path: string, body: unknown) =>
  app.request(path, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })
const create = (app: TestApp, extra: object = {}) => post(app, '/targets', { company: 'Acme', role: 'Data Analyst', jd: JD, ...extra })

async function untilReady(app: TestApp, id: string): Promise<Target> {
  for (let i = 0; i < 200; i++) {
    const t = await j<Target>(await app.request(`/targets/${id}`, { headers: WS }))
    if (t.status === 'ready') return t
    await new Promise(r => setTimeout(r, 5))
  }
  throw new Error('target never became ready')
}

function providerWith(onboarding: (req: { step: string }) => Promise<Record<string, string>>): ReflectionProvider {
  return {
    async generateReflection() {
      throw new ProviderFailure('unused')
    },
    generateOnboarding: onboarding as never,
  }
}

describe('Scout extraction', () => {
  const skills = extractSkills(JD)
  const byName = Object.fromEntries(skills.map(s => [s.name, s]))

  it('quotes the job description verbatim', () => {
    expect(skills.length).toBeGreaterThanOrEqual(5)
    for (const s of skills) expect(JD).toContain(s.quote)
    expect(byName.SQL.quote).toContain('SQL')
  })

  it('weights by requirements heading and repetition', () => {
    expect(byName.SQL.weight).toBe('core')
    expect(byName.Tableau.weight).toBe('core')
    expect(byName.pandas.weight).toBe('nice')
    expect(byName['A/B testing'].weight).toBe('nice')
  })

  it('opens SQL only when SQL is asked for; python and tools stay Next', () => {
    const rounds = buildRounds(skills)
    expect(rounds.map(r => [r.id, r.available])).toEqual([['sql', true], ['python', false], ['tools', false], ['behavioural', true]])
    expect(rounds[0].why).toContain('SQL')
    expect(buildRounds([]).find(r => r.id === 'sql')?.available).toBe(false)
  })
})

describe('Scout weights and quotes', () => {
  const jd = 'Analyst\nRequirements:\n- Strong SQL: joins and window functions\n- Build dashboards in Tableau\nNice to have: dbt, Airflow. You will use SQL every day.'
  it('marks a "Nice to have:" line as nice even under a Requirements heading', () => {
    const w = Object.fromEntries(extractSkills(jd).map(s => [s.name, s.weight]))
    expect(w).toMatchObject({ SQL: 'core', Tableau: 'core', dbt: 'nice', Airflow: 'nice' })
  })
  it('keeps quotes verbatim and drops the bullet dash', () => {
    for (const s of extractSkills(jd)) {
      expect(jd).toContain(s.quote)
      expect(s.quote).not.toMatch(/^[-•*]\s/)
    }
  })
})

describe('targets API', () => {
  it('returns 201 scouting, then events in order and ends ready', async () => {
    const { app } = makeApp({ provider: null })
    const res = await create(app, { interviewDate: '2026-12-01' })
    expect(res.status).toBe(201)
    const created = await j<Target>(res)
    expect(created.status).toBe('scouting')
    expect(created.events).toEqual([])

    const t = await untilReady(app, created.id)
    expect(t.events.map(e => e.agent)).toEqual(['Scout', 'Scout', 'Scout', 'Planner'])
    expect(t.events[0].text).toMatch(/^Read the job description \(\d+ words\)\.$/)
    expect(t.events[1].text).toContain('SQL')
    expect(t.skills.length).toBeGreaterThan(0)
    expect(t.rounds).toHaveLength(4)
    expect(t.nextStep).toBe(t.events[3].text)
    expect(t.interviewDate).toBe('2026-12-01')

    const list = await j<{ id: string; status: string }[]>(await app.request('/targets', { headers: WS }))
    expect(list[0]).toMatchObject({ id: created.id, status: 'ready' })
    expect('jd' in list[0]).toBe(false)
  })

  it('lists newest first and validates input', async () => {
    const { app } = makeApp({ provider: null })
    const a = await j<Target>(await create(app, { company: 'First' }))
    const b = await j<Target>(await create(app, { company: 'Second' }))
    const list = await j<{ id: string }[]>(await app.request('/targets', { headers: WS }))
    expect(list.map(t => t.id)).toEqual([b.id, a.id])
    expect((await create(app, { company: '  ' })).status).toBe(400)
    expect((await create(app, { jd: 'too short' })).status).toBe(400)
    expect((await create(app, { interviewDate: '1 Dec' })).status).toBe(400)
  })

  it('still ends ready when the model fails during planning', async () => {
    const provider = providerWith(async () => {
      throw new ProviderFailure('down')
    })
    const { app } = makeApp({ provider })
    const t = await untilReady(app, (await j<Target>(await create(app))).id)
    expect(t.status).toBe('ready')
    expect(t.nextStep).toContain('SQL round')
  })

  it('uses the model for the plan when configured', async () => {
    const provider = providerWith(async req => (req.step === 'planner' ? { nextStep: 'Run the SQL round this evening.' } : ({} as Record<string, string>)))
    const { app } = makeApp({ provider })
    const t = await untilReady(app, (await j<Target>(await create(app))).id)
    expect(t.nextStep).toBe('Run the SQL round this evening.')
  })

  it('falls back to a question about the query with no provider', async () => {
    const { app } = makeApp({ provider: null })
    const { id } = await j<Target>(await create(app))
    const turn = (query: string) =>
      post(app, `/targets/${id}/sql-turn`, { problem: { id: 'p1', title: 'Top customers', prompt: 'List top customers.' }, query, passed: true })
    const join = await j<{ followUp: string }>(await turn('select * from a join b on a.id = b.id'))
    expect(join.followUp).toMatch(/JOIN/)
    expect(join.followUp.endsWith('?')).toBe(true)
    expect((await j<{ followUp: string }>(await turn('select x, count(*) from t group by x'))).followUp).toMatch(/group/i)
    expect((await j<{ followUp: string }>(await turn('select row_number() over (order by x) from t'))).followUp).toMatch(/window/i)
    expect((await j<{ followUp: string }>(await turn('select * from (select 1) s'))).followUp).toMatch(/subquery/i)
    expect((await j<{ followUp: string }>(await turn('select 1'))).followUp.endsWith('?')).toBe(true)
  })

  it('uses the model for the follow-up and falls back when it fails', async () => {
    const body = { problem: { id: 'p1', title: 'T', prompt: 'P' }, query: 'select * from a join b on 1=1', passed: false, error: 'boom' }
    const good = makeApp({ provider: providerWith(async () => ({ question: 'Why did you start from the orders table?' })) })
    const { id } = await j<Target>(await create(good.app))
    expect((await j<{ followUp: string }>(await post(good.app, `/targets/${id}/sql-turn`, body))).followUp).toBe('Why did you start from the orders table?')

    const bad = makeApp({
      provider: providerWith(async () => {
        throw new ProviderFailure('down')
      }),
    })
    const bid = (await j<Target>(await create(bad.app))).id
    const res = await post(bad.app, `/targets/${bid}/sql-turn`, body)
    expect(res.status).toBe(200)
    expect((await j<{ followUp: string }>(res)).followUp).toMatch(/JOIN/)
  })

  it('debriefs with no provider, saves it, and replaces nextStep', async () => {
    const { app } = makeApp({ provider: null })
    const created = await j<Target>(await create(app))
    const ready = await untilReady(app, created.id)
    const attempts = [
      { problemId: 'p1', title: 'Top customers', query: 'select c, count(*) from o group by c', passed: true },
      { problemId: 'p2', title: 'Monthly revenue', query: 'select 1', passed: false },
    ]
    const res = await post(app, `/targets/${created.id}/sql-debrief`, { attempts })
    expect(res.status).toBe(200)
    const d = await j<{ solved: number; total: number; wentWell: string; keepWorkingOn: string; suggestion: string }>(res)
    expect([d.solved, d.total]).toEqual([1, 2])
    expect(d.wentWell).toContain('grouping')
    expect(d.keepWorkingOn).toContain('Monthly revenue')
    expect(d.suggestion.startsWith('Next time')).toBe(true)

    const t = await j<Target>(await app.request(`/targets/${created.id}`, { headers: WS }))
    expect(t.debriefs).toHaveLength(1)
    expect(t.nextStep).not.toBe(ready.nextStep)
    expect(t.events.slice(-2).map(e => e.agent)).toEqual(['Coach', 'Planner'])
    expect((await post(app, `/targets/${created.id}/sql-debrief`, { attempts: [] })).status).toBe(400)
  })

  it('uses the model for the debrief', async () => {
    const out = { wentWell: 'You grouped by customer first.', keepWorkingOn: 'Filtering before you join.', suggestion: 'Next time, filter first.' }
    const provider = providerWith(async req => (req.step === 'sqlDebrief' ? out : { nextStep: 'Redo the join problem.' }))
    const { app } = makeApp({ provider })
    const { id } = await j<Target>(await create(app))
    await untilReady(app, id)
    const d = await j<typeof out>(await post(app, `/targets/${id}/sql-debrief`, { attempts: [{ problemId: 'p', title: 'T', query: 'select 1', passed: true }] }))
    expect(d).toMatchObject(out)
    expect((await j<Target>(await app.request(`/targets/${id}`, { headers: WS }))).nextStep).toBe('Redo the join problem.')
  })

  it('404s for an unknown target and deletes', async () => {
    const { app } = makeApp({ provider: null })
    const missing = await app.request('/targets/nope', { headers: WS })
    expect(missing.status).toBe(404)
    expect((await j(missing)).error).toBe('target_not_found')
    expect((await post(app, '/targets/nope/sql-turn', { problem: { id: 'p', title: 't', prompt: 'p' }, query: 'select 1', passed: true })).status).toBe(404)

    const { id } = await j<Target>(await create(app))
    await untilReady(app, id)
    expect((await app.request(`/targets/${id}`, { method: 'DELETE', headers: WS })).status).toBe(204)
    expect((await app.request(`/targets/${id}`, { headers: WS })).status).toBe(404)
  })

  it('requires a workspace', async () => {
    const { app } = makeApp({ provider: null })
    expect((await app.request('/targets')).status).toBeGreaterThanOrEqual(400)
  })
})
