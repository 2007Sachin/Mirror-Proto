import { describe, expect, it } from 'vitest'
import { familyWise, mean, median, sampleSizePerArm, srm, twoProp } from './math'

describe('stats math', () => {
  it('two-proportion z-test matches hand calculation', () => {
    const r = twoProp(820, 20000, 900, 20000) // 4.1% vs 4.5%
    expect(r.z).toBeCloseTo(1.9716, 3)
    expect(r.p).toBeCloseTo(0.0487, 3)
    const e = twoProp(1000, 20000, 1000, 20000)
    expect(e.z).toBe(0)
    expect(e.p).toBeCloseTo(1, 6)
  })
  it('interval brackets the difference and matches a known value', () => {
    const r = twoProp(1000, 20000, 1080, 20000)
    expect(r.ci[0]).toBeLessThan(r.diff)
    expect(r.ci[1]).toBeGreaterThan(r.diff)
    expect(r.ci[0]).toBeCloseTo(-0.0003, 3)
  })
  it('sample size: 4.0% to 4.5% is about 25,500 per arm; half the effect is about four times the users', () => {
    const n = sampleSizePerArm(0.04, 0.045)
    expect(n).toBeGreaterThan(25400)
    expect(n).toBeLessThan(25700)
    expect(sampleSizePerArm(0.04, 0.0425) / n).toBeGreaterThan(3.8)
    expect(sampleSizePerArm(0.04, 0.0425) / n).toBeLessThan(4.4)
  })
  it('SRM chi-square: 52,000 vs 48,000 is 160; a balanced split is 0', () => {
    expect(srm([52000, 48000]).chi2).toBeCloseTo(160, 6)
    expect(srm([52000, 48000]).p).toBeLessThan(1e-30)
    expect(srm([50000, 50000]).chi2).toBe(0)
    expect(srm([50000, 50000]).p).toBeCloseTo(1, 6)
    expect(srm([50100, 49900]).p).toBeGreaterThan(0.05)
  })
  it('family-wise error, mean and median', () => {
    expect(familyWise(20)).toBeCloseTo(0.6415, 3)
    expect(mean([1, 2, 6])).toBe(3)
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})
