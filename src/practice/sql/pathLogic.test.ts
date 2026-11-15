import { describe, expect, it } from 'vitest'
import { buildQueue, minutesLeft, moduleProgress, nextUnsolvedModule, noteAttempt, solvedSet, summarize, unsolvedIds } from './pathLogic'

const mods = [{ id: 'm1', problemIds: ['a', 'b'] }, { id: 'm2', problemIds: ['c', 'd'] }, { id: 'm3', problemIds: [] }]
const probs = [
  { id: 'a', topic: 'T1', level: 1 as const }, { id: 'b', topic: 'T1', level: 2 as const },
  { id: 'c', topic: 'T2', level: 3 as const }, { id: 'd', topic: 'T2', level: 1 as const },
  { id: 'e', topic: 'T2', level: 2 as const },
]

describe('pathLogic', () => {
  const solved = solvedSet([{ itemId: 'a', solved: true }, { itemId: 'b', solved: true }, { itemId: 'x', solved: false }])
  it('counts progress and finds the next module', () => {
    expect(moduleProgress(mods[0], solved)).toEqual({ done: 2, total: 2 })
    expect(nextUnsolvedModule(mods, solved)?.id).toBe('m2')
    expect(nextUnsolvedModule(mods, new Set(['a', 'b', 'c', 'd']))).toBeUndefined()
    expect(unsolvedIds(mods[1], new Set(['c']))).toEqual(['d'])
  })
  it('builds a queue: filters, prefers unsolved, easy to hard, capped', () => {
    expect(buildQueue(probs, { topics: ['T2'], level: 0, count: 10, solved: new Set() }).map(p => p.id)).toEqual(['d', 'e', 'c'])
    expect(buildQueue(probs, { topics: [], level: 0, count: 3, solved }).map(p => p.id)).toEqual(['d', 'e', 'c'])
    expect(buildQueue(probs, { topics: [], level: 1, count: 5, solved: new Set(['a']) }).map(p => p.id)).toEqual(['d', 'a'])
    expect(buildQueue([], { topics: [], level: 0, count: 5, solved })).toEqual([])
  })
  it('summarises a run in counts', () => {
    let r = noteAttempt({}, 'a', true)
    r = noteAttempt(r, 'b', false)
    r = noteAttempt(r, 'b', true)
    expect(summarize(['a', 'b', 'c'], r)).toEqual({ solved: 2, first: 1, notYet: 1 })
  })
  it('rounds minutes left up and never goes negative', () => {
    expect(minutesLeft(61000, 0)).toBe(2)
    expect(minutesLeft(0, 5000)).toBe(0)
  })
})

import { freeSections, mockPresetId, parseTab } from './pathLogic'
describe('three-tab helpers', () => {
  it('parses tabs and falls back to the journey', () => {
    expect(parseTab('mock')).toBe('mock')
    expect(parseTab('beginner')).toBe('journey')
    expect(parseTab(null)).toBe('journey')
  })
  it('maps the onsite boss to the analyst mock', () => {
    expect(mockPresetId('onsite')).toBe('analyst')
    expect(mockPresetId('phone')).toBe('phone')
  })
  it('groups plain modules by level and splits out stories', () => {
    const m = [{ id: 'a', level: 'pro' }, { id: 'b', level: 'beginner' }, { id: 's', level: 'pro', kind: 'situation' as const }, { id: 'c', level: 'pro', kind: 'case' as const }]
    const r = freeSections(m, ['beginner', 'pro', 'advanced'])
    expect(r.groups.map(g => [g.level, g.mods.map(x => x.id)])).toEqual([['beginner', ['b']], ['pro', ['a']]])
    expect(r.stories.map(x => x.id)).toEqual(['s', 'c'])
  })
})
