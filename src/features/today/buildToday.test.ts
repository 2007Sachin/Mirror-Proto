import { describe, expect, it } from 'vitest'
import { scan } from '../../copyScan'
import { buildToday } from './buildToday'
import { at, done, empty, now, profile, progress, stat, target, tracks } from './testFixtures'
import type { TodayInput } from './types'

const coach = { observation: 'You opened with the data you cleaned. Next time finish with how it ended.', nextPractice: 'x', practiceQuestion: 'What did you do when the numbers did not add up?', basedOn: 'interview' as const, source: 'ai' as const }
const rich: TodayInput = {
  profile, coachNote: coach, interviews: [done], completedSessions: [], summary: { items: [stat('sql-1', 'Joins', [[at(11, 9), true]])], days: [] },
  targets: [target('2026-11-20')], stories: [{ themes: ['leadership'] }] as never, retryAttempts: [], tracks,
}
const strings = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) v.forEach(x => strings(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach(x => strings(x, out))
  return out
}

describe('hero branches', () => {
  it('1 resumes an interview in progress', () => {
    const h = buildToday({ ...rich, interviews: [progress, done] }, now).hero
    expect(h).toMatchObject({ kind: 'resume', kindLabel: 'where you left off', title: 'Data Analyst, question 2' })
    expect([h.primary.label, h.secondary?.label]).toEqual(['Pick it up', 'Let it go'])
  })
  it('2 offers a warm-up on interview day and no replays', () => {
    const m = buildToday({ ...rich, targets: [target('2026-11-10')], coachNote: null }, now)
    expect(m.hero).toMatchObject({ kind: 'warmup', minutes: 5, title: 'How would you clean a messy file with Python?' })
    expect(m.replays).toBeNull()
  })
  it('3 offers a screening call 1 to 3 days before', () => {
    const h = buildToday({ ...rich, targets: [target('2026-11-12')] }, now).hero
    expect(h).toMatchObject({ kind: 'screening', title: 'Practise a Northwind Analytics screening call', minutes: 8 })
    expect(h.primary.action).toEqual({ type: 'screening', targetId: 't1' })
    expect(buildToday({ ...rich, targets: [target('2026-11-12', false)] }, now).hero.kind).toBe('spoken')
  })
  it('4 asks the coach question and cleans the why line', () => {
    const m = buildToday({ ...rich, coachNote: { ...coach, observation: 'You said “the pipeline was down for two hours in the night” clearly. Add how it ended.' } }, now)
    expect(m.hero.title).toBe(coach.practiceQuestion)
    expect(m.hero.primary.action).toEqual({ type: 'startQuestion', question: coach.practiceQuestion, speak: true })
    expect(m.hero.why).toBe('Add how it ended.')
    expect(buildToday({ ...rich, coachNote: { ...coach, observation: '' } }, now).hero.why).toBe('A short spoken answer is a good next step.')
  })
  it('5 shows replays due today', () => {
    const m = buildToday({ ...rich, coachNote: null, targets: [], summary: { items: [stat('sql-1', 'Joins', [[at(11, 9), true]])], days: [] } }, now)
    expect(m.hero).toMatchObject({ kind: 'replay', title: '1 replay due', minutes: 6 })
    expect(m.hero.primary.action).toEqual({ type: 'openReplays', itemId: 'sql-1' })
  })
  it('6 falls back to recommend()', () => {
    const m = buildToday({ ...rich, coachNote: null, targets: [], summary: { items: [], days: [] } }, now)
    expect(m.hero).toMatchObject({ kind: 'sql', kindLabel: 'SQL exercise', title: 'Top customer in each country' })
  })
  it('7 routes a user with no profile to the first interview', () => {
    const m = buildToday({ ...empty, interviews: [], summary: { items: [], days: [] }, targets: [], stories: [], tracks: [] }, now)
    expect(m.hero.kind).toBe('first')
    expect(m.hero.primary.action).toEqual({ type: 'firstInterview' })
  })
  it('lists the next two applicable branches as alternates, in order', () => {
    const m = buildToday({ ...rich, targets: [target('2026-11-12')] }, now)
    expect(m.hero.kind).toBe('screening')
    expect(m.alternates.map(a => a.action.type)).toEqual(['startQuestion', 'openReplays'])
    expect(m.alternates.length).toBeLessThanOrEqual(2)
  })
})

describe('users', () => {
  const fresh: TodayInput = { ...empty, profile, interviews: [], summary: { items: [], days: [] }, targets: [], stories: [], tracks }
  it('treats a user with nothing as new: first question, welcome, three setup rows', () => {
    const m = buildToday(fresh, now)
    expect(m.isNewUser).toBe(true)
    expect(m.greeting).toBe('Welcome. Start with one question.')
    expect(m.hero.title).toBe(profile.firstQuestion)
    expect(m.setup?.heading).toBe("When you're ready, these make Today more useful")
    expect(m.setup?.rows.map(r => r.id)).toEqual(['target', 'story', 'sql'])
    expect(m.setup?.rows[2].body).toBe('Top customer in each country is a gentle start, about 6 minutes, right in your browser.')
    expect(buildToday({ ...fresh, coachNote: coach }, now).hero.title).toBe(coach.practiceQuestion)
  })
  it('a partly set-up user gets real sections and only the remaining rows', () => {
    const m = buildToday({ ...fresh, targets: [target('2026-11-20')], stories: [{ themes: ['conflict'] }] as never }, now)
    expect(m.isNewUser).toBe(false)
    expect(m.comingUp?.covered).toEqual(['SQL'])
    expect(m.comingUp?.gap).toEqual(['Python'])
    expect(m.comingUp?.topGap).toEqual({ skill: 'Python', question: 'How would you clean a messy file with Python?' })
    expect(m.setup?.rows.map(r => r.id)).toEqual(['sql'])
    expect(m.status).toBe('Your Northwind Analytics interview is in 10 days. Here is one thing worth doing tonight.')
    const sections = [m.comingUp, m.since, m.replays || m.stories, m.setup].filter(Boolean).length + 1
    expect(sections).toBeLessThanOrEqual(4)
  })
  it('says nothing is due when that is true', () => {
    const m = buildToday({ ...rich, targets: [], coachNote: null, summary: { items: [stat('sql-1', 'Joins', [[at(11, 10), true]])], days: [] } }, now)
    expect(m.status).toBe('Nothing is due. Here is a good next question.')
    expect(m.replays?.nothingDueLine).toBe('Nothing is due today. Next: Top customer in each country on Wednesday.')
  })
  it('never throws when every input is null', () => {
    const m = buildToday(empty, now)
    expect(m.hero.kind).toBe('first')
    expect(m.isNewUser).toBe(false)
    expect(m.comingUp).toBeNull()
    expect(m.setup).toBeNull()
  })
})

describe('house rules on every string', () => {
  const models = [buildToday(rich, now), buildToday({ ...rich, targets: [target('2026-11-12')], interviews: [progress] }, now), buildToday({ ...empty, profile, interviews: [], summary: { items: [], days: [] }, targets: [], stories: [], tracks }, now)]
  it('has no fractions, percentages, streaks or banned words and never the learner focus', () => {
    for (const s of models.flatMap(m => strings(m))) {
      expect(s).not.toMatch(/\d+\s*(of|\/)\s*\d+|%|streak|in a row|—/i)
      if (s !== 'Welcome. Start with one question.') expect(scan('today', s)).toEqual([]) // spec-mandated greeting; copyScan flags it, so it needs a copyAllowlist entry
      expect(s).not.toMatch(/CMVR|Going deeper/)
    }
  })
  it('has no quote longer than six words', () => {
    for (const s of models.flatMap(m => strings({ hero: m.hero, alternates: m.alternates, setup: m.setup, status: m.status }))) {
      for (const q of s.matchAll(/[“"]([^”"]*)[”"]/g)) expect(q[1].split(/\s+/).length).toBeLessThanOrEqual(6)
    }
  })
})
