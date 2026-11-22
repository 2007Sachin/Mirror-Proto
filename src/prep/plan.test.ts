// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_PLAN_DAYS, buildPlan, isIsoDate, isoToday, loadPlanDate, planKey, readinessLine, savePlanDate } from './plan'

const ready = (p: ReturnType<typeof buildPlan>) => { if (p.status !== 'ready') throw new Error(p.status); return p }

describe('interview-date plan', () => {
  beforeEach(() => localStorage.clear())

  it('has no plan without a date or with a bad one', () => {
    expect(buildPlan(5, null, '2026-11-22')).toEqual({ status: 'none' })
    expect(buildPlan(5, '2026-02-30', '2026-11-22')).toEqual({ status: 'none' })
    expect(buildPlan(5, 'soon', '2026-11-22')).toEqual({ status: 'none' })
  })
  it('reports a date in the past', () => {
    expect(buildPlan(5, '2026-11-20', '2026-11-22')).toEqual({ status: 'past', daysAgo: 2 })
  })
  it('gives one revisit day when the interview is today', () => {
    const p = ready(buildPlan(5, '2026-11-22', '2026-11-22'))
    expect(p.daysToGo).toBe(0)
    expect(p.days).toEqual([{ date: '2026-11-22', day: 1, kind: 'revisit', round: null }])
  })
  it('gives one revisit day when the interview is tomorrow', () => {
    const p = ready(buildPlan(5, '2026-11-23', '2026-11-22'))
    expect(p.days.map(d => d.kind)).toEqual(['revisit'])
  })
  it('covers every round once, then revisits, when there is time', () => {
    const p = ready(buildPlan(4, '2026-12-01', '2026-11-22'))
    expect(p.daysToGo).toBe(9)
    expect(p.days).toHaveLength(9)
    expect(p.days.at(-1)?.kind).toBe('revisit')
    const rounds = p.days.filter(d => d.kind === 'round').map(d => d.round)
    expect(new Set(rounds)).toEqual(new Set([0, 1, 2, 3]))
    expect(rounds).toEqual([...rounds].sort((a, b) => (a as number) - (b as number)))
  })
  it('spreads rounds evenly when days are fewer than rounds', () => {
    const p = ready(buildPlan(5, '2026-11-25', '2026-11-22'))
    expect(p.days.map(d => d.round)).toEqual([0, 2, null])
  })
  it('caps the plan at 28 days', () => {
    const p = ready(buildPlan(4, '2027-06-01', '2026-11-22'))
    expect(p.days).toHaveLength(MAX_PLAN_DAYS)
    expect(p.daysToGo).toBeGreaterThan(MAX_PLAN_DAYS)
  })
  it('numbers days and dates consecutively across a month and year end', () => {
    const p = ready(buildPlan(3, '2027-01-02', '2026-12-30'))
    expect(p.days.map(d => d.date)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01'])
    expect(p.days.map(d => d.day)).toEqual([1, 2, 3])
  })
  it('copes with a role that has no rounds', () => {
    const p = ready(buildPlan(0, '2026-11-25', '2026-11-22'))
    expect(p.days.map(d => d.round)).toEqual([null, null, null])
  })
  it('formats today in local time', () => {
    expect(isoToday(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
  it('validates dates', () => {
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2027-02-29')).toBe(false)
    expect(isIsoDate(null)).toBe(false)
  })

  it('stores the date per role on this device', () => {
    savePlanDate('product-manager', '2026-12-01')
    expect(localStorage.getItem(planKey('product-manager'))).toBe('2026-12-01')
    expect(loadPlanDate('product-manager')).toBe('2026-12-01')
    expect(loadPlanDate('data-analytics')).toBeNull()
    savePlanDate('product-manager', null)
    expect(loadPlanDate('product-manager')).toBeNull()
  })
  it('ignores a damaged stored value and a storage that throws', () => {
    localStorage.setItem(planKey('x'), '{"nope":1}')
    expect(loadPlanDate('x')).toBeNull()
    const boom = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } }
    expect(loadPlanDate('x', boom)).toBeNull()
    expect(() => savePlanDate('x', '2026-12-01', boom)).not.toThrow()
  })
  it('words readiness without a score', () => {
    expect(readinessLine(2, 5, 3)).toBe('Rounds practiced 2 of 5 · Revisit items 3')
  })
})
