import { describe, expect, it } from 'vitest'
import { PREP_ROLES, firstSentence } from './roles'

describe('interview prep guides', () => {
  it('loads the four roles', () => {
    expect(PREP_ROLES.map(r => r.slug)).toEqual(['product-manager', 'data-analytics', 'financial-analyst', 'digital-marketing'])
  })
  it('every role has an overview and rounds, each with a Tests line and exactly 10 questions', () => {
    for (const r of PREP_ROLES) {
      expect(r.overview.length, r.slug).toBeGreaterThan(40)
      expect(r.rounds.length, r.slug).toBeGreaterThanOrEqual(5)
      for (const round of r.rounds) {
        expect(round.name, r.slug).not.toBe('')
        expect(round.tests.length, `${r.slug} ${round.name}`).toBeGreaterThan(40)
        expect(round.questions, `${r.slug} ${round.name}`).toHaveLength(10)
      }
    }
  })
  it('every question and role-round title fits what the interview API accepts', () => {
    for (const r of PREP_ROLES) for (const round of r.rounds) {
      expect(`${r.title} · ${round.name}`.length).toBeLessThanOrEqual(120)
      for (const q of round.questions) { expect(q.length).toBeGreaterThanOrEqual(8); expect(q.length).toBeLessThanOrEqual(300) }
    }
  })
  it('keeps the first round of the product manager guide in order', () => {
    const pm = PREP_ROLES[0]
    expect(pm.rounds[0].name).toBe('Product Sense & Case Study')
    expect(pm.rounds[0].questions[0]).toMatch(/^How would you redesign the Swiggy/)
  })
  it('firstSentence takes the first sentence', () => {
    expect(firstSentence('One here. Two there.')).toBe('One here.')
  })
})
