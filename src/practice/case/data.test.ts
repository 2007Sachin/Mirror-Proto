import { beforeAll, describe, expect, it } from 'vitest'
import { runQuery } from '../../pages/target/sqlEngine'
import { cases, createCaseDb } from './data'
import { trackModule } from './index'

const wasm = decodeURIComponent(new URL('../../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, '')
const dbs: Record<string, Awaited<ReturnType<typeof createCaseDb>>> = {}

describe('case simulators', () => {
  beforeAll(async () => { for (const c of cases) dbs[c.id] = await createCaseDb(c.id, () => wasm) })

  it('catalog: unique case- ids, topics and levels', () => {
    expect(new Set(cases.map(c => c.id)).size).toBe(3)
    cases.forEach(c => { expect(c.id.startsWith('case-')).toBe(true); expect(trackModule.topics).toContain(c.topic); expect([2, 3]).toContain(c.level) })
    expect(trackModule.topics.every(t => cases.some(c => c.topic === t))).toBe(true)
  })

  it('every case has one real cause, one best/tempting/harmful set, and runnable debrief queries', () => {
    for (const c of cases) {
      expect(c.causes.length).toBe(4)
      expect(c.causes.filter(x => x.id === c.cause).length, c.id).toBe(1)
      expect(c.recs.map(r => r.kind).sort()).toEqual(['best', 'harmful', 'tempting'])
      for (const q of c.debrief.queries) {
        const r = runQuery(dbs[c.id], q.sql)
        expect('error' in r, `${c.id}: ${q.label}`).toBe(false)
      }
    }
  })

  it('the hidden cause is discoverable with a concrete query on the seeded data', () => {
    for (const c of cases) {
      const r = runQuery(dbs[c.id], c.proof.sql)
      expect('error' in r ? r.error : '', c.id).toBe('')
      if (!('error' in r)) expect(c.proof.ok(r.rows), `${c.id}: ${JSON.stringify(r.rows)}`).toBe(true)
    }
  })

  it('the signups total really drops by roughly 12 percent, and the headline A/B lift is positive', () => {
    const w = runQuery(dbs['case-signups-drop'], "SELECT SUM(CASE WHEN day < '2025-03-08' THEN signups END), SUM(CASE WHEN day >= '2025-03-08' THEN signups END) FROM signups")
    const [a, b] = 'rows' in w ? (w.rows[0] as number[]) : [1, 1]
    expect(1 - b / a).toBeGreaterThan(0.1)
    expect(1 - b / a).toBeLessThan(0.15)
    const h = runQuery(dbs['case-ab-android'], "SELECT variant, SUM(purchases) * 1.0 / SUM(users) FROM ab_results GROUP BY 1 ORDER BY 1")
    expect('rows' in h && (h.rows[1][1] as number) > (h.rows[0][1] as number)).toBe(true)
  })

  it('visible text avoids banned words', () => {
    const t = JSON.stringify(cases.map(c => [c.brief, c.causes, c.recs, c.debrief, c.title])).toLowerCase()
    for (const w of ['agentic', 'evidence', 'reflection', 'evaluation']) expect(t).not.toContain(w)
  })
})
