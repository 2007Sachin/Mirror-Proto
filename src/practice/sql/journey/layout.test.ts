import { describe, expect, it } from 'vitest'
import { NARROW_W, nodeX, ringDash, segmentD, TRACK_W } from './layout'

describe('layout', () => {
  it('sways left, centre, right', () => {
    expect([0, 1, 2, 3].map(i => nodeX(i))).toEqual([280, 460, 280, 100])
    expect([0, 1, 2, 3].map(i => nodeX(i, NARROW_W))).toEqual([160, 220, 160, 100])
    expect(nodeX(4)).toBe(nodeX(0))
    expect(nodeX(3)).toBeGreaterThan(0)
    expect(nodeX(1)).toBeLessThan(TRACK_W)
  })
  it('builds a path between consecutive nodes', () => {
    expect(segmentD(0)).toMatch(/^M280 \d+ C280 [\d.]+ 460 [\d.]+ 460 \d+$/)
  })
  it('clamps ring dash', () => {
    expect(ringDash(0, 0, 10).dash).toBe(0)
    expect(ringDash(5, 4, 10).dash).toBeCloseTo(ringDash(4, 4, 10).c)
    expect(ringDash(1, 4, 10).dash).toBeCloseTo(ringDash(4, 4, 10).c / 4)
  })
})
