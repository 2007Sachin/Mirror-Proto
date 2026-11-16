import { describe, expect, it } from 'vitest'
import { dueReps, LADDER, replayReason, upcomingReps } from './replay'
import type { ItemStat } from './types'

const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).toISOString()
const item = (id: string, hist: [string, boolean][]): ItemStat => ({
  itemId: id, track: 'sql', topic: 'Joins', level: 1, attempts: hist.length, firstTryCorrect: hist[0][1], solved: hist.some(h => h[1]),
  seconds: 60, lastAt: hist[hist.length - 1][0], solvedAt: null, lastCorrect: hist[hist.length - 1][1], history: hist.map(([a, c]) => ({ at: a, correct: c })),
})
const now = new Date(2026, 10, 10, 12)
const ids = (x: ItemStat[], n = now, iv?: string | null) => dueReps(x, n, iv).map(r => r.itemId)
const rung2 = () => item('a', [[at(2026, 11, 1), true], [at(2026, 11, 2), true], [at(2026, 11, 5), true]]) // next gap 7

describe('ladder', () => {
  it('is 1, 3, 7', () => expect(LADDER).toEqual([1, 3, 7]))
  it('first attempt is due after 1 day, not before', () => {
    const x = item('a', [[at(2026, 11, 9), true]])
    expect(ids([x])).toEqual(['a'])
    expect(ids([x], new Date(2026, 10, 9, 20))).toEqual([])
  })
  it('a correct replay moves to 3 then 7 days, then retires', () => {
    const r1 = item('a', [[at(2026, 11, 1), true], [at(2026, 11, 2), true]])
    expect(ids([r1], new Date(2026, 10, 4, 12))).toEqual([])
    expect(ids([r1], new Date(2026, 10, 5, 12))).toEqual(['a'])
    expect(ids([rung2()], new Date(2026, 10, 11, 12))).toEqual([])
    expect(ids([rung2()], new Date(2026, 10, 12, 12))).toEqual(['a'])
    const r3 = item('a', [[at(2026, 11, 1), true], [at(2026, 11, 2), true], [at(2026, 11, 5), true], [at(2026, 11, 12), true]])
    expect(ids([r3], new Date(2027, 0, 30))).toEqual([])
  })
  it('a miss returns to rung 0, also after retirement', () => {
    const x = item('a', [[at(2026, 11, 1), true], [at(2026, 11, 2), true], [at(2026, 11, 5), false]])
    expect(ids([x], new Date(2026, 10, 6, 12))).toEqual(['a'])
    const y = item('a', [[at(2026, 11, 1), true], [at(2026, 11, 2), true], [at(2026, 11, 5), true], [at(2026, 11, 12), true], [at(2026, 11, 20), false]])
    expect(ids([y], new Date(2026, 10, 21, 12))).toEqual(['a'])
  })
  it('same-day repeat and early replay do not advance', () => {
    const x = item('a', [[at(2026, 11, 1, 8), true], [at(2026, 11, 1, 18), true]])
    expect(ids([x], new Date(2026, 10, 2, 12))).toEqual(['a'])
    const y = item('a', [[at(2026, 11, 1), true], [at(2026, 11, 2), true], [at(2026, 11, 3), true]]) // 1 day gap < 3: stays on 3
    expect(ids([y], new Date(2026, 10, 6, 12))).toEqual(['a'])
    expect(ids([y], new Date(2026, 10, 5, 12))).toEqual([])
  })
  it('no history uses lastAt and solved; no attempts are skipped', () => {
    const base = item('a', [[at(2026, 11, 8), false]])
    const old: ItemStat = { ...base, history: undefined, lastCorrect: undefined }
    expect(dueReps([old], now)[0].reason).toContain('missed')
    expect(ids([{ ...old, attempts: 0 }])).toEqual([])
  })
})

describe('compression', () => {
  it('caps the gap at half the days left and flags it', () => {
    const r = dueReps([rung2()], now, '2026-11-14') // D=4, cap 2, due 11-07
    expect(r[0].compressed).toBe(true)
    expect(r[0].reason).toBe('Your interview is in 4 days, so the gaps between replays are shorter now.')
  })
  it('D=1 uses gap 1, interview day returns nothing, past or missing dates are ignored', () => {
    expect(dueReps([rung2()], now, '2026-11-11')[0].compressed).toBe(true)
    expect(dueReps([rung2()], now, '2026-11-10')).toEqual([])
    expect(dueReps([rung2()], now, '2026-11-01')).toEqual([]) // past date: plain ladder, due 11-12
    expect(dueReps([rung2()], now, null)).toEqual([])
    expect(replayReason(rung2(), now, '2026-11-11')).toContain('tomorrow')
  })
  it('orders compressed first, then most overdue, then id', () => {
    const b = item('b', [[at(2026, 11, 8), true]]), a = item('a', [[at(2026, 11, 8), true]]), z = item('z', [[at(2026, 11, 2), true]])
    expect(ids([b, a, z])).toEqual(['z', 'a', 'b'])
    const m = { ...rung2(), itemId: 'm' }
    expect(ids([z, m, b], now, '2026-11-14')[0]).toBe('m')
  })
})

describe('dates and determinism', () => {
  it('is DST-safe across the US fall-back and spring-forward changes', () => {
    const x = item('a', [[new Date(2026, 9, 31, 23).toISOString(), true]])
    expect(ids([x], new Date(2026, 10, 1, 0, 30))).toEqual(['a'])
    const y = item('a', [[new Date(2026, 2, 7, 12).toISOString(), true], [new Date(2026, 2, 8, 12).toISOString(), true]])
    expect(ids([y], new Date(2026, 2, 11, 1))).toEqual(['a'])
    expect(ids([y], new Date(2026, 2, 10, 23))).toEqual([])
  })
  it('gives the same answer twice and does not mutate input', () => {
    const xs = [item('b', [[at(2026, 11, 8), true]]), item('a', [[at(2026, 11, 8), false]])]
    const copy = JSON.stringify(xs)
    expect(dueReps(xs, now, '2026-12-01')).toEqual(dueReps(xs, now, '2026-12-01'))
    expect(JSON.stringify(xs)).toBe(copy)
  })
  it('words reasons for missed and tried', () => {
    expect(replayReason(item('a', [[at(2026, 11, 9), false]]), now)).toBe('You missed this yesterday. Another go while it is fresh helps it stick.')
    expect(replayReason(item('a', [[at(2026, 11, 7), true]]), now)).toBe('You tried this 3 days ago, so this is a good time to replay it.')
  })
})

describe('upcomingReps', () => {
  const up = (x: ItemStat[], iv?: string | null, h?: number) => upcomingReps(x, now, iv, h).map(r => [r.itemId, r.dueAt.slice(0, 10)])
  const d = (y: number, m: number, dd: number) => new Date(y, m - 1, dd).toISOString().slice(0, 10)
  it('follows the 1/3/7 ladder', () => {
    expect(up([item('a', [[at(2026, 11, 10, 8), true]])])).toEqual([['a', d(2026, 11, 11)]]) // rung 0: tomorrow
    expect(up([item('a', [[at(2026, 11, 8), true], [at(2026, 11, 9), true]])])).toEqual([['a', d(2026, 11, 12)]]) // rung 1: +3
    expect(up([rung2()])).toEqual([['a', d(2026, 11, 12)]]) // rung 2: +7 from 11-05
  })
  it('leaves out items that are due now and ones past the horizon', () => {
    expect(up([item('a', [[at(2026, 11, 8), true]])])).toEqual([])
    expect(up([rung2()], null, 1)).toEqual([])
  })
  it('compresses before an interview and drops dates on or after it', () => {
    const r = upcomingReps([item('a', [[at(2026, 11, 10, 8), true]])], now, '2026-11-16')
    expect(r[0].compressed).toBe(false)
    expect(upcomingReps([rung2()], now, '2026-11-14')).toEqual([]) // due 11-07 under the cap: already due
    expect(upcomingReps([item('a', [[at(2026, 11, 10, 8), true]])], now, '2026-11-11')).toEqual([]) // due on the interview day
  })
  it('skips retired items, unattempted items and the interview day', () => {
    const r3 = item('a', [[at(2026, 11, 1), true], [at(2026, 11, 2), true], [at(2026, 11, 5), true], [at(2026, 11, 12), true]])
    expect(upcomingReps([r3], new Date(2026, 10, 20, 12))).toEqual([])
    expect(upcomingReps([{ ...item('b', [[at(2026, 11, 10), true]]), attempts: 0 }], now)).toEqual([])
    expect(upcomingReps([item('a', [[at(2026, 11, 9), true]])], now, '2026-11-10')).toEqual([])
  })
})
