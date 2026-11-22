// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { StoryRow } from '../lib/data'
import { computeRoleRelevance, getNextPracticeThemes, joinParts, openParts, rolesNeedStories, themeHint, themeMap } from './bank'
import { getSuggestions, suggestStories, type UserProgress } from './suggest'
import { draftStory } from './starLogic'
import { detectThemes, themeConfidence, themesFor } from './themes'

vi.mock('./saveStory', () => ({ saveStoryFromAnswer: vi.fn(async () => ({})) }))
import SaveStoryButton from './SaveStoryButton'

afterEach(cleanup)

const row = (title: string, themes: string[], createdAt: string, star: Partial<StoryRow> = {}): StoryRow => ({
  id: title, workspaceId: 'w', createdAt, updatedAt: createdAt, title, themes,
  situation: '', task: '', action: '', result: '', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null, ...star,
})
const progress = (p: Partial<UserProgress> = {}): UserProgress => ({ completedThemes: [], openThemes: [], exploredThemes: [], storyCountPerTheme: {}, ...p })

describe('theme detection', () => {
  it('keeps the original keyword matching', () => {
    expect(themesFor('We had a tight deadline and I led the team.')).toEqual(['leadership', 'deadline-pressure'])
  })
  it('ranks by how many different keywords match, strongest first', () => {
    const ranked = themeConfidence('We had a tight deadline, were behind schedule on the launch date. I led the team.')
    expect(ranked[0].themeId).toBe('deadline-pressure')
    expect(ranked.map(r => r.themeId)).toContain('leadership')
    expect(ranked[0].confidence).toBeGreaterThan(ranked[ranked.length - 1].confidence)
    expect(ranked.every(r => r.confidence > 0 && r.confidence <= 1)).toBe(true)
  })
  it('names a primary theme, the rest, and whether it shows up early or late in the answer', () => {
    const early = detectThemes('We had a tight deadline and were behind schedule on the launch date. I led the team and mentored two juniors to finish.')
    expect(early).toMatchObject({ primary: 'deadline-pressure', context: 'situation' })
    expect(early.secondary).toContain('leadership')
    const late = detectThemes('It was a normal week with nothing special going on at all for the group here. Then we found a mistake, rolled back, and I apologised.')
    expect(late).toMatchObject({ primary: 'mistake-recovery', context: 'resolution' })
    expect(detectThemes('Hello there.')).toEqual({ primary: null, secondary: [], context: null })
  })
})

describe('role-aware story bank', () => {
  it('ranks themes for a role and its skills, skills counting double', () => {
    const rel = computeRoleRelevance(['Data Analyst'], ['Stakeholder conflict', 'SQL queries'])
    expect(rel['data-driven']).toBe(3)
    expect(rel.conflict).toBe(2)
    expect(rel.leadership).toBeUndefined()
  })
  it('orders the open themes by the role, and stays in the original order without a profile, with no counts either way', () => {
    expect(themeMap([]).missing[0]).toBe('Leadership')
    const withProfile = themeMap([], { roles: ['Data Analyst'], skills: [] })
    expect(withProfile.missing[0]).toBe('Data-driven decision')
    expect(JSON.stringify(withProfile)).not.toMatch(/\d/)
  })
  it('adds the role to a hint when given one', () => {
    expect(themeHint(null, 'Conflict', 'Data Analyst')).toBe('A hint: for a Data Analyst role, a story about conflict is still open.')
    expect(themeHint('Billing', 'Conflict')).toBe('A hint: Billing shares a theme with this role, and a story about conflict is still open.')
  })
  it('lists the missing themes for a profile, most relevant first, leaving out the ones you can already tell', () => {
    const needs = rolesNeedStories({ roles: ['Data Analyst'], skills: ['Stakeholder conflict'] }, [row('Billing', ['conflict'], '2026-11-01')])
    expect(needs.missingThemes).toEqual(['data-driven'])
    expect(needs.priorityScores).toEqual({ 'data-driven': 1 })
  })
  it('recommends what to practise next with a reason, missing themes before unfinished stories, at most three', () => {
    const next = getNextPracticeThemes(
      { roles: ['Data Analyst'], skills: ['conflict', 'deadline', 'customers', 'learning'] },
      [row('Billing', ['deadline-pressure'], '2026-11-01', { situation: 'When we shipped.' }), row('Plain', ['learning'], '2026-11-02')],
    )
    expect(next.length).toBeLessThanOrEqual(3)
    expect(next[0][1]).toMatch(/no story for it yet/)
    const unfinished = getNextPracticeThemes({ roles: [], skills: ['deadline'] }, [row('Billing', ['deadline-pressure'], '2026-11-01', { situation: 'When we shipped.' })])
    expect(unfinished).toEqual([['deadline-pressure', "Your story 'Billing' on deadline pressure still has task, action and result open."]])
    expect(getNextPracticeThemes({ roles: [], skills: ['deadline'] }, [{ title: 'No parts given', themes: ['deadline-pressure'] }])).toEqual([])
  })
  it('joins part names', () => {
    expect([joinParts([]), joinParts(['Task']), joinParts(['Task', 'Result']), joinParts(['Task', 'Action', 'Result'])]).toEqual(['', 'Task', 'Task and Result', 'Task, Action and Result'])
  })
})

describe('gap-aware suggestions', () => {
  const conflict = row('Disagreed on a metric', ['conflict'], '2026-10-01', { situation: 's', task: 't', action: 'a', result: 'r' })
  const lead = row('Ran the cutover', ['leadership'], '2026-11-01')
  const p = progress({ completedThemes: ['leadership'], openThemes: ['conflict'], storyCountPerTheme: { leadership: 2, conflict: 0 } })

  it('puts the story that fills an open theme first, and says why', () => {
    const out = getSuggestions(p, [lead, conflict])
    expect(out[0].story.title).toBe('Disagreed on a metric')
    expect(out[0].gapAnalysis).toBe('Fills your open theme: conflict.')
    expect(out[1].gapAnalysis).toBe('Adds another story on leadership, which you already cover.')
    expect(out[0].relevanceScore).toBeGreaterThan(out[1].relevanceScore)
  })
  it('keeps at most five', () => {
    expect(getSuggestions(p, Array.from({ length: 9 }, (_, i) => row(`S${i}`, ['conflict'], `2026-11-0${i + 1}`)))).toHaveLength(5)
  })
  it('prefers a gap-filler for a question when progress is given, and changes nothing without it', () => {
    const q = 'Tell me about a disagreement where you also led the team.'
    const both = row('Both', ['conflict', 'leadership'], '2026-09-01')
    const withProgress = suggestStories(q, [lead, both, conflict], p)
    expect(withProgress[0].gapAnalysis).toMatch(/^Fills your open theme/)
    expect(withProgress.every(s => typeof s.relevanceScore === 'number')).toBe(true)
    const plain = suggestStories(q, [lead, both, conflict])
    expect(plain[0].story.title).toBe('Both')
    expect(Object.keys(plain[0]).sort()).toEqual(['reason', 'story'])
  })
})

describe('SaveStoryButton completion preview', () => {
  const answer = 'When our team had a billing deadline, we were behind schedule. I led the cutover.'
  const open = openParts(draftStory({ question: 'Tell me about a deadline.', answer }))

  it('shows nothing without an answer, or when switched off', () => {
    render(<SaveStoryButton question="q" answer="" />)
    expect(screen.queryByText(/Complete|%/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Fill gaps' })).toBeNull()
    cleanup()
    render(<SaveStoryButton question="Tell me about a deadline." answer={answer} showCompletion={false} />)
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Fill gaps' })).toBeNull()
  })

  it('shows how much is filled in and, on "Fill gaps", names the parts to add', () => {
    expect(open.length).toBeGreaterThan(0) // the sample answer is incomplete
    render(<SaveStoryButton question="Tell me about a deadline." answer={answer} />)
    expect(screen.getByText(`${(4 - open.length) * 25}%`)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Fill gaps' }))
    expect(screen.getByRole('status').textContent).toBe(` Add ${joinParts(open)} for a complete story.`)
  })

  it('says Complete when every part has words', () => {
    const full = 'When our team had a billing deadline, we were behind schedule. I needed to cut scope. I led the cutover myself. As a result we finished two days early.'
    render(<SaveStoryButton question="q" answer={full} />)
    expect(screen.getByText('Complete ✓')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Fill gaps' })).toBeNull()
  })
})
