import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from 'sql.js'
import { runQuery, sameResult } from '../../../pages/target/sqlEngine'
import { createPracticeDb, practiceTables } from '../db'
import { added300 } from './g1'
import { idFor, moduleTopic } from './mapping'

// [n, pdf topic, pdf level] of every pdf300 question in group g1.
const G1: [number, string, string][] = [[4, 'Aggregation and GROUP BY', 'Beginner'], [20, 'Joins and enriching rows', 'Beginner'], [22, 'Aggregation and GROUP BY', 'Beginner'], [23, 'Aggregation and GROUP BY', 'Pro'], [24, 'Aggregation and GROUP BY', 'Beginner'], [34, 'Aggregation and GROUP BY', 'Beginner'], [35, 'Filtering, sorting and basics', 'Beginner'], [42, 'Dates and time windows', 'Beginner'], [44, 'Aggregation and GROUP BY', 'Beginner'], [45, 'Joins and enriching rows', 'Pro'], [50, 'Aggregation and GROUP BY', 'Beginner'], [55, 'Aggregation and GROUP BY', 'Beginner'], [63, 'Aggregation and GROUP BY', 'Beginner'], [64, 'Dates and time windows', 'Beginner'], [67, 'Aggregation and GROUP BY', 'Beginner'], [69, 'Aggregation and GROUP BY', 'Beginner'], [77, 'Aggregation and GROUP BY', 'Beginner'], [88, 'Joins and enriching rows', 'Pro'], [89, 'Aggregation and GROUP BY', 'Beginner'], [90, 'Aggregation and GROUP BY', 'Beginner'], [92, 'Joins and enriching rows', 'Pro'], [103, 'Aggregation and GROUP BY', 'Beginner'], [106, 'Aggregation and GROUP BY', 'Beginner'], [107, 'Aggregation and GROUP BY', 'Beginner'], [110, 'Aggregation and GROUP BY', 'Beginner'], [114, 'Dates and time windows', 'Beginner'], [115, 'Aggregation and GROUP BY', 'Beginner'], [117, 'Aggregation and GROUP BY', 'Beginner'], [119, 'Aggregation and GROUP BY', 'Beginner'], [120, 'Joins and enriching rows', 'Pro'], [122, 'Joins and enriching rows', 'Pro'], [127, 'Aggregation and GROUP BY', 'Beginner'], [128, 'Aggregation and GROUP BY', 'Beginner'], [129, 'Dates and time windows', 'Beginner'], [130, 'Aggregation and GROUP BY', 'Beginner'], [132, 'Aggregation and GROUP BY', 'Beginner'], [145, 'Dates and time windows', 'Beginner'], [149, 'Aggregation and GROUP BY', 'Beginner'], [150, 'Aggregation and GROUP BY', 'Pro'], [151, 'Aggregation and GROUP BY', 'Pro'], [154, 'Joins and enriching rows', 'Pro'], [157, 'Aggregation and GROUP BY', 'Beginner'], [159, 'Aggregation and GROUP BY', 'Pro'], [162, 'Aggregation and GROUP BY', 'Pro'], [164, 'Aggregation and GROUP BY', 'Beginner'], [165, 'Dates and time windows', 'Pro'], [166, 'Aggregation and GROUP BY', 'Beginner'], [168, 'Dates and time windows', 'Beginner'], [169, 'Aggregation and GROUP BY', 'Pro'], [170, 'Aggregation and GROUP BY', 'Beginner'], [175, 'Aggregation and GROUP BY', 'Beginner'], [177, 'Joins and enriching rows', 'Pro'], [178, 'Filtering, sorting and basics', 'Pro'], [182, 'Dates and time windows', 'Pro'], [183, 'Dates and time windows', 'Beginner'], [190, 'Dates and time windows', 'Beginner'], [191, 'Aggregation and GROUP BY', 'Beginner'], [192, 'Dates and time windows', 'Beginner'], [193, 'Dates and time windows', 'Beginner'], [198, 'Aggregation and GROUP BY', 'Beginner'], [199, 'Aggregation and GROUP BY', 'Beginner'], [211, 'Aggregation and GROUP BY', 'Beginner'], [212, 'Joins and enriching rows', 'Pro'], [214, 'Dates and time windows', 'Beginner'], [220, 'Aggregation and GROUP BY', 'Beginner'], [221, 'Aggregation and GROUP BY', 'Beginner'], [232, 'Dates and time windows', 'Beginner'], [233, 'Aggregation and GROUP BY', 'Beginner'], [236, 'Aggregation and GROUP BY', 'Beginner'], [238, 'Dates and time windows', 'Advanced'], [239, 'Joins and enriching rows', 'Beginner'], [243, 'Filtering, sorting and basics', 'Beginner'], [248, 'Aggregation and GROUP BY', 'Pro'], [252, 'Dates and time windows', 'Pro'], [254, 'Aggregation and GROUP BY', 'Pro'], [255, 'Dates and time windows', 'Beginner'], [256, 'Aggregation and GROUP BY', 'Beginner'], [262, 'Dates and time windows', 'Beginner'], [268, 'Joins and enriching rows', 'Pro'], [269, 'Aggregation and GROUP BY', 'Beginner'], [277, 'Dates and time windows', 'Pro'], [278, 'Aggregation and GROUP BY', 'Beginner'], [279, 'Aggregation and GROUP BY', 'Beginner'], [280, 'Joins and enriching rows', 'Advanced'], [282, 'Dates and time windows', 'Pro'], [285, 'Joins and enriching rows', 'Pro'], [287, 'Dates and time windows', 'Beginner'], [291, 'Aggregation and GROUP BY', 'Beginner'], [296, 'Dates and time windows', 'Pro'], [298, 'Joins and enriching rows', 'Pro']]
const wasm = decodeURIComponent(new URL('../../../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, '')
let db: Database
const run = (sql: string) => runQuery(db, sql)

describe('bank300 g1', () => {
  beforeAll(async () => { db = await createPracticeDb(() => wasm) })

  it('has one problem per g1 question with the right id, topic and level', () => {
    expect(added300).toHaveLength(G1.length)
    expect(added300.map(p => p.id)).toEqual(G1.map(([n]) => idFor(n)))
    expect(new Set(added300.map(p => p.id)).size).toBe(added300.length)
    G1.forEach(([, topic, level], i) => {
      const m = moduleTopic(topic, level as 'Beginner' | 'Pro' | 'Advanced')
      expect(added300[i].topic, added300[i].id).toBe(m.topic)
      expect(added300[i].level, added300[i].id).toBe(m.level)
    })
  })

  it('every solution runs on the practice database and returns rows', () => {
    for (const p of added300) {
      const r = run(p.solution)
      expect('error' in r, `${p.id}: ${'error' in r ? r.error : ''}`).toBe(false)
      if (!('error' in r)) expect(r.rows.length, p.id).toBeGreaterThan(0)
    }
  })

  it('ordered solutions are deterministic and never read the clock', () => {
    for (const p of added300.filter(x => x.ordered)) expect(sameResult(run(p.solution), run(p.solution), true), p.id).toBe(true)
    for (const p of added300) expect(p.solution, p.id).not.toMatch(/'now'|CURRENT_(DATE|TIMESTAMP)/i)
  })

  it('respects text caps and banned words', () => {
    const tables = new Set(practiceTables.map(t => t.name))
    for (const p of added300) {
      expect(p.title.length, p.id).toBeLessThanOrEqual(40)
      expect(p.minutes, p.id).toBeGreaterThanOrEqual(3)
      expect(p.minutes, p.id).toBeLessThanOrEqual(10)
      expect(p.scenario!.length, p.id + ' scenario').toBeLessThanOrEqual(200)
      expect(p.prompt.length, p.id + ' prompt').toBeLessThanOrEqual(280)
      expect(p.output!.length, p.id + ' output').toBeLessThanOrEqual(100)
      expect(p.followUp!.length, p.id + ' followUp').toBeLessThanOrEqual(140)
      expect(p.edgeCases!.length, p.id).toBeGreaterThanOrEqual(1)
      expect(p.edgeCases!.length, p.id).toBeLessThanOrEqual(3)
      for (const t of p.tables!) expect(tables.has(t), p.id + ' table ' + t).toBe(true)
      const text = [p.title, p.scenario, p.prompt, p.output, p.pattern, p.followUp, p.hint, p.explain, ...p.edgeCases!].join(' ')
      expect(text, p.id).not.toMatch(/agentic|evidence|reflection|evaluation/i)
    }
  })
})
