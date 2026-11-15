import { describe, expect, it, beforeAll } from 'vitest'
import type { Database } from 'sql.js'
import { createDatabase, runQuery, sameResult, preview, type QueryResult } from './sqlEngine'
import { problems } from './sqlProblems'

const wasm = decodeURIComponent(new URL('../../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, '')
let db: Database


const run = (sql: string): QueryResult => runQuery(db, sql)

describe('sql round engine', () => {
  beforeAll(async () => { db = await createDatabase(() => wasm) })

  it('every solution runs and returns sensible rows', () => {
    for (const p of problems) {
      const r = run(p.solution)
      expect('error' in r, `${p.id}: ${'error' in r ? r.error : ''}`).toBe(false)
      if (!('error' in r)) expect(r.rows.length, p.id).toBeGreaterThan(0)
    }
    const none = run(problems[1].solution)
    expect('rows' in none && none.rows.map(r => r[0])).toEqual(['Kai', 'Lena'])
    const mom = run(problems[3].solution)
    expect('rows' in mom && mom.rows[0][2]).toBeNull() // first month has no change
    const top = run(problems[2].solution)
    expect('rows' in top && top.rows.length).toBe(4) // one per country, no ties in the seed
  })

  it('accepts an equivalent query and rejects a wrong one', () => {
    const p = problems[1]
    const sol = run(p.solution)
    const alt = run('SELECT name AS who, country AS place FROM customers WHERE NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = customers.id) ORDER BY name DESC')
    expect(sameResult(alt, sol, p.ordered)).toBe(true)
    expect(sameResult(run('SELECT name, country FROM customers'), sol, p.ordered)).toBe(false)
    const mom = run(problems[3].solution)
    const reversed = run(problems[3].solution.replace(/ORDER BY month$/, 'ORDER BY month DESC'))
    expect(sameResult(reversed, mom, true)).toBe(false)
    expect(sameResult(reversed, mom, false)).toBe(true)
  })

  it('rejects non-SELECT and multiple statements, and previews rows', () => {
    expect('error' in run('DROP TABLE orders')).toBe(true)
    expect('error' in run('SELECT 1; SELECT 2')).toBe(true)
    expect('error' in run('SELECT * FROM nope')).toBe(true)
    expect(preview(run('SELECT id FROM customers LIMIT 2'))).toContain('id')
  })
})
