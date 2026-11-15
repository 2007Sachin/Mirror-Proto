import { describe, expect, it } from 'vitest'
import { and3, computeJoin, CUSTS, evalNullExpr, execSteps, fanOutSum, groupBuckets, G_ROWS, in3, ORDERS, ORDERS_ONE, windowCompute } from './logic'

const on = (c: (typeof CUSTS)[number], o: (typeof ORDERS)[number]) => c.id === o.cust

describe('null logic', () => {
  it('= NULL is UNKNOWN for every row and keeps none', () => {
    const r = evalNullExpr('eq-null')
    expect(r.verdicts.every(v => v.label === 'UNKNOWN')).toBe(true)
    expect(r.kept).toEqual([])
  })
  it('IS NULL keeps the two missing countries', () => expect(evalNullExpr('is-null').kept).toEqual([3, 5]))
  it('<> US skips NULL rows', () => expect(evalNullExpr('ne-us').kept).toEqual([2, 6]))
  it('NOT IN with a NULL in the list never returns TRUE', () => {
    expect(in3('US', ['UK', null])).toBe('U')
    expect(evalNullExpr('not-in').kept).toEqual([])
  })
  it('NULL AND TRUE is unknown, FALSE AND NULL is false', () => {
    expect(and3('U', 'T')).toBe('U')
    expect(and3('F', 'U')).toBe('F')
  })
  it('COUNT and AVG', () => {
    expect(evalNullExpr('count').summary).toContain('COUNT(*) = 6')
    expect(evalNullExpr('count').summary).toContain('COUNT(country) = 4')
    expect(evalNullExpr('avg').summary).toContain('AVG(score) = 25')
  })
})

describe('joins', () => {
  it('row counts per kind (one-to-many orders)', () => {
    expect(computeJoin('inner', CUSTS, ORDERS, on)).toHaveLength(3)
    expect(computeJoin('left', CUSTS, ORDERS, on)).toHaveLength(5)
    expect(computeJoin('right', CUSTS, ORDERS, on)).toHaveLength(4)
    expect(computeJoin('full', CUSTS, ORDERS, on)).toHaveLength(6)
    expect(computeJoin('anti', CUSTS, ORDERS, on)).toHaveLength(2)
  })
  it('one-to-one orders do not duplicate customers', () => expect(computeJoin('inner', CUSTS, ORDERS_ONE, on)).toHaveLength(2))
  it('fan-out doubles the SUM', () => {
    const f = fanOutSum(computeJoin('inner', CUSTS, ORDERS, on), l => CUSTS[l].credit)
    expect(f).toEqual({ joined: 250, actual: 150 })
  })
})

describe('group by', () => {
  it('buckets, distinct and having', () => {
    const b = groupBuckets(G_ROWS, { having: x => x.sum > 100 })
    expect(b.map(x => [x.key, x.count, x.distinct, x.sum, x.keep])).toEqual([['N', 3, 2, 140, true], ['S', 3, 2, 110, true], ['E', 2, 1, 55, false]])
  })
  it('where runs before buckets', () => expect(groupBuckets(G_ROWS, { where: r => r.amt > 20 }).map(x => x.count)).toEqual([2, 2, 2]))
})

describe('exec order', () => {
  it('row counts after each clause', () => {
    const s = execSteps()
    const live = (i: number) => s[i].rows.filter(r => r.tone !== 'ghost').length
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(live)).toEqual([10, 8, 8, 4, 2, 2, 2, 1])
  })
})

describe('windows', () => {
  it('rank leaves gaps, dense_rank does not', () => {
    expect(windowCompute('rank', true, 0).values).toEqual([1, 2, 2, 4, 1, 2, 2, 4])
    expect(windowCompute('dense_rank', true, 0).values).toEqual([1, 2, 2, 3, 1, 2, 2, 3])
    expect(windowCompute('row_number', true, 0).values).toEqual([1, 2, 3, 4, 1, 2, 3, 4])
  })
  it('running sum restarts per partition', () => expect(windowCompute('sum', true, 0).values).toEqual([95, 185, 275, 345, 80, 140, 200, 240]))
  it('lag and moving average', () => {
    expect(windowCompute('lag', true, 0).values[0]).toBeNull()
    expect(windowCompute('lag', true, 0).values[1]).toBe(95)
    expect(windowCompute('avg', true, 2).values[2]).toBeCloseTo(91.67, 1)
    expect(windowCompute('avg', true, 2).frames[3]).toEqual([1, 3])
  })
  it('keeps every row', () => expect(windowCompute('sum', false, 0).rows).toHaveLength(8))
})
