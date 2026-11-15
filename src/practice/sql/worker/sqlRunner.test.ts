import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { loadSql, createDatabase, runQuery } from '../../../pages/target/sqlEngine'
import { SqlRunner, STOPPED_MSG, TIMEOUT_MSG, runSql, warmSql, type WorkerLike } from './sqlRunner'

const wasm = decodeURIComponent(new URL('../../../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:)/, '')

class FakeWorker implements WorkerLike {
  static all: FakeWorker[] = []
  onmessage: WorkerLike['onmessage'] = null
  onerror: WorkerLike['onerror'] = null
  posted: { id: number; sql: string }[] = []
  terminated = false
  constructor() { FakeWorker.all.push(this); queueMicrotask(() => this.say({ type: 'ready' })) }
  say(data: unknown) { this.onmessage?.({ data }) }
  postMessage(m: unknown) { this.posted.push(m as { id: number; sql: string }) }
  terminate() { this.terminated = true }
}
const tick = () => new Promise(r => setTimeout(r, 0))
const last = () => FakeWorker.all[FakeWorker.all.length - 1]

afterEach(() => { FakeWorker.all = []; vi.useRealTimers() })

describe('SqlRunner (fake worker)', () => {
  it('resolves a result and flags truncation', async () => {
    const r = new SqlRunner(() => new FakeWorker())
    const p = r.run('practice', 'select 1')
    await tick()
    const w = last()
    w.say({ type: 'result', id: w.posted[0].id, columns: ['n'], rows: [[1]], total: 10000, truncated: true })
    expect(await p).toEqual({ columns: ['n'], rows: [[1]], total: 10000, truncated: true })
  })

  it('ignores an answer with an unknown id', async () => {
    const r = new SqlRunner(() => new FakeWorker())
    const p = r.run('practice', 'select 1')
    await tick()
    const w = last()
    w.say({ type: 'result', id: 999, columns: ['x'], rows: [], total: 0 })
    w.say({ type: 'result', id: w.posted[0].id, error: 'no such table: t' })
    expect(await p).toEqual({ error: 'no such table: t' })
  })

  it('times out, ends the worker and starts a new one on the next run', async () => {
    const r = new SqlRunner(() => new FakeWorker())
    const p = r.run('practice', 'select 1', { timeoutMs: 20 })
    expect(await p).toEqual({ error: TIMEOUT_MSG })
    expect(FakeWorker.all[0].terminated).toBe(true)
    const p2 = r.run('practice', 'select 2')
    await tick()
    expect(FakeWorker.all).toHaveLength(2)
    const w = last()
    w.say({ type: 'result', id: w.posted[0].id, columns: ['n'], rows: [[2]], total: 1 })
    expect(await p2).toEqual({ columns: ['n'], rows: [[2]], total: 1 })
  })

  it('cancel settles runs as Stopped and the next run respawns', async () => {
    const r = new SqlRunner(() => new FakeWorker())
    const p = r.run('practice', 'select 1')
    await tick()
    r.cancel()
    expect(await p).toEqual({ error: STOPPED_MSG, stopped: true })
    expect(FakeWorker.all[0].terminated).toBe(true)
    void r.run('practice', 'select 2')
    await tick()
    expect(FakeWorker.all).toHaveLength(2)
    r.dispose()
  })

  it('reports a worker that fails to load', async () => {
    class Broken extends FakeWorker { say(d: { type: string }) { super.say(d.type === 'ready' ? { type: 'failed', message: 'x' } : d) } }
    const r = new SqlRunner(() => new Broken())
    expect(await r.run('practice', 'select 1')).toEqual({ error: 'The practice database did not load.' })
  })
})

describe('runSql without a Worker (in-process path)', () => {
  beforeAll(async () => { await loadSql(() => wasm) })

  it('matches runQuery for ordinary queries and shares its rules', async () => {
    const db = await createDatabase(() => wasm)
    for (const sql of ['SELECT * FROM customers ORDER BY id;', 'WITH t AS (SELECT 1 AS a) SELECT a FROM t', 'SELECT * FROM customers WHERE 1 = 0', 'DROP TABLE customers', 'select 1; select 2', '', 'SELECT nope FROM customers']) {
      expect(await runSql('target', sql), sql).toEqual(runQuery(db, sql))
    }
    await warmSql('target')
  })

  it('cuts a runaway recursive query at the row limit', async () => {
    const r = await runSql('target', 'WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i + 1 FROM n) SELECT * FROM n')
    expect('rows' in r && r.rows.length).toBe(50)
    expect('truncated' in r && r.truncated).toBe(true)
  })
})
