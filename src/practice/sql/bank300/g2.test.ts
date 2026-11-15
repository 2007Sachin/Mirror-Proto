import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from 'sql.js'
import { runQuery, sameResult } from '../../../pages/target/sqlEngine'
import { createPracticeDb, practiceTables } from '../db'
import { added300 } from './g2'
import { idFor, moduleTopic } from './mapping'

const wasm = decodeURIComponent(new URL('../../../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, '')
const EXPECT: Record<number, [number, string]> = {2:[2,'B'],6:[0,'P'],13:[2,'P'],15:[0,'P'],16:[3,'P'],19:[1,'B'],25:[0,'B'],26:[3,'P'],28:[0,'P'],31:[1,'B'],41:[0,'P'],48:[0,'P'],51:[1,'B'],54:[0,'P'],59:[0,'P'],62:[0,'P'],81:[0,'P'],82:[0,'A'],86:[1,'P'],91:[0,'P'],94:[0,'P'],97:[1,'B'],113:[1,'A'],123:[0,'P'],131:[0,'P'],134:[0,'P'],140:[2,'B'],147:[1,'P'],161:[0,'P'],167:[1,'A'],171:[1,'A'],172:[0,'B'],176:[0,'P'],179:[1,'B'],180:[1,'B'],184:[3,'P'],185:[0,'B'],195:[2,'P'],200:[0,'B'],216:[0,'P'],217:[1,'B'],218:[3,'A'],224:[3,'P'],225:[1,'A'],226:[0,'P'],240:[0,'B'],242:[1,'A'],244:[0,'P'],247:[0,'B'],258:[1,'A'],259:[3,'B'],263:[3,'B'],265:[0,'P'],266:[0,'P'],270:[0,'P'],271:[0,'P'],273:[2,'P'],281:[0,'P'],283:[2,'B'],288:[1,'B'],289:[0,'P'],290:[0,'P'],300:[0,'P']}
const NS = Object.keys(EXPECT).map(Number)
const PDF_TOPICS = ['Anti-joins, EXISTS and missing data', 'Subqueries and comparing to an average', 'Duplicates and set operations', 'Conditional aggregation, pivots and percentages']
const BANNED = /agentic|evidence|reflection|evaluation/i

let db: Database
beforeAll(async () => { db = await createPracticeDb(() => wasm) })

describe('bank300 g2', () => {
  it('has exactly the group ids', () => {
    expect(added300).toHaveLength(NS.length)
    expect(added300.map(p => p.id)).toEqual(NS.map(idFor))
    expect(new Set(added300.map(p => p.id)).size).toBe(NS.length)
  })

  it('solutions run, return rows and ordered ones are deterministic', () => {
    for (const p of added300) {
      const r = runQuery(db, p.solution)
      expect('error' in r, `${p.id}: ${'error' in r ? r.error : ''}`).toBe(false)
      if ('error' in r) continue
      expect(r.rows.length, p.id).toBeGreaterThan(0)
      if (p.ordered) expect(sameResult(r, runQuery(db, p.solution), true), p.id).toBe(true)
    }
  })

  it('has no clock functions in solutions', () => {
    for (const p of added300) expect(p.solution, p.id).not.toMatch(/'now'|current_date|current_timestamp/i)
  })

  it('respects text caps and banned words', () => {
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
      const text = [p.title, p.scenario, p.prompt, p.output, p.pattern, p.followUp, p.hint, p.explain, ...p.edgeCases!].join(' ')
      expect(text, p.id).not.toMatch(BANNED)
    }
  })

  it('uses real tables and the module topic mapping', () => {
    for (const n of NS) {
      const [ti, lv] = EXPECT[n]
      const want = moduleTopic(PDF_TOPICS[ti], lv === 'B' ? 'Beginner' : lv === 'P' ? 'Pro' : 'Advanced')
      const p = added300.find(x => x.id === idFor(n))!
      expect({ topic: p.topic, level: p.level }, String(n)).toEqual(want)
    }
    const names = new Set(practiceTables.map(t => t.name))
    for (const p of added300) {
      for (const t of p.tables!) expect(names.has(t), `${p.id} ${t}`).toBe(true)
    }
  })
})
