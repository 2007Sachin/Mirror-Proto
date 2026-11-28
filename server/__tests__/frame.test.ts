import { describe, expect, it } from 'vitest'
import { j, makeApp, WS } from './helpers.js'
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

describe('POST /interviews with warmUp', () => {
  it('opens with a greeting and tell-me-about-yourself, then the real question, over five questions', async () => {
    const { app } = makeApp()
    const res = await app.request('/interviews', { method: 'POST', headers: { ...WS, 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'Data Analyst · Behavioural round', openingQuestion: 'Tell me about a time you led a decision.', warmUp: true }) })
    const body = await j<{ questionCap: number; questions: string[]; currentQuestion: string }>(res)
    expect(body.questionCap).toBe(5)
    expect(body.currentQuestion).toMatch(/^Hi, thanks for making time/)
    expect(body.currentQuestion).toContain('tell me a little about yourself')
    expect(body.questions[1]).toContain('Tell me about a time you led a decision.')
  })
  it('keeps four questions when warmUp is not asked for', async () => {
    const { app } = makeApp()
    const res = await app.request('/interviews', { method: 'POST', headers: { ...WS, 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'Analyst', openingQuestion: 'Tell me about a time you led a decision.' }) })
    expect((await j<{ questionCap: number | null }>(res)).questionCap).toBeNull()
  })
})
