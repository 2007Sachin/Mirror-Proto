import { describe, expect, it } from 'vitest'
import { openParts, rolesNeedStories, themeMap } from './bank'

const story = (title: string, themes: string[], extra: Partial<{ situation: string; task: string; action: string; result: string }> = {}) => ({
  title, themes, situation: '', task: '', action: '', result: '', ...extra,
})

describe('story bank map', () => {
  it('names themes you can tell and themes still open, with no counts', () => {
    const map = themeMap([story('Billing', ['deadline-pressure', 'leadership'])])
    expect(map.canTell).toEqual(['Leadership', 'Deadline pressure'])
    expect(map.missing).toContain('Conflict')
    expect(map.missing).not.toContain('Leadership')
    expect(JSON.stringify(map)).not.toMatch(/\d/)
  })

  it('names STAR parts that have no words', () => {
    expect(openParts(story('A', [], { situation: 'When we shipped.', action: 'I led it.' }))).toEqual(['Task', 'Result'])
  })

  it('says which role can use a story and which theme is still needed', () => {
    const needs = rolesNeedStories(
      [{ id: 't1', company: 'Northwind', role: 'Analyst', skills: [{ area: 'behavioural', name: 'Conflict', quote: 'Handle disagreement' }] }],
      [story('Billing', ['deadline-pressure'])],
    )
    expect(needs[0]).toMatchObject({ company: 'Northwind', storyTitle: null, needs: 'Conflict' })
    const covered = rolesNeedStories(
      [{ id: 't1', company: 'Northwind', role: 'Analyst', skills: [{ area: 'behavioural', name: 'Deadlines', quote: 'tight deadline' }] }],
      [story('Billing cutover', ['deadline-pressure'])],
    )
    expect(covered[0].storyTitle).toBe('Billing cutover')
  })
})
