import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fallbackNotes } from '../domain/fallbacks.js'
import { FALLBACK_QUESTIONS } from '../domain/questions.js'
import { ProviderFailure, createNimClient } from '../providers/nim.js'
import type { ReflectionProvider } from '../providers/types.js'
import { createMemoryRepository } from '../repo/memory.js'
import { validateEvidence } from '../domain/stateMachine.js'
import type { TurnRow } from '../repo/types.js'
import { j, makeApp, makeEnv, WS } from './helpers.js'

const JSON_HEADERS = { ...WS, 'Content-Type': 'application/json' }
type App = ReturnType<typeof makeApp>['app']
const post = (app: App, path: string, body?: unknown) =>
  app.request(path, { method: 'POST', headers: JSON_HEADERS, body: body ? JSON.stringify(body) : undefined })

const answers = [
  'I rebuilt the weekly report. It took two weeks and nobody had asked for it.',
  'I owned the data model and chose to drop the legacy joins.',
  'Finance pushed back, so I walked them through the old and new numbers side by side.',
  'The report went live and the Monday meeting got shorter.',
]
const profile = {
  role: 'Data Analyst',
  story: 'I rebuilt a weekly report that nobody had asked for.',
  pressureQuestion: 'What pushed back?',
  pressureAnswer: 'Finance did not trust the new totals. I showed them both side by side.',
  summary: 'You rebuilt a report.',
  focus: 'Explaining trade-offs plainly',
  firstQuestion: 'What did finance need from you?',
  resumeText: null,
  resumeName: null,
  mode: 'text' as const,
}

const never = (() => new Promise(() => {})) as unknown as typeof fetch
const failing: ReflectionProvider = {
  async generateReflection() {
    throw new ProviderFailure('down')
  },
  async generateFollowUp() {
    throw new ProviderFailure('down')
  },
  async generateOnboarding() {
    throw new ProviderFailure('down')
  },
}

async function finish(app: App, role = 'Data Analyst') {
  const { id } = await j<{ id: string }>(await post(app, '/interviews', { role }))
  for (let i = 0; i < 4; i++) expect((await post(app, `/interviews/${id}/turns`, { questionIndex: i, answer: answers[i] })).status).toBe(201)
  return id
}

describe('provider deadline', () => {
  it('stops waiting on a call that never answers', async () => {
    const nim = createNimClient(makeEnv({ nimApiKey: 'k' }), never, undefined, 60_000, 0, 3, 25)
    const started = Date.now()
    await expect(nim.generateFollowUp({ role: 'x', industry: null, turns: [], nextIndex: 0 })).rejects.toBeInstanceOf(ProviderFailure)
    expect(Date.now() - started).toBeLessThan(1_000)
  })

  it('bounds the retries too', async () => {
    let calls = 0
    const slow500 = (async () => {
      calls++
      await new Promise(r => setTimeout(r, 10))
      return new Response('{}', { status: 500 })
    }) as typeof fetch
    const nim = createNimClient(makeEnv({ nimApiKey: 'k' }), slow500, undefined, 60_000, 40, 50, 60)
    await expect(nim.generateReflection({ role: 'x', questions: [], turns: [] })).rejects.toBeInstanceOf(ProviderFailure)
    expect(calls).toBeLessThan(10)
  })
})

describe('notes fallback', () => {
  it('quotes only their own words and passes the quote check', () => {
    const turns = answers.map((answer, i) => ({ id: `t${i}`, answer })) as unknown as TurnRow[]
    const out = fallbackNotes(turns, null)
    expect(out.whatStoodOut.length).toBe(3)
    expect(validateEvidence(turns, out.whatStoodOut.map(q => ({ ...q, observation: '', competency: '' }))).ok).toBe(true)
    expect(out.suggestion.startsWith('Next time')).toBe(true)
    expect(out.keepWorkingOn).toBe('Saying what you personally decided, in one clear sentence.')
    expect(fallbackNotes(turns, 'Explaining trade-offs plainly').keepWorkingOn).toBe('Explaining trade-offs plainly')
  })

  it('caps a long first sentence at 200 characters', () => {
    const long = 'word '.repeat(80).trim()
    const [q] = fallbackNotes([{ id: 'a', answer: long }], null).whatStoodOut
    expect(q.quote.length).toBeLessThanOrEqual(200)
    expect(long.includes(q.quote)).toBe(true)
  })
})

describe('slow or failing model on each call', () => {
  it('a turn gets the catalogue question, led by their words, flagged as fallback', async () => {
    const { app } = makeApp({ provider: failing })
    const { id } = await j<{ id: string }>(await post(app, '/interviews', { role: 'Data Analyst' }))
    const res = await post(app, `/interviews/${id}/turns`, { questionIndex: 0, answer: answers[0] })
    expect(res.status).toBe(201)
    const body = await j(res)
    expect(body.source).toBe('fallback')
    expect(body.nextQuestion).toContain(FALLBACK_QUESTIONS[1])
    expect(body.nextQuestion).toContain('I rebuilt the weekly report.')
  })

  it('a hanging provider still answers within the deadline', async () => {
    const nim = createNimClient(makeEnv({ nimApiKey: 'k' }), never, undefined, 60_000, 0, 3, 25)
    const { app } = makeApp({ provider: nim, aiDeadlineMs: 25 })
    const { id } = await j<{ id: string }>(await post(app, '/interviews', { role: 'Data Analyst' }))
    const started = Date.now()
    const res = await post(app, `/interviews/${id}/turns`, { questionIndex: 0, answer: answers[0] })
    expect(Date.now() - started).toBeLessThan(1_000)
    expect((await j(res)).source).toBe('fallback')
  })

  it('a provider that ignores its own abort is still cut off by the app deadline', async () => {
    const { app } = makeApp({
      provider: { generateReflection: () => new Promise(() => {}), generateFollowUp: () => new Promise(() => {}) },
      aiDeadlineMs: 25,
    })
    const id = await finish(app)
    const res = await post(app, `/interviews/${id}/reflect`)
    expect(res.status).toBe(201)
    expect((await j(res)).source).toBe('fallback')
  })

  it('onboarding steps flag the source and the gap comes from their pressure answer', async () => {
    const { app } = makeApp({ provider: failing })
    const res = await post(app, '/onboarding/step', { step: 'contract', story: profile.story, question: 'What pushed back?', answer: profile.pressureAnswer })
    const body = await j(res)
    expect(body.source).toBe('fallback')
    expect(body.gap).toContain('Finance did not trust the new totals.')
    const ok = makeApp({
      provider: { generateReflection: failing.generateReflection, generateOnboarding: async () => ({ question: 'What did you say to them?' }) },
    })
    expect((await j(await post(ok.app, '/onboarding/step', { step: 'pressure', story: profile.story }))).source).toBe('ai')
  })

  it('a fallback coach note is flagged and not cached', async () => {
    let healthy = false
    const provider: ReflectionProvider = {
      generateReflection: failing.generateReflection,
      async generateOnboarding() {
        if (!healthy) throw new ProviderFailure('slow')
        return { observation: 'You lead with the work, not the decision you made.', nextPractice: 'Practise one answer out loud.', practiceQuestion: 'What did you decide?' }
      },
    }
    const { app } = makeApp({ provider })
    await app.request('/profile', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(profile) })
    const first = await j(await app.request('/coach-note', { headers: WS }))
    expect(first.source).toBe('fallback')
    healthy = true
    const second = await j(await app.request('/coach-note', { headers: WS }))
    expect(second.source).toBe('ai')
    expect(second.observation).toContain('You lead with the work')
  })

  it('a target next step and sql round carry a source', async () => {
    const { app } = makeApp({ provider: failing })
    const created = await j<{ id: string }>(
      await post(app, '/targets', { company: 'Acme', role: 'Data Analyst', jd: 'Strong SQL for reporting and ad hoc analysis. Tableau dashboards.' }),
    )
    let t: { status: string; nextStepSource: string } | undefined
    for (let i = 0; i < 200 && t?.status !== 'ready'; i++) {
      t = await j(await app.request(`/targets/${created.id}`, { headers: WS }))
      await new Promise(r => setTimeout(r, 5))
    }
    expect(t?.nextStepSource).toBe('fallback')
    const turn = await post(app, `/targets/${created.id}/sql-turn`, { problem: { id: 'p', title: 'T', prompt: 'P' }, query: 'select 1', passed: true })
    expect((await j(turn)).source).toBe('fallback')
    const debrief = await post(app, `/targets/${created.id}/sql-debrief`, { attempts: [{ problemId: 'p', title: 'T', query: 'select 1', passed: true }] })
    expect((await j(debrief)).source).toBe('fallback')
  })
})

describe('Sessions data path', () => {
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

  it('lists every finished session after a reload, with notes written on demand', async () => {
    const repo = createMemoryRepository()
    const first = makeApp({ repo })
    const ids: string[] = []
    for (let i = 0; i < 12; i++) {
      ids.push(await finish(first.app))
      await sleep(2)
    }
    await post(first.app, `/interviews/${ids[0]}/reflect`)
    const { app: reloaded } = makeApp({ repo }) // a new app on the same repo = a reload
    const list = await j<{ id: string; status: string; answered: number; notes: unknown }[]>(await reloaded.request('/interviews?limit=100', { headers: WS }))
    expect(list.map(i => i.id)).toEqual([...ids].reverse())
    expect(list.every(i => i.status === 'completed' && i.answered === 4)).toBe(true)
    expect(list.find(i => i.id === ids[0])?.notes).toBeTruthy()
    expect(list.find(i => i.id === ids[1])?.notes).toBeNull()
    const one = await j(await reloaded.request(`/interviews/${ids[1]}`, { headers: WS }))
    expect(one.turns.length).toBe(4)
    expect((await post(reloaded, `/interviews/${ids[1]}/reflect`)).status).toBe(201)
  })

  it('keeps the default recent list at 10 and pages with before', async () => {
    const repo = createMemoryRepository()
    const { app } = makeApp({ repo })
    const ids: string[] = []
    for (let i = 0; i < 13; i++) {
      ids.push(await finish(app))
      await sleep(2)
    }
    const recent = await j<{ id: string; createdAt: string }[]>(await app.request('/interviews', { headers: WS }))
    expect(recent.length).toBe(10)
    const page = await j<{ id: string }[]>(await app.request(`/interviews?limit=10&before=${encodeURIComponent(recent[9].createdAt)}`, { headers: WS }))
    expect(page.map(i => i.id)).toEqual([ids[2], ids[1], ids[0]])
  })

  it('pages the memory repository directly', async () => {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('w')
    for (let i = 0; i < 5; i++) {
      await repo.createInterview('w', { role: `r${i}`, openingQuestion: 'q' })
      await sleep(2)
    }
    const all = await repo.listInterviews('w')
    expect(all.length).toBe(5)
    const two = await repo.listInterviews('w', { limit: 2 })
    expect(two.map(i => i.role)).toEqual(['r4', 'r3'])
    const next = await repo.listInterviews('w', { limit: 2, before: two[1].createdAt })
    expect(next.map(i => i.role)).toEqual(['r2', 'r1'])
  })
})

describe('learner-facing copy', () => {
  const banned = /\b(agentic|evidence|reflect\w*|evaluat\w*)\b/i
  // Identifiers and the instruction that forbids the words are allowed; anything else a learner could read is not.
  const allowed = [/Never use the words/, /^(evidence|reflection|reflect)$/, /reflection_|_reflection|\/reflect|\.reflection|\breflectionFocus\b/]

  function files(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
      const p = join(dir, name)
      if (name === '__tests__' || name === 'voice' || name === 'scripts') return [] // dev scripts are not learner-facing
      return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []
    })
  }

  it('has no banned words in strings the learner can read', () => {
    const hits: string[] = []
    for (const file of files(join(import.meta.dirname, '..'))) {
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
        const text = m[2]
        if (banned.test(text) && !allowed.some(a => a.test(text))) hits.push(`${file}: ${text.slice(0, 80)}`)
      }
    }
    expect(hits).toEqual([])
  })
})
