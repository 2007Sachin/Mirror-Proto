import { describe, expect, it } from 'vitest'
import { modules } from '../curriculum'
import { topics } from '../topics'
import { idFor, moduleTopic, pdfTopics } from './mapping'

const LEVELS = ['Beginner', 'Pro', 'Advanced'] as const
const lvl = { beginner: 1, pro: 2, advanced: 3 } as const

describe('300-question mapping', () => {
  it('has 16 distinct pdf topics and a stable id format', () => {
    expect(new Set(pdfTopics).size).toBe(pdfTopics.length)
    expect(idFor(7)).toBe('sql-x-007')
    expect(idFor(300)).toBe('sql-x-300')
  })
  it('maps every topic and level to a real module topic of the matching level', () => {
    for (const p of pdfTopics) for (const l of LEVELS) {
      const m = moduleTopic(p, l)
      expect(topics, `${p}/${l}`).toContain(m.topic)
      expect(m.level).toBe(LEVELS.indexOf(l) + 1)
      const mods = modules.filter(x => x.title === m.topic && x.kind !== 'situation')
      expect(mods.length, `${p}/${l}`).toBeGreaterThan(0)
      for (const x of mods) expect(lvl[x.level], `${p}/${l}`).toBe(m.level)
    }
  })
  it('rejects an unknown topic', () => { expect(() => moduleTopic('nope', 'Pro')).toThrow() })
})
