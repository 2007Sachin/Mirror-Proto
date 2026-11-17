import { describe, expect, it } from 'vitest'
import { BANK } from '../../domain/director/bank.js'
import { isRepeat, normalise, similarity } from '../../domain/director/guard.js'

describe('repeat guard', () => {
  it('normalises case, punctuation and filler words', () => {
    expect(normalise('Tell me about a Deadline, that was TIGHTER!')).toBe(normalise('tell me about a deadline that was tighter'))
  })

  it('catches an exact repeat in this interview', () => {
    expect(isRepeat('What was yours to own?', ['What was yours to own?'], [])).toBe(true)
    expect(isRepeat('what was yours to own', ['What was yours to own?'], [])).toBe(true)
  })

  it('catches a near duplicate', () => {
    const asked = ['Tell me about a time you disagreed with a stakeholder over the plan.']
    expect(isRepeat('Describe a time you disagreed with a stakeholder about the plan.', asked, [])).toBe(true)
    expect(similarity(asked[0], 'Tell me about a deadline that was tighter than you wanted.')).toBeLessThan(0.3)
  })

  it('catches a repeat from an earlier interview, and lets a different question through', () => {
    expect(isRepeat('Which tool did you pick up quickly?', [], ['Which tool did you have to pick up quickly?'])).toBe(true)
    expect(isRepeat('How do you handle requests from several people at once?', ['What changed because of your work?'], ['Tell me about a deadline.'])).toBe(false)
  })

  it('treats an empty question as a repeat', () => {
    expect(isRepeat('  ?! ', [], [])).toBe(true)
  })

  it('the bank has 40+ questions, none a near duplicate of another, with plain copy', () => {
    expect(BANK.length).toBeGreaterThanOrEqual(40)
    BANK.forEach((q, i) => {
      expect(q.text).not.toMatch(/agentic|evidence|reflection|evaluation|score/i)
      expect(isRepeat(q.text, BANK.slice(0, i).map(b => b.text), [])).toBe(false)
    })
  })
})
