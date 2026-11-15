import { conceptTopics } from './concepts/items'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from 'sql.js'
import { runQuery, sameResult, type QueryResult } from '../../pages/target/sqlEngine'
import { createPracticeDb } from './db'
import { problems } from './problems'
import { levels, modules } from './curriculum'
import { trackModule } from './index'
import { T } from './topics'

// Topics added for the 300-question bank: modules exist, questions arrive with src/practice/sql/bank300.
const NEW_TOPICS: string[] = [T.p14, T.p15, T.a20, T.a21]

const wasm = decodeURIComponent(new URL('../../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, '')
let db: Database
const run = (sql: string): QueryResult => runQuery(db, sql)
const by = (id: string) => problems.find(p => p.id === id)!
const ok = (id: string, sql: string) => sameResult(run(sql), run(by(id).solution), by(id).ordered)

describe('sql practice problems', () => {
  beforeAll(async () => { db = await createPracticeDb(() => wasm) })

  it('every solution runs and returns rows', () => {
    for (const p of problems) {
      const r = run(p.solution)
      expect('error' in r, `${p.id}: ${'error' in r ? r.error : ''}`).toBe(false)
      if (!('error' in r)) expect(r.rows.length, p.id).toBeGreaterThan(0)
    }
  })

  it('has unique ids, all topics and enough items per level', () => {
    expect(new Set(problems.map(p => p.id)).size).toBe(problems.length)
    const have = new Set(problems.map(p => p.topic))
    const all = trackModule.topics.filter(t => !conceptTopics.includes(t as never))
    for (const t of have) expect(all, t).toContain(t)
    for (const t of all) if (!have.has(t)) expect(NEW_TOPICS, t).toContain(t)
    for (const [lvl, min] of [[1, 20], [2, 20], [3, 15]]) expect(problems.filter(p => p.level === lvl).length).toBeGreaterThanOrEqual(min)
    expect(trackModule.items.filter(i => !i.id.startsWith('sql-c-'))).toHaveLength(problems.length) // concept items are checked in concepts/*.test.ts
  })

  it('has at least 60 problems and ordered ones are deterministic', () => {
    expect(problems.length).toBeGreaterThanOrEqual(60)
    for (const p of problems.filter(x => x.ordered)) expect(sameResult(run(p.solution), run(p.solution), true), p.id).toBe(true)
  })

  it('modules reference real problems of the matching level', () => {
    const lvl = { beginner: 1, pro: 2, advanced: 3 } as const
    expect(new Set(modules.map(m => m.id)).size).toBe(modules.length)
    expect(levels.map(l => l.id)).toEqual(['beginner', 'pro', 'advanced'])
    for (const m of modules) {
      expect(m.points.length, m.id).toBeGreaterThanOrEqual(2)
      expect(m.points.join(' '), m.id).not.toMatch(/agentic|evidence|reflection|evaluation/i)
      for (const id of m.problemIds) {
        expect(by(id), id).toBeDefined()
        expect(by(id).level, id).toBe(lvl[m.level])
      }
      if (m.problemIds.length === 0 && NEW_TOPICS.includes(m.title)) continue
      expect(m.problemIds.length, m.id).toBeGreaterThanOrEqual(3)
    }
    // every problem is reachable from some module
    const listed = new Set(modules.flatMap(m => m.problemIds))
    for (const p of problems) expect(listed.has(p.id), p.id).toBe(true)
  })

  it('funnel and retention data match what the problems expect', () => {
    const f = run(by('sql-funnel-steps').solution)
    expect('rows' in f && f.rows.map(r => r[1])).toEqual([15, 13, 10, 7, 4])
  })

  it('accepts equivalent queries and rejects wrong ones', () => {
    expect(ok('sql-no-country', 'SELECT id, signup_date FROM users WHERE NOT (country IS NOT NULL)')).toBe(true)
    expect(ok('sql-no-country', "SELECT id, signup_date FROM users WHERE country = ''")).toBe(false)
    expect(ok('sql-not-us', "SELECT id FROM users WHERE COALESCE(country, 'none') <> 'US'")).toBe(true)
    expect(ok('sql-not-us', "SELECT id FROM users WHERE country <> 'US'")).toBe(false) // the NULL trap
    expect(ok('sql-orders-by-status', 'SELECT status, COUNT(id) FROM orders GROUP BY 1')).toBe(true)
    expect(ok('sql-orders-by-status', "SELECT status, COUNT(*) FROM orders WHERE status = 'completed' GROUP BY 1")).toBe(false)
    expect(ok('sql-no-completed', "SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders WHERE status = 'completed')")).toBe(true)
    expect(ok('sql-no-completed', 'SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL')).toBe(true) // same rows in this seed
  })

  it('ordered problems fail on the wrong order', () => {
    expect(ok('sql-orders-per-month', "SELECT strftime('%Y-%m', created_at) AS m, COUNT(*) FROM orders GROUP BY 1 ORDER BY 1 DESC")).toBe(false)
    expect(ok('sql-orders-per-month', "SELECT strftime('%Y-%m', created_at) AS m, COUNT(*) FROM orders GROUP BY 1 ORDER BY 1")).toBe(true)
    expect(ok('sql-funnel-steps', by('sql-funnel-steps').solution.replace('ORDER BY users DESC', 'ORDER BY users')) ).toBe(false)
  })
})
