import { describe, expect, it } from 'vitest'
import { items } from './items'
import { trackModule } from './index'
import { sampleSizePerArm, srm, twoProp } from './math'

const all = (id: string) => { const i = items.find(x => x.id === id)!; return [i.scenario, ...i.options.map(o => o.why), ...(i.working ?? [])].join(' ') }

describe('stats items', () => {
  it('ids are unique, prefixed and match the catalog', () => {
    expect(new Set(items.map(i => i.id)).size).toBe(items.length)
    items.forEach(i => expect(i.id.startsWith('stats-')).toBe(true))
    expect(trackModule.items.map(i => i.id)).toEqual(items.map(i => i.id))
  })
  it('covers every topic and level quota', () => {
    for (const t of trackModule.topics) expect(items.some(i => i.topic === t), t).toBe(true)
    items.forEach(i => expect(trackModule.topics).toContain(i.topic))
    const c = (l: number) => items.filter(i => i.level === l).length
    expect(c(1)).toBeGreaterThanOrEqual(4)
    expect(c(2)).toBeGreaterThanOrEqual(5)
    expect(c(3)).toBeGreaterThanOrEqual(3)
  })
  it('every item has 3-4 options, one valid best, and an explanation for each', () => {
    for (const i of items) {
      expect(i.options.length).toBeGreaterThanOrEqual(3)
      expect(i.options.length).toBeLessThanOrEqual(4)
      expect(Number.isInteger(i.best) && i.best >= 0 && i.best < i.options.length, i.id).toBe(true)
      i.options.forEach(o => expect(o.why.length, i.id).toBeGreaterThan(20))
    }
  })
  it('visible text avoids banned words', () => {
    const text = JSON.stringify(items).toLowerCase()
    for (const w of ['agentic', 'evidence', 'reflection', 'evaluation']) expect(text).not.toContain(w)
  })
  it('numeric claims match math.ts', () => {
    const t1 = twoProp(820, 20000, 900, 20000)
    expect(all('stats-first-read')).toContain(`= ${t1.p.toFixed(3)}`)
    expect(t1.p).toBeLessThan(0.05)
    expect(twoProp(500, 10000, 570, 10000).p.toFixed(2)).toBe('0.03')
    expect(all('stats-sample-size')).toContain(sampleSizePerArm(0.04, 0.045).toLocaleString('en-US'))
    expect(all('stats-srm-split')).toContain(srm([52000, 48000]).chi2.toFixed(0))
    expect(twoProp(1000, 20000, 1080, 20000).ci[0]).toBeLessThan(0)
    expect(twoProp(8, 200, 11, 200).p).toBeGreaterThan(0.05)
    expect(twoProp(400, 10000, 462, 10000).p).toBeLessThan(0.05)
    expect(twoProp(1120, 28000, 1198, 28000).p).toBeGreaterThan(0.05)
    expect(twoProp(1010, 10000, 1040, 10000).p).toBeGreaterThan(0.05)
    expect(twoProp(50000, 1000000, 51500, 1000000).ci[1]).toBeLessThan(0.005)
    expect(twoProp(500, 50000, 650, 50000).p).toBeLessThan(0.001)
  })
})
