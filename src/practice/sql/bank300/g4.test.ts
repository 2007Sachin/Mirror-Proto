import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from 'sql.js'
import { runQuery, sameResult } from '../../../pages/target/sqlEngine'
import { createPracticeDb, practiceTables } from '../db'
import { idFor, moduleTopic } from './mapping'
import { added300 } from './g4'

const wasm = decodeURIComponent(new URL('../../../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, '')
let db: Database

// [question number, pdf topic index, level 2 = Pro | 3 = Advanced] for group g4 of pdf300.json
const TOPICS = ['Self-joins, hierarchies and overlaps', 'Gaps, islands and consecutive runs', 'Recursive CTEs and trees', 'Relational division: "all" and "every"', 'Trends and retention over time']
const G4: [number, number, number][] = [[3,0,2],[9,1,3],[10,2,3],[11,1,2],[18,0,2],[21,0,2],[27,3,2],[29,3,3],[30,4,3],[37,2,2],[46,1,3],[49,1,3],[52,3,3],[56,4,3],[57,0,2],[68,0,2],[70,0,3],[71,3,3],[72,0,2],[75,1,2],[76,1,2],[83,4,3],[85,0,3],[100,3,2],[102,1,3],[104,1,3],[105,0,3],[108,1,3],[109,3,3],[111,0,2],[112,0,2],[116,0,2],[126,1,3],[135,0,2],[136,4,3],[137,2,3],[152,1,3],[153,3,2],[155,0,2],[158,4,3],[160,0,2],[163,3,3],[181,4,3],[186,3,2],[189,4,3],[194,0,3],[196,4,3],[201,3,3],[203,4,3],[204,1,3],[205,0,2],[208,3,3],[210,0,2],[228,0,3],[229,3,3],[230,0,2],[231,4,3],[234,3,3],[235,1,3],[237,0,3],[241,4,3],[253,1,3],[260,3,3],[261,3,3],[267,4,3],[272,4,3],[275,4,3],[286,0,2],[294,4,3],[295,0,2],[297,3,3]]
const run = (sql: string) => runQuery(db, sql)

describe('bank300 g4', () => {
  beforeAll(async () => { db = await createPracticeDb(() => wasm) })

  it('has one problem per g4 question with the right id, topic and level', () => {
    expect(added300).toHaveLength(71)
    expect(G4).toHaveLength(71)
    expect(added300.map(p => p.id).sort()).toEqual(G4.map(([n]) => idFor(n)).sort())
    expect(new Set(added300.map(p => p.id)).size).toBe(71)
    for (const [n, t, lv] of G4) {
      const p = added300.find(x => x.id === idFor(n))!
      const want = moduleTopic(TOPICS[t], lv === 2 ? 'Pro' : 'Advanced')
      expect(p.topic, p.id).toBe(want.topic)
      expect(p.level, p.id).toBe(want.level)
    }
  })

  it('every solution runs on the seed and returns rows; ordered ones are deterministic', () => {
    for (const p of added300) {
      const r = run(p.solution)
      expect('error' in r, `${p.id}: ${'error' in r ? r.error : ''}`).toBe(false)
      if ('error' in r) continue
      expect(r.rows.length, p.id).toBeGreaterThan(0)
      if (p.ordered) expect(sameResult(r, run(p.solution), true), p.id).toBe(true)
    }
  })

  it('uses the snapshot date, never now', () => {
    for (const p of added300) expect(p.solution, p.id).not.toMatch(/'now'|CURRENT_DATE|CURRENT_TIMESTAMP/i)
  })

  it('respects text caps and banned words, and lists real tables', () => {
    const names = practiceTables.map(t => t.name)
    for (const p of added300) {
      expect(p.title.length, p.id).toBeLessThanOrEqual(40)
      expect(p.minutes, p.id).toBeGreaterThanOrEqual(3)
      expect(p.minutes, p.id).toBeLessThanOrEqual(12)
      expect(p.scenario!.length, p.id + ' scenario').toBeLessThanOrEqual(220)
      expect(p.prompt.length, p.id + ' prompt').toBeLessThanOrEqual(300)
      expect(p.output!.length, p.id + ' output').toBeLessThanOrEqual(110)
      expect(p.followUp!.length, p.id + ' followUp').toBeLessThanOrEqual(150)
      expect(p.edgeCases!.length, p.id).toBeGreaterThanOrEqual(1)
      expect(p.edgeCases!.length, p.id).toBeLessThanOrEqual(3)
      for (const f of [p.title, p.scenario, p.prompt, p.output, p.pattern, p.followUp, p.hint, p.explain, ...(p.edgeCases ?? [])]) expect(f, p.id).not.toMatch(/agentic|evidence|reflection|evaluation/i)
      for (const t of p.tables ?? []) expect(names, `${p.id} ${t}`).toContain(t)
    }
  })
})
