import { describe, expect, it } from 'vitest'
import { concepts } from './data'
import { conceptTopics } from './types'

describe('sql concept questions', () => {
  it('has 60-72 questions with unique sql-c- ids', () => {
    expect(concepts.length).toBeGreaterThanOrEqual(60)
    expect(concepts.length).toBeLessThanOrEqual(72)
    const ids = concepts.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id.startsWith('sql-c-')).toBe(true)
  })

  it('covers every topic and level', () => {
    for (const t of conceptTopics) {
      const n = concepts.filter((c) => c.topic === t).length
      expect(n).toBeGreaterThanOrEqual(10)
    }
    for (const l of [1, 2, 3]) expect(concepts.some((c) => c.level === l)).toBe(true)
  })

  it('has well-formed questions within length caps', () => {
    for (const c of concepts) {
      expect(conceptTopics).toContain(c.topic)
      expect(c.options).toHaveLength(4)
      expect(new Set(c.options).size).toBe(4)
      expect(Number.isInteger(c.answer) && c.answer >= 0 && c.answer < 4).toBe(true)
      expect(c.why.trim()).not.toBe('')
      expect(c.sayIt.trim()).not.toBe('')
      expect(c.title.length).toBeLessThanOrEqual(40)
      expect(c.question.length).toBeLessThanOrEqual(160)
      for (const o of c.options) expect(o.length).toBeLessThanOrEqual(120)
      expect((c.followUp ?? '').length).toBeLessThanOrEqual(140)
      expect((c.trap ?? '').length).toBeLessThanOrEqual(120)
      expect(c.minutes).toBeGreaterThanOrEqual(1)
      expect(c.minutes).toBeLessThanOrEqual(3)
    }
  })

  it('spreads answer positions', () => {
    const counts = [0, 0, 0, 0]
    for (const c of concepts) counts[c.answer]++
    expect(counts.filter((n) => n > 0).length).toBeGreaterThanOrEqual(3)
    for (const n of counts) expect(n / concepts.length).toBeLessThanOrEqual(0.4)
  })

  it('avoids banned words and "all of the above"', () => {
    const banned = /agentic|evidence|reflection|evaluation|all of the above/i
    for (const c of concepts) {
      const text = [c.title, c.question, ...c.options, c.why, c.sayIt, c.followUp, c.trap].join(' ')
      expect(text).not.toMatch(banned)
    }
  })

  it('only uses the four allowed scene ids', () => {
    const allowed = ['c-index', 'c-normal', 'c-acid', 'c-delete']
    const used = concepts.filter((c) => c.sceneId).map((c) => c.sceneId)
    for (const s of used) expect(allowed).toContain(s)
    expect(new Set(used).size).toBe(4)
  })
})
