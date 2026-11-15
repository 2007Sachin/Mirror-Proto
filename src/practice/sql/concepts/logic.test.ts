import { describe, expect, it } from 'vitest'
import { checkAnswer, isConceptId, mixedQueue, topicProgress, topicQueue } from './logic'

const mk = (id: string, topic: string, level: 1 | 2 | 3) => ({ id, topic, level })
const items = [mk('sql-c-a3', 'A', 3), mk('sql-c-a1', 'A', 1), mk('sql-c-a2', 'A', 2), mk('sql-c-b1', 'B', 1), mk('sql-c-b2', 'B', 2)]

describe('concept logic', () => {
  it('recognises ids and checks answers', () => {
    expect(isConceptId('sql-c-x')).toBe(true)
    expect(isConceptId('sql-window-1')).toBe(false)
    expect(checkAnswer(2, 2)).toBe(true)
    expect(checkAnswer(2, 1)).toBe(false)
    expect(checkAnswer(0, null)).toBe(false)
  })
  it('counts topic progress', () => {
    expect(topicProgress(items, 'A', new Set(['sql-c-a1', 'zzz']))).toEqual({ done: 1, total: 3 })
    expect(topicProgress(items, 'none', new Set())).toEqual({ done: 0, total: 0 })
  })
  it('queues unsolved first by level, and all again when done', () => {
    expect(topicQueue(items, 'A', new Set(['sql-c-a1'])).map(i => i.id)).toEqual(['sql-c-a2', 'sql-c-a3'])
    expect(topicQueue(items, 'A', new Set(['sql-c-a1', 'sql-c-a2', 'sql-c-a3'])).map(i => i.id)).toEqual(['sql-c-a1', 'sql-c-a2', 'sql-c-a3'])
  })
  it('mixes across topics, unsolved first, capped, deterministic', () => {
    const m = mixedQueue(items, ['A', 'B'], new Set(['sql-c-a1']), 4).map(i => i.id)
    expect(m).toEqual(['sql-c-a2', 'sql-c-b1', 'sql-c-a3', 'sql-c-b2'])
    expect(mixedQueue(items, ['A', 'B'], new Set(), 10)).toHaveLength(5)
    expect(mixedQueue([], ['A'], new Set())).toEqual([])
  })
})
