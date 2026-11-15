import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from 'sql.js'
import { runQuery, sameResult, type QueryResult } from '../../../pages/target/sqlEngine'
import { createPracticeDb, practiceTables } from '../db'
import { idFor, moduleTopic } from './mapping'
import { added300 } from './g3'

// Question numbers and (topic initial, level initial) of group g3 in pdf300.json.
const PDF: [number, string][] = [[1,'NP'],[5,'NP'],[7,'MA'],[8,'WP'],[12,'MP'],[14,'NP'],[17,'WP'],[32,'TP'],[33,'TP'],[36,'WP'],[38,'NP'],[39,'WA'],[40,'NP'],[43,'MP'],[47,'TA'],[53,'NP'],[58,'TP'],[60,'NA'],[61,'TP'],[65,'TP'],[66,'NA'],[73,'TA'],[74,'NP'],[78,'NA'],[79,'NP'],[80,'TP'],[84,'NA'],[87,'TA'],[93,'TP'],[95,'TP'],[96,'WP'],[98,'TA'],[99,'TP'],[101,'NP'],[118,'MP'],[121,'TP'],[124,'NP'],[125,'NP'],[133,'WA'],[138,'MP'],[139,'WA'],[141,'NP'],[142,'NP'],[143,'NP'],[144,'NP'],[146,'MA'],[148,'WP'],[156,'TA'],[173,'NP'],[174,'NP'],[187,'NP'],[188,'TP'],[197,'NP'],[202,'MA'],[206,'NP'],[207,'TA'],[209,'WA'],[213,'TA'],[215,'TA'],[219,'MP'],[222,'NA'],[223,'TA'],[227,'TA'],[245,'NP'],[246,'NP'],[249,'TA'],[250,'TP'],[251,'NP'],[257,'NA'],[264,'NP'],[274,'NA'],[276,'TP'],[284,'TP'],[292,'NA'],[293,'TA'],[299,'MA']]
const TOPIC = { N: 'Nth highest and ranking', T: 'Top-N per group', W: 'Window functions: running totals and LAG/LEAD', M: 'Median, percentiles and statistics' } as const

const wasm = decodeURIComponent(new URL('../../../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, '')
let db: Database
const run = (sql: string): QueryResult => runQuery(db, sql)
const learner = (p: (typeof added300)[number]) => [p.title, p.scenario, p.prompt, p.output, p.pattern, p.followUp, p.hint, p.explain, ...(p.edgeCases ?? [])].join(' ')

describe('bank300 g3', () => {
  beforeAll(async () => { db = await createPracticeDb(() => wasm) })

  it('has one problem per g3 question with the right id, topic and level', () => {
    expect(added300).toHaveLength(PDF.length)
    expect(added300.map(p => p.id)).toEqual(PDF.map(([n]) => idFor(n)))
    expect(new Set(added300.map(p => p.id)).size).toBe(PDF.length)
    PDF.forEach(([n, k], i) => {
      const want = moduleTopic(TOPIC[k[0] as keyof typeof TOPIC], k[1] === 'A' ? 'Advanced' : 'Pro')
      expect({ topic: added300[i].topic, level: added300[i].level }, idFor(n)).toEqual(want)
    })
  })

  it('every solution runs and returns rows', () => {
    for (const p of added300) {
      const r = run(p.solution)
      expect('error' in r, `${p.id}: ${'error' in r ? r.error : ''}`).toBe(false)
      if (!('error' in r)) expect(r.rows.length, p.id).toBeGreaterThan(0)
    }
  })

  it('ordered solutions are deterministic', () => {
    for (const p of added300.filter(x => x.ordered)) expect(sameResult(run(p.solution), run(p.solution), true), p.id).toBe(true)
  })

  it('uses the snapshot date, never the real clock', () => {
    for (const p of added300) expect(p.solution, p.id).not.toMatch(/now|current_date|current_timestamp/i)
  })

  it('respects text caps and has every field', () => {
    const tables = new Set(practiceTables.map(t => t.name))
    for (const p of added300) {
      expect(p.title.length, p.id).toBeLessThanOrEqual(40)
      expect(p.minutes, p.id).toBeGreaterThanOrEqual(3)
      expect(p.minutes, p.id).toBeLessThanOrEqual(10)
      expect(p.scenario!.length, p.id).toBeLessThanOrEqual(200)
      expect(p.prompt.length, p.id).toBeLessThanOrEqual(280)
      expect(p.output!.length, p.id).toBeLessThanOrEqual(100)
      expect(p.followUp!.length, p.id).toBeLessThanOrEqual(140)
      expect(p.edgeCases!.length, p.id).toBeGreaterThanOrEqual(1)
      expect(p.edgeCases!.length, p.id).toBeLessThanOrEqual(3)
      expect(p.pattern && p.asked && p.hint && p.explain, p.id).toBeTruthy()
      for (const t of p.tables!) expect(tables.has(t), `${p.id}: ${t}`).toBe(true)
    }
  })

  it('has no banned words in learner-facing text', () => {
    for (const p of added300) expect(learner(p), p.id).not.toMatch(/agentic|evidence|reflection|evaluation/i)
  })
})
