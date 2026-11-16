import { describe, expect, it } from 'vitest'
import { scan } from '../../copyScan'
import type { AnswerAttemptRow } from '../../lib/data'
import { coverageByStatus, greeting, sinceLastWeek, statusLine, storyGaps } from './insights'
import { at, match, now, session, stat, tracks } from './testFixtures'

const retry = (n: number, answer: string, day: number): AnswerAttemptRow => ({
  id: `r${n}`, workspaceId: 'w', createdAt: at(11, day), interviewId: 'i1', questionIndex: 0, question: 'Why?', attempt: n, answer, kind: 'retry', transcriptSource: 'text',
})
const FIRST = 'Um, so I kind of worked on a dashboard and, you know, it was good.'
const SECOND = 'I built a dashboard in Looker. The result was that reports ran 40 minutes faster.'
const FILLERS = 'Um, so, you know, I basically, um, worked on it, you know, and um it was fine.'
const CLEAN = 'I led the migration in March. We moved the reports to the new warehouse, and the result was faster reports.'

describe('coverageByStatus', () => {
  it('splits by status, core first then alphabetical', () => {
    const m = match([['Tableau', 'nice', 'covered'], ['SQL', 'core', 'covered'], ['Excel', 'nice', 'covered'], ['Python', 'core', 'gap'], ['Airflow', 'nice', 'partial'], ['dbt', 'core', 'covered']]).matches
    expect(coverageByStatus(m)).toEqual({ covered: ['dbt', 'SQL', 'Excel', 'Tableau'], partial: ['Airflow'], gap: ['Python'] })
    expect(coverageByStatus([])).toEqual({ covered: [], partial: [], gap: [] })
  })
})

describe('sinceLastWeek', () => {
  it('reports a miss then a solve', () => {
    const s = sinceLastWeek({ items: [stat('sql-1', 'Joins', [[at(11, 5), false], [at(11, 7), true]])], days: [] }, [], [], now, tracks)
    expect(s?.stronger[0]).toMatchObject({ headline: 'Joins is clicking.', detail: 'You solved “Top customer in each country” on your second go.' })
  })
  it('compares first and latest retry', () => {
    const s = sinceLastWeek(null, [], [retry(2, FIRST, 5), retry(3, SECOND, 8)], now)
    expect(s?.stronger.map(x => x.headline).join(' ')).toMatch(/result is now included|vague|filler/i)
    expect(sinceLastWeek(null, [], [retry(2, FIRST, 5)], now)).toBeNull()
  })
  it('notices fewer fillers between the last two sessions, and offers another look', () => {
    const s = sinceLastWeek(null, [session('b', at(11, 9), [CLEAN]), session('a', at(11, 3), [FILLERS])], [], now)
    expect(s?.stronger[0].headline).toBe('Fewer filler words')
    expect(s?.another[0].link).toEqual({ label: 'Say it again', action: { type: 'sayItAgain', interviewId: 'b', questionIndex: 0 } })
  })
  it('lists weak spots with a Try it again link, and hides an empty column', () => {
    const s = sinceLastWeek({ items: [stat('sql-1', 'Joins', [[at(11, 8), false]])], days: [] }, [], [], now, tracks)
    expect(s?.stronger).toEqual([])
    expect(s?.another[0]).toMatchObject({ headline: 'Joins is worth another look', link: { label: 'Try it again', action: { type: 'openItem', itemId: 'sql-1' } } })
  })
  it('is null with no input or nothing in the last 14 days', () => {
    expect(sinceLastWeek(null, null, null, now)).toBeNull()
    expect(sinceLastWeek({ items: [stat('sql-1', 'Joins', [[at(10, 1), false], [at(10, 2), true]])], days: [] }, [session('a', at(10, 1), [FILLERS])], [], now, tracks)).toBeNull()
  })
  it('keeps every string within the house rules', () => {
    const s = sinceLastWeek({ items: [stat('sql-1', 'Joins', [[at(11, 5), false], [at(11, 7), true]]), stat('sql-2', 'Aggregation', [[at(11, 8), false]])], days: [] }, [session('b', at(11, 9), [CLEAN]), session('a', at(11, 3), [FILLERS])], [retry(2, FIRST, 5), retry(3, SECOND, 8)], now, tracks)
    for (const x of [...s!.stronger, ...s!.another]) for (const t of [x.headline, x.detail]) {
      expect(scan('since', t)).toEqual([])
      expect(t).not.toMatch(/\d+\s*(of|\/)\s*\d+|%|streak|in a row|—/i)
    }
    for (const x of s!.stronger) for (const q of x.detail.matchAll(/“([^”]*)”/g)) expect(q[1].split(/\s+/).length).toBeLessThanOrEqual(6)
  })
})

describe('storyGaps', () => {
  it('defaults to Conflict, then Failure', () => {
    expect(storyGaps([], null)).toMatchObject({ have: [], suggest: 'conflict' })
    expect(storyGaps([{ themes: ['conflict'] }], []).suggest).toBe('failure')
    expect(storyGaps([{ themes: ['conflict', 'failure'] }], []).suggest).toBe('leadership')
  })
  it('prefers a theme the target behavioural skills point to', () => {
    const g = storyGaps([{ themes: ['leadership'] }], [{ area: 'behavioural', name: 'Stakeholder influence' }, { area: 'sql', name: 'conflict' }])
    expect(g.suggest).toBe('influence')
    expect(g.have).toEqual(['leadership'])
    expect(g.missing).not.toContain('leadership')
    expect(g.reason).toContain('influence')
  })
})

describe('greeting and status', () => {
  it('follows the time of day', () => {
    expect([8, 13, 20].map(h => greeting(new Date(2026, 10, 10, h)))).toEqual(['Good morning.', 'Good afternoon.', 'Good evening.'])
  })
  it('writes one sentence from the model', () => {
    const base = { greeting: 'Good morning.', comingUp: { company: 'Northwind Analytics', countdown: 'in 10 days' }, replays: null, isNewUser: false }
    expect(statusLine(base)).toBe('Your Northwind Analytics interview is in 10 days. Here is one thing worth doing today.')
    expect(statusLine({ ...base, comingUp: null, replays: { due: [] } })).toBe('Nothing is due. Here is a good next question.')
  })
})
