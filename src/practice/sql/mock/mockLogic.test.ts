import { describe as desc, expect, it } from 'vitest'
import { buildMock, clockText, customPreset, describe, milestone, outcome, PRESETS, remainingMs, revisit, summarise, type Cand, type QResult } from './mockLogic'

const topics = ['a', 'b', 'c', 'd', 'e', 'f']
const mk = (p: string, n: number): Cand[] => Array.from({ length: n }, (_, i) => ({ id: `${p}${i}`, topic: topics[i % 6], level: ((i % 3) + 1) as 1 | 2 | 3, pattern: `pat${i % 4}` }))
const sqlPool = mk('s', 24), conPool = mk('c', 24)
const phone = PRESETS[0], analyst = PRESETS[1]

desc('buildMock', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = buildMock(analyst, sqlPool, conPool, new Set(), 7), b = buildMock(analyst, sqlPool, conPool, new Set(), 7)
    expect(a).toEqual(b)
    const others = [8, 9, 10, 11].map(s => buildMock(analyst, sqlPool, conPool, new Set(), s).items)
    expect(others.some(o => JSON.stringify(o) !== JSON.stringify(a.items))).toBe(true)
  })
  it('has the right counts, SQL first, easy to hard', () => {
    const t = buildMock(analyst, sqlPool, conPool, new Set(), 1)
    expect(t.items.map(i => i.kind)).toEqual(['sql', 'sql', 'sql', 'sql', 'concept', 'concept', 'concept', 'concept'])
    const lv = (id: string) => [...sqlPool, ...conPool].find(c => c.id === id)!.level
    const s = t.items.filter(i => i.kind === 'sql').map(i => lv(i.id))
    expect(s).toEqual([...s].sort())
  })
  it('prefers unsolved questions', () => {
    const solved = new Set(sqlPool.slice(0, 18).map(c => c.id))
    const t = buildMock(phone, sqlPool, conPool, solved, 3)
    expect(t.items.every(i => !solved.has(i.id))).toBe(true)
  })
  it('spreads across topics when it can', () => {
    for (let seed = 0; seed < 20; seed++) {
      const ts = buildMock(analyst, sqlPool, conPool, new Set(), seed).items.filter(i => i.kind === 'sql').map(i => sqlPool.find(c => c.id === i.id)!.topic)
      expect(new Set(ts).size).toBe(ts.length)
    }
  })
  it('copes with a small pool', () => {
    expect(buildMock(analyst, sqlPool.slice(0, 2), [], new Set(), 1).items).toHaveLength(2)
  })
})

desc('presets', () => {
  it('describes in words', () => {
    expect(describe(phone)).toBe('3 SQL questions (1 Beginner + 2 Pro). 30 minutes.')
    expect(describe(PRESETS[3])).toBe('12 concept questions. 15 minutes.')
  })
  it('clamps custom', () => {
    const p = customPreset({ count: 99, minutes: 1, concepts: true, difficulty: 0 })
    expect(p.sql.length + p.concepts.length).toBe(8)
    expect(p.minutes).toBe(10)
    expect(customPreset({ count: 4, minutes: 20, concepts: false, difficulty: 1 }).sql).toEqual([1, 1, 1, 1])
  })
})

const r = (o: Partial<QResult>): QResult => ({ id: 'x', kind: 'sql', title: 't', topic: 'T', tries: 0, solved: false, first: false, seconds: 10, ...o })
desc('results', () => {
  const rs = [r({ id: '1', tries: 1, solved: true, first: true }), r({ id: '2', tries: 3, solved: true }), r({ id: '3', tries: 2, topic: 'U' }), r({ id: '4', topic: 'V', moduleId: 'm' })]
  it('names outcomes and counts them', () => {
    expect(rs.map(outcome)).toEqual(['Solved first try', 'Solved', 'Not yet', 'Skipped'])
    expect(summarise(rs, 600, 1800)).toMatchObject({ firstTry: 1, afterRetries: 1, notSolved: 1, skipped: 1, usedSeconds: 600, allowedSeconds: 1800 })
  })
  it('revisits unsolved then slowest, once per module/topic', () => {
    const v = revisit([...rs, r({ id: '5', tries: 1, solved: true, first: true, topic: 'W', seconds: 300 })])
    expect(v.map(x => x.key)).toEqual(['U', 'm', 'W'])
    expect(v[2].why).toBe('Took the longest')
  })
})

desc('clock', () => {
  it('clamps and formats', () => {
    expect(remainingMs(1000, 61000, 31000)).toBe(30000)
    expect(remainingMs(1000, 61000, -99999)).toBe(60000) // clock moved back: no extra time
    expect(remainingMs(1000, 61000, 99999)).toBe(0)
    expect(clockText(61000)).toBe('01:01')
  })
  it('announces 10/5/1 only inside the test', () => {
    const total = 30 * 60000
    expect(milestone(11 * 60000, total)).toBeNull()
    expect(milestone(9 * 60000, total)).toBe(10)
    expect(milestone(4 * 60000, total)).toBe(5)
    expect(milestone(30000, total)).toBe(1)
    expect(milestone(9 * 60000, 10 * 60000)).toBeNull()
  })
})

desc('spoken option', () => {
  it('is off by default, so old settings and snapshots behave as before', () => {
    const c = customPreset({ count: 4, minutes: 30, concepts: true, difficulty: 0 })
    expect(c.spoken).toBeUndefined()
    expect(describe(c)).not.toContain('out loud')
    expect(buildMock(c, sqlPool, conPool, new Set(), 1).spoken).toBeUndefined()
  })
  it('adds one sentence and carries through when on', () => {
    const c = customPreset({ count: 4, minutes: 30, concepts: true, difficulty: 0, spoken: true })
    expect(describe(c)).toMatch(/ You will explain each answer out loud afterwards\.$/)
    expect(buildMock(c, sqlPool, conPool, new Set(), 1).spoken).toBe(true)
  })
})
