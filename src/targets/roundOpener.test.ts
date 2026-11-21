// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { addCustomRound, canTalk, customRoundOpener, loadCustomRounds, nextStart, removeCustomRound, roundOpener } from './roundOpener'
import type { Skill } from '../lib/api'

const skills: Skill[] = [
  { name: 'Stakeholder communication', area: 'behavioural', weight: 'core', quote: 'q' },
  { name: 'Mentoring', area: 'behavioural', weight: 'nice', quote: 'q' },
  { name: 'pandas', area: 'python', weight: 'core', quote: 'q' },
  { name: 'Tableau', area: 'tools', weight: 'core', quote: 'q' },
  { name: 'A/B testing', area: 'analytics', weight: 'nice', quote: 'q' },
]
const job = { role: 'Data Analyst', skills }

beforeEach(() => localStorage.clear())

describe('roundOpener', () => {
  it('names the round and a skill from this job, core skills first', () => {
    const b = roundOpener({ id: 'behavioural', kind: 'behavioural', title: 'Behavioural round' }, job)
    expect(b.role).toBe('Data Analyst · Behavioural round')
    expect(b.question).toContain('Stakeholder communication')
    expect(roundOpener({ id: 'python', kind: 'python', title: 'Python round' }, job).question).toContain('pandas')
    expect(roundOpener({ id: 'tools', kind: 'tools', title: 'Tools round' }, job).question).toContain('Tableau')
  })
  it('moves to the next skill on each start and wraps', () => {
    const r = { id: 'behavioural', kind: 'behavioural' as const, title: 'Behavioural round' }
    expect(roundOpener(r, job, 1).question).toContain('Mentoring')
    expect(roundOpener(r, job, 2).question).toContain('Stakeholder communication')
  })
  it('behavioural still has a question when the job names no people skills', () => {
    const q = roundOpener({ id: 'behavioural', kind: 'behavioural', title: 'Behavioural round' }, { role: 'Analyst', skills: [] }).question
    expect(q.length).toBeGreaterThanOrEqual(8)
  })
  it('every question and role fits what the interview API accepts', () => {
    for (const kind of ['behavioural', 'python', 'tools'] as const) {
      const { role, question } = roundOpener({ id: kind, kind, title: `${kind} round` }, job)
      expect(role.length).toBeLessThanOrEqual(120)
      expect(question.length).toBeGreaterThanOrEqual(8)
      expect(question.length).toBeLessThanOrEqual(300)
    }
  })
})

describe('canTalk', () => {
  it('only the behavioural round has a live interview today; python, tools and sql do not', () => {
    expect(canTalk('behavioural', [])).toBe(true)
    expect(canTalk('python', skills)).toBe(false)
    expect(canTalk('tools', skills)).toBe(false)
    expect(canTalk('sql', skills)).toBe(false)
  })
})

describe('rounds the candidate adds', () => {
  it('adds, trims, ignores duplicates and blanks, caps at 8, and removes', () => {
    expect(addCustomRound('t1', '  Case   study ')).toEqual(['Case study'])
    expect(addCustomRound('t1', 'case study')).toEqual(['Case study'])
    expect(addCustomRound('t1', '   ')).toEqual(['Case study'])
    for (let i = 0; i < 12; i++) addCustomRound('t1', `Round ${i}`)
    expect(loadCustomRounds('t1')).toHaveLength(8)
    expect(removeCustomRound('t1', 'Case study')).not.toContain('Case study')
    expect(loadCustomRounds('t2')).toEqual([])
  })
  it('opens on the named round and fits what the interview API accepts', () => {
    const o = customRoundOpener('Hiring manager call', { role: 'Data Analyst' })
    expect(o.role).toBe('Data Analyst · Hiring manager call')
    expect(o.question).toContain('Hiring manager call')
    expect(o.question.length).toBeLessThanOrEqual(300)
    expect(customRoundOpener('x'.repeat(60), { role: 'y'.repeat(120) }).role.length).toBeLessThanOrEqual(120)
  })
})

describe('nextStart', () => {
  it('counts starts per job and round', () => {
    expect(nextStart('t1', 'tools')).toBe(0)
    expect(nextStart('t1', 'tools')).toBe(1)
    expect(nextStart('t1', 'python')).toBe(0)
    expect(nextStart('t2', 'tools')).toBe(0)
  })
})
