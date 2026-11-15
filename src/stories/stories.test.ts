import { describe, expect, it } from 'vitest'
import { draftStory } from './starLogic'
import { suggestStories } from './suggest'
import { THEMES, THEME_IDS, themesFor } from './themes'
import type { StoryRow } from '../lib/data'

const ANSWER = 'Last quarter our team had a tight deadline to migrate billing. I had to move 40 tables before launch. I wrote the plan and led the cutover with two teammates. We finished two days early and cut errors by 30 per week.'
const row = (o: Partial<StoryRow>): StoryRow => ({ id: 'x', workspaceId: 'w', createdAt: '2026-01-01', updatedAt: '2026-01-01', title: 'T', themes: [], situation: '', task: '', action: '', result: '', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null, ...o })

describe('themes', () => {
  it('has 12 distinct themes and detects them', () => {
    expect(THEMES).toHaveLength(12)
    expect(new Set(THEME_IDS).size).toBe(12)
    expect(themesFor('We had a tight deadline and I led the team')).toEqual(expect.arrayContaining(['deadline-pressure', 'leadership']))
    expect(themesFor('')).toEqual([])
  })
})

describe('draftStory', () => {
  it('uses only exact substrings or empty fields', () => {
    const d = draftStory({ question: 'Q?', answer: ANSWER })
    for (const f of [d.situation, d.task, d.action, d.result, d.quote ?? '']) expect(f === '' || ANSWER.includes(f)).toBe(true)
    expect(d.action).toContain('I wrote the plan')
    expect(d.result).toContain('two days early')
    expect(d.quote).toBe('Last quarter our team had a tight deadline to migrate billing.')
    expect(d.title.length).toBeLessThanOrEqual(60)
    expect(ANSWER.startsWith(d.title)).toBe(true)
  })
  it('leaves fields empty when nothing matches, and handles an empty answer', () => {
    const d = draftStory({ question: 'Tell me about a conflict?', answer: '' })
    expect(d).toMatchObject({ title: 'Tell me about a conflict?', situation: '', task: '', action: '', result: '', quote: null, themes: [] })
  })
  it('does not mutate input and never throws', () => {
    const input = Object.freeze({ question: 'Q', answer: ANSWER })
    expect(() => draftStory(input)).not.toThrow()
    expect(() => draftStory({ question: undefined as unknown as string, answer: undefined as unknown as string })).not.toThrow()
    expect(input.answer).toBe(ANSWER)
  })
})

describe('suggestStories', () => {
  const a = row({ id: 'a', title: 'Late migration', themes: ['deadline-pressure'], createdAt: '2026-02-01' })
  const b = row({ id: 'b', title: 'Old rush', themes: ['deadline-pressure', 'leadership'], createdAt: '2025-01-01' })
  it('ranks by overlap then recency and explains why', () => {
    const out = suggestStories('Tell me about a time you led a team under a tight deadline', [a, b])
    expect(out.map(s => s.story.id)).toEqual(['b', 'a'])
    expect(out[1].reason).toBe("'Late migration' is tagged deadline pressure, and this question asks about a tight deadline.")
  })
  it('returns nothing when nothing fits and caps at 3', () => {
    expect(suggestStories('What is your favourite colour?', [a])).toEqual([])
    expect(suggestStories('tight deadline', [a, a, a, a].map((s, i) => ({ ...s, id: String(i) })))).toHaveLength(3)
  })
})
