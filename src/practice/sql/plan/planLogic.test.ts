import { describe, expect, it } from 'vitest'
import { modules } from '../curriculum'
import { DIAG, GROUPS } from './diagnostic'
import { diagnose, findCycle, layers, minutesToGo, nodeState, planSummary, recommendNext, unlocks, type Answer } from './planLogic'
import { interviews, sceneName } from './notes'
import { scenes } from '../scenes'
import { prereqs } from './prereqs'

const ids = modules.map(m => m.id)
const right = (): Answer[] => DIAG.map(q => ({ id: q.id, pick: q.answer, conf: 'fairly' as const }))

describe('prereqs', () => {
  it('covers every module, references only real ids, has no cycle', () => {
    expect(Object.keys(prereqs).sort()).toEqual([...ids].sort())
    for (const ps of Object.values(prereqs)) for (const p of ps) expect(ids).toContain(p)
    expect(findCycle(prereqs)).toBeNull()
    expect(findCycle({ a: ['b'], b: ['a'] })).not.toBeNull()
  })
  it('puts a module after its prerequisites', () => {
    const l = layers(ids, prereqs)
    for (const [id, ps] of Object.entries(prereqs)) for (const p of ps) expect(l[id]).toBeGreaterThan(l[p])
  })
})

describe('plan states', () => {
  const pre = { a: [], b: ['a'], c: ['b'] }
  it('recommends the first unfinished module whose prerequisites are finished', () => {
    expect(recommendNext(['a', 'b', 'c'], pre, {})).toBe('a')
    expect(recommendNext(['a', 'b', 'c'], pre, { a: { done: 2, total: 2 } })).toBe('b')
    const all = { a: { done: 1, total: 1 }, b: { done: 1, total: 1 }, c: { done: 1, total: 1 } }
    expect(recommendNext(['a', 'b', 'c'], pre, all)).toBeUndefined()
  })
  it('names each state', () => {
    const prog = { a: { done: 2, total: 2 }, b: { done: 1, total: 3 }, c: { done: 0, total: 2 } }
    expect(nodeState('a', 'b', prog)).toBe('solved')
    expect(nodeState('b', 'b', prog)).toBe('next')
    expect(nodeState('b', undefined, prog)).toBe('progress')
    expect(nodeState('c', 'b', prog)).toBe('todo')
  })
})

describe('diagnostic', () => {
  it('has real groups and module ids, and answers in range', () => {
    for (const q of DIAG) { expect(GROUPS[q.group]).toBeDefined(); expect(q.answer).toBeLessThan(q.options.length) }
    for (const g of Object.values(GROUPS)) for (const m of g.modules) expect(ids).toContain(m)
  })
  it('all right means Advanced with the situations', () => {
    const d = diagnose(right(), ids)
    expect(d.level).toBe('advanced')
    expect(d.modules).toEqual(['sit-advanced', 'case-subs'])
  })
  it('a missed beginner idea starts at Beginner and notes a sure miss', () => {
    const a = right().map(x => (x.id === 'd1' ? { ...x, pick: 0, conf: 'certain' as const } : x))
    const d = diagnose(a, ids)
    expect(d.level).toBe('beginner')
    expect(d.modules).toEqual(['b3-nulls'])
    expect(d.surprises).toEqual([GROUPS.nulls.label])
  })
  it('a missed pro idea only starts at Pro', () => {
    const a = right().map(x => (x.id === 'd4' ? { ...x, pick: 0, conf: 'guess' as const } : x))
    const d = diagnose(a, ids)
    expect(d.level).toBe('pro')
    expect(d.modules).toEqual(['p7-joins-fanout'])
    expect(d.surprises).toEqual([])
  })
})

describe('plan page', () => {
  it('has an interview note for every module and a name for every scene', () => {
    for (const m of modules) { expect(interviews[m.id]?.length).toBeGreaterThan(10); if (m.sceneId) { expect(scenes[m.sceneId]).toBeTruthy(); expect(sceneName[m.sceneId]).toBeTruthy() } }
  })
  it('unlocks is the reverse of prerequisites', () => {
    const u = unlocks(ids, prereqs)
    expect(u['b2-select-where']).toContain('b3-nulls')
    for (const [id, ps] of Object.entries(prereqs)) for (const p of ps) expect(u[p]).toContain(id)
  })
  it('summarises counts and minutes', () => {
    const mods = [{ id: 'a', minutes: 10 }, { id: 'b', minutes: 20 }, { id: 'c', minutes: 30 }]
    const prog = { a: { done: 2, total: 2 }, b: { done: 1, total: 2 }, c: { done: 0, total: 3 } }
    expect(minutesToGo(mods, prog)).toBe(40)
    expect(planSummary(['a', 'b', 'c'], { b: ['a'], c: ['b'] }, prog)).toEqual({ solved: 1, progress: 1, left: 2, next: 'b' })
  })
})
