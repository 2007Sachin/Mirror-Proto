import { describe, expect, it } from 'vitest'
import { compareText, diffRows, diffText, sameSql, surprised, tablesIn } from './logic'

const res = (rows: unknown[][]) => ({ columns: ['a'], rows, total: rows.length })

describe('lesson logic', () => {
  it('compares expectation to result', () => {
    expect(compareText({ kind: 'few' }, 4)).toBe('You expected a few rows, and it returned 4 rows.')
    expect(compareText({ kind: 'number', n: 4 }, 4)).toContain('and it returned')
    expect(compareText({ kind: 'zero' }, 0)).toContain('no rows')
  })
  it('surprise needs confidence and a mismatch', () => {
    expect(surprised({ kind: 'one' }, 'certain', 5)).toBe(true)
    expect(surprised({ kind: 'one' }, 'guess', 5)).toBe(false)
    expect(surprised({ kind: 'few' }, 'certain', 5)).toBe(false)
  })
  it('diffs rows as multisets', () => {
    const d = diffRows(res([[1], [2], [9]]), res([[2], [1], [3]]))!
    expect(d.extra).toEqual(['9'])
    expect(d.missing).toEqual(['3'])
    expect(diffText(d, false).join(' ')).toContain('(9)')
    expect(diffRows({ error: 'x' }, res([]))).toBeNull()
  })
  it('caps examples at three', () => {
    const d = diffRows(res([[1], [2], [3], [4], [5]]), res([]))!
    expect(d.extra).toHaveLength(3)
    expect(d.extraN).toBe(5)
  })
  it('helpers', () => {
    expect(sameSql('SELECT  1;', 'select 1')).toBe(true)
    expect(tablesIn('select * from orders o join customers c', ['users', 'orders', 'customers'])).toEqual(['orders', 'customers'])
  })
})
