import { describe, expect, it } from 'vitest'
import { activeDays28, coverage, dueForReview, firstTryByTopic, nextInterview, recommend, targetNeeds, weakSpots, weekCompare, weekSeconds, type TrackLike } from './stats'
import type { ItemStat, PracticeSummary } from './types'

const now = new Date('2026-11-11T12:00:00Z')
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()

const tracks: TrackLike[] = [
  { track: 'sql', title: 'SQL', topics: ['Joins', 'Aggregation'], items: [
    { id: 'sql-a', track: 'sql', topic: 'Joins', level: 1, title: 'A', minutes: 5 },
    { id: 'sql-b', track: 'sql', topic: 'Joins', level: 2, title: 'B', minutes: 5 },
    { id: 'sql-c', track: 'sql', topic: 'Aggregation', level: 1, title: 'C', minutes: 5 },
  ] },
  { track: 'stats', title: 'Stats and A/B testing', topics: ['Hypothesis tests'], items: [
    { id: 'st-a', track: 'stats', topic: 'Hypothesis tests', level: 1, title: 'S', minutes: 5 },
  ] },
]

const stat = (o: Partial<ItemStat> & { itemId: string }): ItemStat => ({
  track: 'sql', topic: 'Joins', level: 1, attempts: 1, firstTryCorrect: true, solved: true, seconds: 60, lastAt: ago(1), solvedAt: ago(1), ...o,
})
const empty: PracticeSummary = { items: [], days: [] }

describe('weekCompare', () => {
  it('counts distinct items this week and the week before', () => {
    const s: PracticeSummary = { days: [], items: [stat({ itemId: 'sql-a', lastAt: ago(1) }), stat({ itemId: 'sql-b', lastAt: ago(6.5) }), stat({ itemId: 'sql-c', lastAt: ago(9) }), stat({ itemId: 'st-a', lastAt: ago(20) })] }
    expect(weekCompare(s, now)).toEqual({ thisWeek: 2, lastWeek: 1 })
  })
})

describe('weekSeconds', () => {
  it('returns 7 days, oldest first, and ignores older days', () => {
    const s: PracticeSummary = { items: [], days: [{ date: '2026-11-11', attempts: 2, seconds: 300 }, { date: '2026-11-05', attempts: 1, seconds: 60 }, { date: '2026-11-04', attempts: 1, seconds: 999 }] }
    const w = weekSeconds(s, now)
    expect(w.perDay).toEqual([60, 0, 0, 0, 0, 0, 300])
    expect(w.total).toBe(360)
  })
})

describe('coverage', () => {
  it('names untouched topics', () => {
    const c = coverage({ days: [], items: [stat({ itemId: 'sql-a' })] }, tracks)
    expect(c.touched).toBe(1)
    expect(c.total).toBe(3)
    expect(c.untouched.map(u => u.topic)).toEqual(['Aggregation', 'Hypothesis tests'])
  })
})

describe('firstTryByTopic and weakSpots', () => {
  const s: PracticeSummary = { days: [], items: [
    stat({ itemId: 'sql-a' }),
    stat({ itemId: 'sql-b', firstTryCorrect: false, solved: true }),
    stat({ itemId: 'sql-c', topic: 'Aggregation', firstTryCorrect: false, solved: false, solvedAt: null }),
  ] }
  it('reports counts', () => {
    expect(firstTryByTopic(s, tracks)).toEqual([
      { track: 'sql', topic: 'Joins', attempted: 2, firstTryCorrect: 1 },
      { track: 'sql', topic: 'Aggregation', attempted: 1, firstTryCorrect: 0 },
    ])
  })
  it('weak spots are failed first and still unsolved', () => {
    expect(weakSpots(s, tracks)).toEqual([{ track: 'sql', topic: 'Aggregation', itemIds: ['sql-c'] }])
  })
})

describe('dueForReview', () => {
  it('needs solved more than 3 days ago and no attempt since', () => {
    const s: PracticeSummary = { days: [], items: [
      stat({ itemId: 'sql-a', solvedAt: ago(10), lastAt: ago(10) }),
      stat({ itemId: 'sql-b', solvedAt: ago(5), lastAt: ago(1) }),  // attempted since
      stat({ itemId: 'sql-c', solvedAt: ago(2), lastAt: ago(2) }),  // too recent
    ] }
    expect(dueForReview(s, now)).toEqual([{ itemId: 'sql-a', daysAgo: 10 }])
  })
})

describe('activeDays28', () => {
  it('marks active UTC days, oldest to newest', () => {
    const a = activeDays28({ items: [], days: [{ date: '2026-11-11', attempts: 1, seconds: 5 }, { date: '2026-10-15', attempts: 1, seconds: 5 }] }, now)
    expect(a).toHaveLength(28)
    expect(a[27]).toBe(true)
    expect(a[0]).toBe(true) // 27 days before 11 Nov is 15 Oct
    expect(a.filter(Boolean)).toHaveLength(2)
  })
})

describe('nextInterview', () => {
  it('picks the nearest future date and ignores past ones', () => {
    const r = nextInterview([
      { company: 'Old', interviewDate: '2026-11-01', skills: [] },
      { company: 'Far', interviewDate: '2026-12-25', skills: [] },
      { company: 'Northwind', interviewDate: '2026-11-14', skills: [] },
      { company: 'None', interviewDate: null, skills: [] },
    ], now)
    expect(r).toEqual({ company: 'Northwind', days: 3 })
    expect(nextInterview([], now)).toBeNull()
  })
})

describe('targetNeeds', () => {
  it('maps areas to tracks and lists areas with no track', () => {
    const s: PracticeSummary = { days: [], items: [stat({ itemId: 'sql-a' })] }
    const r = targetNeeds([{ area: 'sql' }, { area: 'analytics' }, { area: 'tools' }, { area: 'behavioural' }], tracks, s)
    expect(r.rows.map(x => [x.track, x.solved, x.available])).toEqual([['sql', 1, 3], ['stats', 0, 1]])
    expect(r.noTrack).toEqual(['tools', 'behavioural'])
  })
})

describe('recommend', () => {
  const target = { company: 'Northwind', interviewDate: null, skills: [{ area: 'analytics' as const }] }
  it('prefers a weak spot', () => {
    const s: PracticeSummary = { days: [], items: [stat({ itemId: 'sql-c', topic: 'Aggregation', firstTryCorrect: false, solved: false, solvedAt: null })] }
    expect(recommend(s, tracks, [], now)?.itemId).toBe('sql-c')
  })
  it('then due review', () => {
    const s: PracticeSummary = { days: [], items: [stat({ itemId: 'sql-a', solvedAt: ago(8), lastAt: ago(8) })] }
    expect(recommend(s, tracks, [], now)?.itemId).toBe('sql-a')
  })
  it('then an untouched topic of a track a target needs', () => {
    const s: PracticeSummary = { days: [], items: [stat({ itemId: 'sql-a', lastAt: ago(0), solvedAt: ago(0) })] }
    const r = recommend(s, tracks, [target], now)
    expect(r?.itemId).toBe('st-a')
    expect(r?.reason).toContain('Northwind')
  })
  it('then the least-practised track; new user gets a first item', () => {
    const r = recommend(empty, tracks, [], now)
    expect(r?.itemId).toBe('sql-a')
    expect(r?.reason).not.toMatch(/\d\s?%/)
  })
  it('returns null when everything has been tried and nothing is due', () => {
    const s: PracticeSummary = { days: [], items: tracks.flatMap(x => x.items).map(i => stat({ itemId: i.id, track: i.track, topic: i.topic, lastAt: ago(0), solvedAt: ago(0) })) }
    expect(recommend(s, tracks, [], now)).toBeNull()
  })
})

describe('recommend with spaced replay', () => {
  const day = (n: number) => new Date(2026, 10, 11 - n, 9).toISOString()
  const one = (id: string, n: number) => stat({ itemId: id, lastAt: day(n), history: [{ at: day(n), correct: true }] })
  it('a due replay beats untouched topics but not a weak spot', () => {
    const due: PracticeSummary = { days: [], items: [one('sql-a', 2)] }
    expect(recommend(due, tracks, [], now)?.reason).toContain('You tried this 2 days ago')
    const weak: PracticeSummary = { days: [], items: [one('sql-a', 2), stat({ itemId: 'sql-b', firstTryCorrect: false, solved: false, lastAt: day(0) })] }
    expect(recommend(weak, tracks, [], now)?.itemId).toBe('sql-b')
  })
  it('names the interview when gaps are compressed', () => {
    const s: PracticeSummary = { days: [], items: [stat({ itemId: 'sql-a', lastAt: day(4), history: [{ at: day(5), correct: true }, { at: day(4), correct: true }] })] }
    expect(recommend(s, tracks, [], now, '2026-11-14')?.reason).toContain('interview is in 3 days')
  })
  it('retired items do not come back', () => {
    const hist = [1, 2, 5, 12].map(d => ({ at: new Date(2026, 9, d, 9).toISOString(), correct: true }))
    const s: PracticeSummary = { days: [], items: [stat({ itemId: 'sql-a', lastAt: hist[3].at, history: hist })] }
    expect(recommend(s, tracks, [], now)?.reason).not.toContain('replay')
  })
  it('ties break by item id', () => {
    const s: PracticeSummary = { days: [], items: [one('sql-b', 2), one('sql-a', 2)] }
    expect(recommend(s, tracks, [], now)?.itemId).toBe('sql-a')
  })
})
