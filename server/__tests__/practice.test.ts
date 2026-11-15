import { describe, expect, it } from 'vitest'
import { summarise } from '../domain/practice.js'
import type { PracticeAttemptRow } from '../repo/types.js'
import { j, makeApp, WS } from './helpers.js'

const NOW = new Date('2026-06-30T12:00:00Z')
let n = 0
const at = (itemId: string, createdAt: string, o: Partial<PracticeAttemptRow> = {}): PracticeAttemptRow => ({
  id: `a${n++}`, itemId, track: 'sql', topic: 'Joins', level: 1, correct: false, seconds: 10, hintsUsed: 0, createdAt, ...o,
})

describe('summarise', () => {
  it('keeps only the last 12 attempts in history', () => {
    const rows = Array.from({ length: 15 }, (_, i) => at('h', `2026-06-${String(i + 1).padStart(2, '0')}T10:00:00Z`, { correct: i % 2 === 0 }))
    const h = summarise(rows, NOW).items[0].history
    expect(h).toHaveLength(12)
    expect(h[0].at).toBe('2026-06-04T10:00:00Z')
    expect(h[11].at).toBe('2026-06-15T10:00:00Z')
  })

  it('first-try vs later solve, time totals, latest metadata', () => {
    const { items } = summarise(
      [
        at('x', '2026-06-01T10:00:00Z', { seconds: 30, topic: 'Old', level: 2 }),
        at('x', '2026-06-02T10:00:00Z', { correct: true, seconds: 20, topic: 'Aggregation', level: 3 }),
        at('x', '2026-06-03T10:00:00Z', { correct: true, seconds: 5, topic: 'Joins', level: 1 }),
        at('y', '2026-06-01T10:00:00Z', { correct: true }),
      ],
      NOW,
    )
    const x = items.find(i => i.itemId === 'x')!
    expect(x).toMatchObject({ attempts: 3, firstTryCorrect: false, solved: true, seconds: 55, solvedAt: '2026-06-02T10:00:00Z', lastAt: '2026-06-03T10:00:00Z' })
    expect(x).toMatchObject({ topic: 'Joins', level: 1 }) // from the most recent attempt
    expect(x.lastCorrect).toBe(true)
    expect(x.history.map(h => h.correct)).toEqual([false, true, true]) // oldest first
    expect(items.find(i => i.itemId === 'y')).toMatchObject({ firstTryCorrect: true, solved: true })
  })

  it('sorts input by time, so unordered attempts still find the earliest', () => {
    const { items } = summarise([at('z', '2026-06-02T00:00:00Z', { correct: true }), at('z', '2026-06-01T00:00:00Z')], NOW)
    expect(items[0]).toMatchObject({ firstTryCorrect: false, solvedAt: '2026-06-02T00:00:00Z' })
  })

  it('days: per UTC day, oldest first, only active days, 84-day window', () => {
    const { days } = summarise(
      [
        at('a', '2026-06-29T23:59:00Z', { seconds: 5 }),
        at('a', '2026-06-10T00:00:00Z', { seconds: 7 }),
        at('b', '2026-06-10T08:00:00Z', { seconds: 3 }),
        at('c', '2026-03-01T00:00:00Z'), // 121 days back: outside
      ],
      NOW,
    )
    expect(days).toEqual([
      { date: '2026-06-10', attempts: 2, seconds: 10 },
      { date: '2026-06-29', attempts: 1, seconds: 5 },
    ])
  })

  it('keeps old items in items but drops them from days', () => {
    const s = summarise([at('c', '2026-03-01T00:00:00Z')], NOW)
    expect(s.items).toHaveLength(1)
    expect(s.days).toEqual([])
  })
})

describe('practice routes', () => {
  const body = { itemId: 'sql-join-1', track: 'sql', topic: 'Joins', level: 1, correct: true, seconds: 42, hintsUsed: 0 }
  const post = (app: ReturnType<typeof makeApp>['app'], b: unknown) =>
    app.request('/practice/attempts', { method: 'POST', headers: { ...WS, 'Content-Type': 'application/json' }, body: JSON.stringify(b) })

  it.each([
    ['bad track', { track: 'rust' }],
    ['level 4', { level: 4 }],
    ['seconds 5000', { seconds: 5000 }],
    ['hints 21', { hintsUsed: 21 }],
    ['empty itemId', { itemId: '' }],
  ])('rejects %s with 400', async (_n, patch) => {
    const { app } = makeApp()
    expect((await post(app, { ...body, ...patch })).status).toBe(400)
  })

  it('round trips and isolates workspaces', async () => {
    const { app } = makeApp()
    const res = await post(app, body)
    expect(res.status).toBe(201)
    expect((await j(res)).id).toBeTruthy()
    const sum = await j(await app.request('/practice/summary', { headers: WS }))
    expect(sum.items).toHaveLength(1)
    expect(sum.items[0]).toMatchObject({ itemId: 'sql-join-1', attempts: 1, firstTryCorrect: true, solved: true, seconds: 42 })
    expect(sum.days).toHaveLength(1)
    const other = await j(await app.request('/practice/summary', { headers: { 'X-Dev-Workspace': 'someone-else' } }))
    expect(other).toEqual({ items: [], days: [] })
  })
})
