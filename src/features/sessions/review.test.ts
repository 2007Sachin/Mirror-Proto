import { describe, expect, it } from 'vitest'
import { scan } from '../../copyScan'
import { patternAcross, reviewSession } from './review'
import type { InterviewSession } from '../../lib/api'

const turn = (i: number, answer: string, source: 'text' | 'voice' = 'text') => ({
  id: `t${i}`, questionIndex: i, question: i === 0 ? 'Tell me about a deadline.' : 'Tell me about a conflict.', answer, transcriptSource: source,
})
const session = (over: Partial<InterviewSession> = {}): InterviewSession => ({
  id: 's1', workspace: 'w', role: 'Data Analyst', industry: null, status: 'completed', questions: [], currentQuestion: null,
  pendingFollowUp: false, nextQuestionIndex: null, createdAt: '2026-11-01T00:00:00Z', turns: [], reflection: null, ...over,
})

const full = 'When our team had a billing deadline, I had to cut the scope. I led the cutover and we finished two days early.'
const thin = 'I helped with some stuff.'

describe('reviewSession', () => {
  it('uses the same sections and names STAR parts without a grade', () => {
    const s = session({
      turns: [turn(0, full, 'voice'), turn(1, thin)],
      reflection: {
        id: 'r', interviewId: 's1', readinessLabel: null, readinessRange: null,
        evidence: [{ turnId: 't0', quote: 'I led the cutover', observation: 'You named what you did and how it ended.', competency: 'ownership' }],
        focus: 'Land the result in the first sentence.', suggestion: 'Say the deadline story again and open with what changed.', model: 'm', source: 'ai',
      },
    })
    const review = reviewSession(s, null, s.reflection)
    expect(review.overview).toContain('Data Analyst')
    expect(review.overview).toContain('Land the result')
    expect(review.questions[0].worked).toBe('You named what you did and how it ended.')
    expect(review.questions[0].delivery).toMatch(/^Spoken\./)
    expect(review.questions[0].star.map(p => p.state)).toContain('In the answer')
    expect(review.questions[1].strengthen.toLowerCase()).toMatch(/situation|task|did|changed/)
    expect(review.questions[1].star.find(p => p.key === 'action')?.state).toBe('Still open')
    expect(review.nextPractice).toContain('Say the deadline story again')
    expect(review.pattern).toBeNull()
    for (const text of [review.overview, review.nextPractice, ...review.questions.flatMap(q => [q.worked, q.strengthen, q.delivery, ...q.star.map(p => `${p.label} ${p.state}`)])]) {
      expect(scan('review', text)).toEqual([])
    }
  })

  it('drops a note that uses a banned word and falls back to the shape', () => {
    const s = session({ turns: [turn(0, full)] })
    const review = reviewSession(s, null, {
      id: 'r', interviewId: 's1', readinessLabel: 'strong', readinessRange: { low: 1, high: 2 },
      evidence: [{ turnId: 't0', quote: 'x', observation: 'The evidence was thin.', competency: 'x' }],
      focus: 'A readiness score would go here.', suggestion: null, model: 'm', source: 'fallback',
    })
    expect(review.questions[0].worked).not.toMatch(/evidence/i)
    expect(review.overview).not.toMatch(/score/i)
    expect(review.questions[0].worked.toLowerCase()).toContain('situation')
  })

  it('names a repeating gap across two sessions', () => {
    const shaped = 'When our team had a deadline, I had to cut scope.'
    const older = session({ id: 's0', createdAt: '2026-10-01T00:00:00Z', turns: [turn(0, shaped)] })
    const newer = session({ turns: [turn(0, shaped, 'voice')] })
    expect(patternAcross(newer, older)).toMatch(/action/i)
    expect(patternAcross(newer, null)).toBeNull()
  })
})
