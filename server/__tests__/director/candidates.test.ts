import { describe, expect, it } from 'vitest'
import { BANK } from '../../domain/director/bank.js'
import { buildCandidates } from '../../domain/director/candidates.js'
import { isRepeat } from '../../domain/director/guard.js'
import { state } from './fixtures.js'

describe('buildCandidates', () => {
  it('returns 3 to 5 bank candidates with no target', () => {
    const c = buildCandidates(state())
    expect(c.length).toBeGreaterThanOrEqual(3)
    expect(c.length).toBeLessThanOrEqual(5)
    expect(c.every(x => x.source === 'bank')).toBe(true)
  })

  it('puts non-covered gaps first, core before nice, using the probe question', () => {
    const c = buildCandidates(
      state({
        gaps: [
          { skill: 'Tableau', weight: 'nice', probeQuestion: null },
          { skill: 'SQL', weight: 'core', probeQuestion: 'Where have you used SQL on messy data?' },
          { skill: 'Python', weight: 'core', probeQuestion: null },
        ],
        covered: ['Python'],
      }),
    )
    expect(c[0]).toMatchObject({ source: 'gap', skill: 'SQL', text: 'Where have you used SQL on messy data?' })
    expect(c[1]).toMatchObject({ source: 'gap', skill: 'Tableau' })
    expect(c.some(x => x.skill === 'Python')).toBe(false)
    expect(c.length).toBeLessThanOrEqual(5)
  })

  it('adds a story-theme question when a theme is missing', () => {
    const c = buildCandidates(state({ storyThemes: ['ownership', 'conflict'] }))
    expect(c.some(x => x.source === 'story')).toBe(true)
  })

  it('never returns a repeat from this interview or history', () => {
    const asked = BANK.slice(0, 10).map(q => q.text)
    const history = BANK.slice(10, 30).map(q => q.text)
    const c = buildCandidates(state({ asked, history }))
    expect(c.length).toBeGreaterThanOrEqual(3)
    for (const x of c) expect(isRepeat(x.text, asked, history)).toBe(false)
  })

  it('suits the role: a product analyst gets no SQL-builder question', () => {
    const c = buildCandidates(state({ role: 'Product Analyst', asked: [], history: BANK.slice(0, 40).map(q => q.text) }))
    for (const x of c) expect(BANK.find(b => b.id === x.id)!.roles.some(r => r === 'general' || r === 'product analyst')).toBe(true)
  })
})
