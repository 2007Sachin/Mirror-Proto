import { describe, expect, it, vi } from 'vitest'
import { acceptProbe, cleanResume, extractClaims, matchClaims, probeQuote, quotedFragments } from '../domain/resume.js'
import { extractSkills } from '../domain/scout.js'
import { ProviderFailure } from '../providers/nim.js'
import type { ReflectionProvider } from '../providers/types.js'
import { j, makeApp, makeEnv, WS } from './helpers.js'

const RESUME =
  'Jane Doe jane.doe@example.com +1 (415) 555-0199 SUMMARY Data analyst. EXPERIENCE ' +
  '• Built a Tableau dashboard that cut weekly reporting time from 6 hours to 1 hour. ' +
  '• Helped with various SQL reports for the finance team. ' +
  '• Worked on Python scripts. ' +
  '• Automated a pandas pipeline and reduced errors by 40 per cent. ' +
  'SKILLS SQL, Python, Excel, Git EDUCATION BSc Statistics, 2019'

const JD = `Data Analyst at Acme

Requirements:
- Strong SQL for reporting and ad hoc analysis
- Experience with Tableau dashboards
- Python for data cleaning
- Working with Docker

Nice to have:
- Airflow`

// Same rules as src/copyScan BANNED (not imported: that file needs a DOM).
const BANNED = [/\b(agentic|evidence|reflect\w*|evaluat\w*)\b/i, /\b\d+ questions?\b|\bof \d+\b/i, /\d\s?%|\bpercent(age)?\b/i]
const scan = (_where: string, text: string) => BANNED.filter(re => re.test(text)).map(String)

const skills = extractSkills(JD)
const claims = extractClaims(RESUME)
const rows = matchClaims(skills, claims)
const row = (s: string) => rows.find(r => r.skill === s)!

describe('extractClaims', () => {
  it('returns claims that are exact substrings of the cleaned résumé', () => {
    const clean = cleanResume(RESUME)
    expect(claims.length).toBeGreaterThanOrEqual(4)
    for (const c of claims) {
      expect(clean).toContain(c.quote)
      expect(c.quote.length).toBeLessThanOrEqual(220)
    }
  })

  it('strips emails and phone numbers', () => {
    for (const c of claims) expect(c.quote).not.toMatch(/@|555|\+1/)
    expect(cleanResume(RESUME)).not.toMatch(/jane\.doe@|555-0199/)
  })

  it('flags numbers, skills and vague lines', () => {
    const built = claims.find(c => c.quote.includes('cut weekly reporting'))!
    expect(built).toMatchObject({ hasNumber: true, vague: false })
    expect(built.skills).toContain('Tableau')
    expect(claims.find(c => c.quote.startsWith('Helped with various SQL'))?.vague).toBe(true)
    expect(claims.find(c => c.quote.startsWith('Worked on Python'))?.vague).toBe(true)
  })

  it('treats a bare skills list as vague', () => {
    const list = claims.find(c => c.quote.startsWith('SQL, Python'))
    expect(list?.vague).toBe(true)
  })

  it('splits section words and caps long claims', () => {
    const long = `Built ${'a very detailed pipeline '.repeat(30)}for finance.`
    const [c] = extractClaims(long)
    expect(c.quote.length).toBeLessThanOrEqual(220)
    expect(cleanResume(long)).toContain(c.quote)
  })
})

describe('matchClaims', () => {
  it('orders core skills first and uses plain statuses', () => {
    const firstNice = rows.findIndex(r => r.weight === 'nice')
    expect(rows.slice(0, firstNice).every(r => r.weight === 'core')).toBe(true)
    expect(row('Tableau').status).toBe('covered')
    expect(row('SQL').status).toBe('partial')
    expect(row('Python').status).toBe('partial')
    expect(row('Docker').status).toBe('gap')
    expect(row('Airflow').status).toBe('gap')
  })

  it('writes plain notes and probe questions that quote only the résumé', () => {
    const clean = cleanResume(RESUME)
    expect(row('Docker').note).toContain('core requirement')
    expect(row('Docker').probeQuestion).toBe('Docker comes up in this job. What is the closest thing you have done?')
    expect(row('Airflow').probeQuestion).toBeNull()
    expect(row('SQL').probeQuestion).toMatch(/^Your résumé says ".+"\. What did you do yourself, and what changed because of it\?$/)
    for (const r of rows) {
      expect(scan('note', r.note)).toEqual([])
      if (!r.probeQuestion) continue
      expect(r.probeQuestion.length).toBeGreaterThanOrEqual(8)
      expect(r.probeQuestion.length).toBeLessThanOrEqual(300)
      expect(r.probeQuestion.endsWith('?')).toBe(true)
      expect(scan('probe', r.probeQuestion)).toEqual([])
      for (const f of quotedFragments(r.probeQuestion)) expect(clean).toContain(f)
    }
  })

  it('asks for numbers when a clear line has no result', () => {
    const r = matchClaims(skills, extractClaims('Designed a Tableau dashboard for the sales team.')).find(m => m.skill === 'Tableau')!
    expect(r.status).toBe('partial')
    expect(r.probeQuestion).toMatch(/^What numbers could you put on "/)
  })

  it('clips a probe quote at a word edge', () => {
    const q = probeQuote(`Built ${'word '.repeat(60)}`)
    expect(q.length).toBeLessThanOrEqual(160)
    expect(q.endsWith('wor')).toBe(false)
  })
})

describe('acceptProbe', () => {
  const clean = cleanResume(RESUME)
  it('accepts verbatim quotes and rejects invented ones, bad endings and banned words', () => {
    expect(acceptProbe('Tell me about "Worked on Python scripts" in your own words?', clean)).toBe(true)
    expect(acceptProbe('Tell me about "Led a team of ten" in your own words?', clean)).toBe(false)
    expect(acceptProbe('Tell me more about the Python scripts', clean)).toBe(false)
    expect(acceptProbe('What evidence do you have for the Python scripts?', clean)).toBe(false)
  })
})

describe('GET /targets/:id/match', () => {
  const profile = {
    role: 'Data Analyst', story: 'I built things.', pressureQuestion: 'What went wrong?', pressureAnswer: 'A report broke.',
    summary: 'A short summary of me.', focus: 'Telling stories', firstQuestion: 'Tell me about a project you led?', resumeText: RESUME, resumeName: 'cv.pdf', mode: 'text',
  }
  const H = { ...WS, 'Content-Type': 'application/json' }
  type App = ReturnType<typeof makeApp>['app']
  const setup = async (app: App, withResume = true) => {
    await app.request('/profile', { method: 'PUT', headers: H, body: JSON.stringify({ ...profile, resumeText: withResume ? RESUME : null }) })
    const t = await j(await app.request('/targets', { method: 'POST', headers: H, body: JSON.stringify({ company: 'Acme', role: 'Data Analyst', jd: JD }) }))
    for (let i = 0; i < 200; i++) {
      if ((await j(await app.request(`/targets/${t.id}`, { headers: WS }))).status === 'ready') break
      await new Promise(r => setTimeout(r, 5))
    }
    return t.id as string
  }
  const rewriteProvider = (reply: () => Promise<Record<string, string>>): ReflectionProvider => ({
    async generateReflection() { throw new ProviderFailure('unused') },
    generateOnboarding: (async (req: { step: string }) => {
      if (req.step === 'resumeProbe') return reply()
      throw new ProviderFailure('not this step')
    }) as never,
  })

  it('Scout stores claims and matches in memory mode and says so', async () => {
    const { app, repo } = makeApp()
    const id = await setup(app)
    expect((await repo.listGapMatches('dev', id)).length).toBeGreaterThan(0)
    expect((await repo.listResumeClaims('dev')).length).toBeGreaterThan(0)
    const t = await j(await app.request(`/targets/${id}`, { headers: WS }))
    expect(t.events.map((e: { text: string }) => e.text)).toContain('I compared your résumé with the job.')
    const body = await j(await app.request(`/targets/${id}/match`, { headers: WS }))
    expect(body).toMatchObject({ hasResume: true, source: 'fallback', aiAttempted: false })
    expect(body.matches[0].weight).toBe('core')
    expect(body.probes.length).toBeLessThanOrEqual(3)
  })

  it('skips honestly without a résumé', async () => {
    const { app } = makeApp()
    const id = await setup(app, false)
    const t = await j(await app.request(`/targets/${id}`, { headers: WS }))
    expect(t.events.map((e: { text: string }) => e.text)).toContain('No résumé on file, so I skipped the comparison.')
    expect(await j(await app.request(`/targets/${id}/match`, { headers: WS }))).toMatchObject({ hasResume: false, matches: [], probes: [] })
  })

  it('POST re-runs from a new résumé', async () => {
    const { app } = makeApp()
    const id = await setup(app, false)
    await app.request('/profile', { method: 'PUT', headers: H, body: JSON.stringify(profile) })
    const body = await j(await app.request(`/targets/${id}/match`, { method: 'POST', headers: WS }))
    expect(body.hasResume).toBe(true)
    expect(body.matches.find((m: { skill: string }) => m.skill === 'SQL').status).toBe('partial')
  })

  it('logs only the error code when saving fails, and saved is true otherwise', async () => {
    const { createMemoryRepository } = await import('../repo/memory.js')
    const repo = createMemoryRepository()
    const boom = () => Promise.reject(Object.assign(new Error('secret row text'), { code: '42501' }))
    const wrapped = Object.assign(Object.create(repo), repo, { replaceResumeClaims: boom, replaceGapMatches: boom })
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const bad = makeApp({ repo: wrapped, env: makeEnv() }).app
    const body = await j(await bad.request(`/targets/${await setup(bad)}/match`, { headers: WS }))
    expect(body.saved).toBe(false)
    expect(JSON.stringify(log.mock.calls)).toContain('42501')
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret row text')
    log.mockRestore()
    const good = makeApp().app
    expect((await j(await good.request(`/targets/${await setup(good)}/match`, { headers: WS }))).saved).toBe(true)
  })

  it('keeps AI rewrites only when every quote is verbatim', async () => {
    const good = makeApp({ provider: rewriteProvider(async () => ({ q1: 'Docker comes up here. What have you done that is close to it?', q2: 'Walk me through "Worked on Python scripts" in detail?', q3: 'Tell me about "Helped with various SQL reports for the finance team" and what you did?' })) })
    const id = await setup(good.app)
    const ok = await j(await good.app.request(`/targets/${id}/match`, { headers: WS }))
    expect(ok.source).toBe('ai')
    expect(ok.aiAttempted).toBe(true)
    expect(ok.probes[0].question).toMatch(/^Docker comes up here/)

    const bad = makeApp({ provider: rewriteProvider(async () => ({ q1: 'What did you do?', q2: 'Tell me about "Led a team of fifty" please?', q3: 'And your SQL work?' })) })
    const id2 = await setup(bad.app)
    const no = await j(await bad.app.request(`/targets/${id2}/match`, { headers: WS }))
    expect(no).toMatchObject({ source: 'fallback', aiAttempted: true })
    expect(no.probes[0].question).toBe('Docker comes up in this job. What is the closest thing you have done?')
  })

  it('falls back on ProviderFailure and on a slow provider', async () => {
    for (const reply of [
      async () => { throw new ProviderFailure('down') },
      () => new Promise<Record<string, string>>(r => setTimeout(() => r({ q1: 'A fine question here?' }), 200)),
    ]) {
      const { app } = makeApp({ provider: rewriteProvider(reply), aiDeadlineMs: 10 })
      const id = await setup(app)
      const body = await j(await app.request(`/targets/${id}/match`, { headers: WS }))
      expect(body).toMatchObject({ source: 'fallback', aiAttempted: true })
      expect(body.matches.length).toBeGreaterThan(0)
    }
  })

  it('Supabase "storage_not_ready" does not break Scout or the route', async () => {
    const { createMemoryRepository } = await import('../repo/memory.js')
    const repo = createMemoryRepository()
    const notReady = () => Promise.reject(new Error('storage_not_ready'))
    const wrapped = Object.assign(Object.create(repo), repo, {
      replaceResumeClaims: notReady, replaceGapMatches: notReady, listResumeClaims: notReady, listGapMatches: notReady,
    })
    const { app } = makeApp({ repo: wrapped, env: makeEnv() })
    const id = await setup(app)
    const t = await j(await app.request(`/targets/${id}`, { headers: WS }))
    expect(t.status).toBe('ready')
    const body = await j(await app.request(`/targets/${id}/match`, { headers: WS }))
    expect(body.matches.find((m: { skill: string }) => m.skill === 'SQL').status).toBe('partial')
    expect(body.saved).toBe(false)
  })
})

vi.setConfig({ testTimeout: 15_000 })
