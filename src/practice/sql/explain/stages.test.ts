import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from 'sql.js'
import { createPracticeDb } from '../db'
import { problems } from '../problems'
import { buildStages, runStages } from './stages'

const wasm = decodeURIComponent(new URL('../../../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, '')
let db: Database
const explain = (sql: string) => runStages(db, buildStages(sql))

describe('stages engine', () => {
  beforeAll(async () => { db = await createPracticeDb(() => wasm) })

  it('explains every problem solution and ends on the real result', () => {
    for (const p of problems) {
      const stages = explain(p.solution)
      expect(stages.length, p.id).toBeGreaterThanOrEqual(2)
      const direct = db.exec(p.solution.replace(/;+\s*$/, ''))[0]
      const last = stages[stages.length - 1]
      expect(last.after.total, p.id).toBe(direct.values.length)
      expect(last.after.rows, p.id).toEqual(direct.values.slice(0, 12))
      for (const s of stages) expect(s.caption.length, `${p.id} ${s.kind}`).toBeGreaterThan(0)
    }
  })

  it('rejects anything that is not a SELECT', () => {
    expect(buildStages('DROP TABLE orders')).toEqual([])
    expect(buildStages('SELECT 1; DELETE FROM orders')).toEqual([])
  })

  it('WHERE reports kept and dropped rows with flags', () => {
    const w = explain("SELECT id FROM orders WHERE status = 'completed'").find(s => s.kind === 'where')!
    const total = db.exec('SELECT COUNT(*) FROM orders')[0].values[0][0] as number
    const kept = db.exec("SELECT COUNT(*) FROM orders WHERE status = 'completed'")[0].values[0][0] as number
    expect(w.caption).toContain(`${kept} of ${total}`)
    expect(w.before.flags).toContain('drop')
    expect(w.after.rows.length).toBe(Math.min(12, kept))
  })

  it('GROUP BY builds buckets and HAVING drops some', () => {
    const st = explain('SELECT status, COUNT(*) AS n FROM orders GROUP BY status HAVING COUNT(*) > 3')
    const g = st.find(s => s.kind === 'group')!
    expect(g.buckets!.length).toBeGreaterThan(1)
    expect(g.buckets![0].badge).toContain('n =')
    const h = st.find(s => s.kind === 'having')!
    expect(h.caption).toMatch(/keeps \d+ of \d+ groups/)
  })

  it('JOIN fan-out is counted', () => {
    const j = explain('SELECT c.name, o.id FROM customers c JOIN orders o ON o.customer_id = c.id').find(s => s.kind === 'join')!
    expect(j.join!.out).toBeGreaterThan(j.join!.left)
    expect(j.join!.duplicated).toBeGreaterThan(0)
    expect(j.caption).toContain('more than once')
    expect(j.after.flags).toContain('dup')
  })

  it('LEFT JOIN flags unmatched rows', () => {
    const j = explain("SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'refunded'").find(s => s.kind === 'join')!
    expect(j.join!.unmatched).toBeGreaterThan(0)
    expect(j.after.flags).toContain('nomatch')
  })

  it('CTE gets its own stage before the main query', () => {
    const st = explain("WITH t AS (SELECT customer_id, SUM(amount) AS s FROM orders GROUP BY customer_id) SELECT * FROM t WHERE s > 100")
    expect(st[0].kind).toBe('cte')
    expect(st[0].caption).toContain('t is worked out first')
    expect(st.some(s => s.kind === 'where')).toBe(true)
  })

  it('UNION shows both sides then the result', () => {
    const s = explain('SELECT id FROM users UNION SELECT id FROM customers').find(x => x.kind === 'setop')!
    expect(s.tables).toHaveLength(2)
  })

  it('recursive CTE shows its result', () => {
    const s = explain('WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5) SELECT i FROM n')
    expect(s[0].recursive).toBe(true)
    expect(s[0].after.total).toBe(5)
  })

  it('degrades instead of throwing', () => {
    const s = explain('SELECT 1 AS one')
    expect(s.length).toBeGreaterThanOrEqual(2)
    expect(s[s.length - 1].after.rows).toEqual([[1]])
  })
})

describe('coverage', () => {
  it('almost every problem gets a real clause-by-clause breakdown', async () => {
    const d = await createPracticeDb(() => wasm)
    const bad = problems.filter(p => runStages(d, buildStages(p.solution)).some(s => s.title === 'The tables'))
    expect(bad.map(p => p.id)).toEqual([])
  })
})
