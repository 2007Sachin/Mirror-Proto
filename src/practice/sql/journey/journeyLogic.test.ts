import { describe, expect, it } from 'vitest'
import { modules as realModules } from '../curriculum'
import { problems as realProblems } from '../problems'
import { concepts as realConcepts } from '../concepts/data'
import { conceptTopics } from '../concepts/types'
import type { SqlModule } from '../curriculum'
import type { ConceptQuestion } from '../concepts/types'
import type { ItemStat } from '../../types'
import { buildJourney, type JourneyInput } from './journeyLogic'

const mod = (id: string, level: SqlModule['level'], pids: string[], extra: Partial<SqlModule> = {}): SqlModule =>
  ({ id, level, title: `T ${id}`, blurb: `Blurb ${id}.`, points: [], problemIds: pids, minutes: 10, ...extra })
const cq = (id: string, topic: string, level: 1 | 2 | 3 = 1): ConceptQuestion =>
  ({ id, topic, level, title: id, minutes: 1, question: '', options: [], answer: 0, why: '', sayIt: '' })
const stat = (itemId: string, o: Partial<ItemStat> = {}): ItemStat =>
  ({ itemId, track: 'sql', topic: 'x', level: 1, attempts: 1, firstTryCorrect: true, solved: true, seconds: 5, lastAt: '2026-01-01T10:00:00Z', solvedAt: '2026-01-01T10:00:00Z', ...o })

const base: JourneyInput = {
  modules: [mod('b3-nulls', 'beginner', ['p1', 'p2']), mod('p10-windows', 'pro', ['p3']), mod('a14-x', 'advanced', ['p4']), mod('p99-new', 'pro', ['p5']), mod('sit-b', 'beginner', ['p6'], { kind: 'situation' }), mod('case-z', 'pro', [], { kind: 'case' })],
  problems: [1, 2, 3, 4, 5, 6].map(n => ({ id: `p${n}`, topic: 't', level: ((n % 3) + 1) as 1 | 2 | 3 })),
  concepts: [cq('c1', 'Keys and constraints'), cq('c2', 'Keys and constraints', 2), cq('c3', 'Transactions and ACID', 3)],
  items: [], days: [], todayISO: '2026-01-02', placementDone: false,
}
const nodes = (j: ReturnType<typeof buildJourney>) => j.worlds.flatMap(w => w.nodes)

describe('buildJourney (fake data)', () => {
  it('places modules by id, falls back by level, skips situations and cases', () => {
    const j = buildJourney(base)
    const ids = (w: number) => j.worlds[w].nodes.map(n => n.id)
    expect(ids(0)).toEqual(['place', 'm:b3-nulls', 'c:Keys and constraints', 'boss:phone'])
    expect(ids(1)).toEqual(['m:p99-new', 'boss:onsite'])
    expect(ids(2)).toEqual(['m:p10-windows', 'boss:concepts'])
    expect(ids(3)).toEqual(['m:a14-x', 'c:Transactions and ACID', 'boss:senior'])
    expect(nodes(j).some(n => n.id.includes('sit-') || n.id.includes('case-'))).toBe(false)
  })

  it('has exactly one current node, placement first', () => {
    const j = buildJourney(base)
    expect(nodes(j).filter(n => n.status === 'current').map(n => n.id)).toEqual(['place'])
    expect(j.current?.id).toBe('place')
    const k = buildJourney({ ...base, placementDone: true })
    expect(nodes(k).filter(n => n.status === 'current').map(n => n.id)).toEqual(['m:b3-nulls'])
  })

  it('computes stars, status and xp', () => {
    const j = buildJourney({ ...base, placementDone: true, items: [stat('p1'), stat('p2', { firstTryCorrect: false }), stat('c1')] })
    const m = nodes(j).find(n => n.id === 'm:b3-nulls')!
    expect(m).toMatchObject({ solved: 2, total: 2, stars: 2, status: 'done', xp: 0 })
    const c = nodes(j).find(n => n.id === 'c:Keys and constraints')!
    expect(c).toMatchObject({ solved: 1, total: 2, stars: 1, status: 'current' })
    expect(c.xp).toBe(10 + 3)
    // p1 level 2 -> 20+5, p2 level 3 -> 30 (no bonus), c1 5+3, placement 20
    expect(j.xp).toBe(25 + 30 + 8 + 20)
  })

  it('awards three stars when all are solved first try, and finishes the route', () => {
    const items = ['p1', 'p2', 'p3', 'p4', 'p5', 'c1', 'c2', 'c3'].map(id => stat(id))
    const j = buildJourney({ ...base, placementDone: true, items })
    expect(nodes(j).find(n => n.id === 'm:b3-nulls')!.stars).toBe(3)
    expect(j.worlds.every(w => w.done)).toBe(true)
    expect(j.current).toBeNull()
    expect(j.guide.cta).toBeNull()
    expect(j.guide.text).toMatch(/mock test/)
  })

  it('maps xp to levels', () => {
    const at = (xp: number) => {
      // placement gives 20; a fake problem with level 3 gives 30 + 5
      const n = Math.max(0, Math.round((xp - 20) / 35))
      const problems = Array.from({ length: n }, (_, i) => ({ id: `q${i}`, topic: 't', level: 3 as const }))
      return buildJourney({ ...base, placementDone: true, problems, items: problems.map(p => stat(p.id)) })
    }
    expect(buildJourney(base).level).toMatchObject({ n: 1, title: 'Rookie', xpIntoLevel: 0, xpForNext: 100 })
    const l = at(125).level // 20 + 3*35 = 125
    expect(l).toMatchObject({ n: 2, title: 'Query Cadet', xpIntoLevel: 25, xpForNext: 150 })
    const top = buildJourney({ ...base, placementDone: true, problems: Array.from({ length: 110 }, (_, i) => ({ id: `q${i}`, topic: 't', level: 3 as const })), items: Array.from({ length: 110 }, (_, i) => stat(`q${i}`)) })
    expect(top.level).toMatchObject({ n: 8, title: 'Principal', xpForNext: 0 })
  })

  it('welcomes a brand-new learner', () => {
    const g = buildJourney(base).guide
    expect(g.mood).toBe('welcome')
    expect(g.cta).toEqual({ label: 'Find my level', nodeId: 'place' })
  })

  it('nudges to the current node and mentions a recent miss', () => {
    const j = buildJourney({ ...base, placementDone: true, items: [stat('p3', { solved: false, topic: 'Window functions', solvedAt: null, lastAt: '2026-01-02T09:00:00Z', firstTryCorrect: false })] })
    expect(j.guide.mood).toBe('nudge')
    expect(j.guide.text).toContain('NULLs trip up almost every screen')
    expect(j.guide.text).toContain('Window functions looked tricky last time')
    expect(j.guide.text.match(/tricky last time/g)).toHaveLength(1)
    expect(j.guide.text).toMatch(/\. Window functions looked/)
    expect(j.guide.text).not.toMatch(/\.\./)
  })

  it('has no tricky line when nothing was attempted, and ends sentences with a period', () => {
    const j = buildJourney({ ...base, placementDone: true })
    expect(j.guide.text).not.toContain('tricky')
    expect(j.guide.text).toMatch(/\.$/)
    expect(j.guide.cta).toEqual({ label: 'Start', nodeId: 'm:b3-nulls' })
  })

  it('cheers when a world was just finished', () => {
    const items = ['p1', 'p2', 'c1', 'c2'].map(id => stat(id))
    const j = buildJourney({ ...base, placementDone: true, items })
    expect(j.worlds[0].done).toBe(true)
    expect(j.guide.mood).toBe('cheer')
    expect(j.guide.text).toContain('Query Cartographer')
  })

  it('tracks the daily quest', () => {
    const today = '2026-01-02T08:00:00Z'
    const q = (n: number) => buildJourney({ ...base, placementDone: true, items: ['p1', 'p2', 'p3'].slice(0, n).map(id => stat(id, { solvedAt: today })) }).quest
    expect(q(1)).toEqual({ text: 'Solve 3 problems today', progress: '1 of 3', done: false })
    expect(q(3)).toMatchObject({ progress: '3 of 3', done: true })
    const fallback = buildJourney({ ...base, days: [{ date: '2026-01-02', attempts: 2, seconds: 9 }] })
    expect(fallback.quest.progress).toBe('2 of 3')
  })

  it('awards badges', () => {
    const none = buildJourney(base).badges
    expect(none.every(b => !b.earned)).toBe(true)
    const j = buildJourney({ ...base, placementDone: true, items: ['p1', 'p2', 'c1', 'c2'].map(id => stat(id)) })
    const e = (id: string) => j.badges.find(b => b.id === id)!.earned
    expect(e('first-solve')).toBe(true)
    expect(e('ten-solved')).toBe(false)
    expect(e('concept-starter')).toBe(true)
    expect(e('phone-ready')).toBe(true)
    expect(e('world:foundations')).toBe(true)
    expect(e('world:core')).toBe(false)
  })
})

describe('buildJourney (real data)', () => {
  const j = buildJourney({ modules: realModules, problems: realProblems, concepts: realConcepts, items: [], days: [], todayISO: '2026-01-01', placementDone: false })
  const all = nodes(j)

  it('puts every plain module in exactly one world node', () => {
    for (const m of realModules.filter(m => m.kind !== 'situation' && m.kind !== 'case')) {
      expect(all.filter(n => n.moduleId === m.id), m.id).toHaveLength(1)
    }
    expect(all.filter(n => n.kind === 'module')).toHaveLength(realModules.filter(m => m.kind !== 'situation' && m.kind !== 'case').length)
  })

  it('puts every concept topic in exactly one node, and one current node', () => {
    for (const t of conceptTopics) expect(all.filter(n => n.conceptTopic === t), t).toHaveLength(1)
    expect(all.filter(n => n.status === 'current')).toHaveLength(1)
    expect(j.worlds).toHaveLength(4)
  })
})
