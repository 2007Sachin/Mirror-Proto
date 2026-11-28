import { describe, expect, it } from 'vitest'
import { bridge, greet } from '../domain/frame.js'

describe('interview frame', () => {
  it('greets before the first question, naming the job and round, and says nothing is scored', () => {
    const g = greet('Data Analyst · Behavioural round', 'Tell me about a time you led.')
    expect(g).toMatch(/^Hi, thanks for making time/)
    expect(g).toContain('behavioural round for Data Analyst')
    expect(g).toContain('Nothing here is scored')
    expect(g.endsWith('Tell me about a time you led.')).toBe(true)
    expect(greet('Analyst', 'Hello there. Ready?')).toBe('Hello there. Ready?')
  })
  it('bridges between questions and flags the last one', () => {
    expect(bridge('What changed?', 1, 4)).toMatch(/^Thanks for walking me through that\. What changed\?$/)
    expect(bridge('What changed?', 2, 4)).toMatch(/^That helps me picture it\./)
    expect(bridge('What changed?', 3, 4)).toBe("Last question for today, and then we'll wrap up. What changed?")
    expect(bridge('Thanks, and what next?', 1, 4)).toBe('Thanks, and what next?')
  })
  it('never adds a score, percentage or count', () => {
    for (let i = 1; i < 4; i++) expect(bridge('Why?', i, 4)).not.toMatch(/\d|%|score/i)
  })
})
