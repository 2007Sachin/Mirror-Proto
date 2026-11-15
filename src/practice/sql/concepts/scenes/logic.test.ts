import { describe, expect, it } from 'vitest'
import { acidSteps, ANOMALIES, branchOf, commandEffect, fullScanReads, indexCounts, indexUsable, isoSteps, LEVELS, pagesTouched, prevented, RAW_ORDERS, rowsTouchedByCityChange, to1NF, to2NF, to3NF, treePath } from './logic'

describe('index', () => {
  it('full scan reads 17 rows for id 17', () => expect(fullScanReads(17)).toBe(17))
  it('tree path is 3 pages, non-clustered adds a key lookup', () => {
    expect(treePath(17)).toHaveLength(3)
    expect(branchOf(17)).toBe(1)
    expect(pagesTouched(17, true)).toBe(3)
    expect(pagesTouched(17, false)).toBe(4)
  })
  it('city has no index so the scan returns', () => {
    expect(indexUsable('city')).toBe(false)
    expect(indexCounts('city', true, 3).scan).toBe(24)
    expect(indexCounts('id', true, 3)).toMatchObject({ scan: 17, hops: 3 })
  })
})

describe('normalisation', () => {
  it('1NF has one row per item with atomic cells', () => {
    const t = to1NF()
    expect(t.rows).toHaveLength(RAW_ORDERS.flatMap(o => o.items).length)
    expect(t.rows.every(r => r.every(c => !c.includes(',')))).toBe(true)
  })
  it('2NF splits products out', () => expect(to2NF().map(t => t.name)).toEqual(['order_items', 'products', 'orders']))
  it('3NF stores each customer city once', () => {
    const t = to3NF()
    expect(t.map(x => x.name)).toEqual(['order_items', 'products', 'orders', 'customers'])
    const c = t.find(x => x.name === 'customers')!
    expect(new Set(c.rows.map(r => r[0])).size).toBe(c.rows.length)
    expect(t.find(x => x.name === 'orders')!.cols).not.toContain('city')
  })
  it('a city change touches many rows flat, one when normalised', () => {
    expect(rowsTouchedByCityChange('C1', 'flat')).toBe(4)
    expect(rowsTouchedByCityChange('C1', 'normalised')).toBe(1)
  })
})

describe('acid', () => {
  it('rollback restores the balances', () => {
    const s = acidSteps('atomicity')
    expect(s[1].a).toBe(200)
    expect(s[3]).toMatchObject({ a: 300, b: 50 })
  })
  it('overdraft is refused', () => {
    const s = acidSteps('consistency')
    expect(s[2].flag).toBe('refused')
    expect(s[3].a).toBeGreaterThanOrEqual(0)
  })
  it('committed data survives a restart', () => {
    const s = acidSteps('durability')
    expect(s[s.length - 1]).toMatchObject({ a: 200, b: 150 })
  })
  it('isolation level vs anomaly', () => {
    expect(prevented('dirty', 'read-uncommitted')).toBe(false)
    expect(prevented('dirty', 'read-committed')).toBe(true)
    expect(prevented('nonrep', 'read-committed')).toBe(false)
    expect(prevented('nonrep', 'repeatable-read')).toBe(true)
    expect(prevented('phantom', 'repeatable-read')).toBe(false)
    expect(prevented('phantom', 'serializable')).toBe(true)
  })
  it('read committed hides the uncommitted value', () => {
    expect(isoSteps('dirty', 'read-committed')[2].s2).toContain('300')
    expect(isoSteps('dirty', 'read-uncommitted')[2].s2).toContain('200')
    for (const [a] of ANOMALIES) for (const [l] of LEVELS) expect(isoSteps(a, l)).toHaveLength(4)
  })
})

describe('row removal commands', () => {
  it('a filtered delete keeps the table', () => expect(commandEffect('delete')).toMatchObject({ rows: 5, tableExists: true, identityReset: false }))
  it('truncate empties rows and resets identity', () => expect(commandEffect('truncate')).toMatchObject({ rows: 0, tableExists: true, indexesExist: true, identityReset: true }))
  it('drop removes the structure', () => expect(commandEffect('drop')).toMatchObject({ rows: 0, tableExists: false, indexesExist: false }))
})
