import type { Database } from 'sql.js'
import type { QueryResult } from '../../../pages/target/sqlEngine'
import { checkSql } from './sqlGuard'
import { runWithLimit } from './exec'
import { openProfile, type Profile } from './profiles'

export type { Profile }
export interface RunOpts { limit?: number; timeoutMs?: number }

export const TIMEOUT_MSG = 'That query ran too long, so it was stopped.'
export const STOPPED_MSG = 'Stopped.'
const LOAD_MSG = 'The practice database did not load.'
const stopped = (): QueryResult => ({ error: STOPPED_MSG, stopped: true })

/** The slice of Worker the runner uses, so tests can pass a fake. */
export interface WorkerLike {
  postMessage(m: unknown): void
  terminate(): void
  onmessage: ((e: { data: any }) => void) | null // eslint-disable-line @typescript-eslint/no-explicit-any
  onerror: ((e: unknown) => void) | null
}

type Pending = { resolve(r: QueryResult): void; timer: ReturnType<typeof setTimeout> }
interface Reply { id: number; error?: string; columns?: string[]; rows?: unknown[][]; total?: number; truncated?: boolean }

/** Main-thread side of the SQL worker, modelled on PythonRunner. One worker; made lazily, and again after a stop. */
export class SqlRunner {
  private worker: WorkerLike | null = null
  private ready: Promise<void> | null = null
  private pending = new Map<number, Pending>()
  private nextId = 1
  private make: () => WorkerLike
  constructor(make?: () => WorkerLike) {
    this.make = make ?? (() => new Worker(new URL('./sql.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike)
  }

  ensureReady(): Promise<void> {
    if (this.ready) return this.ready
    const ready = new Promise<void>((resolve, reject) => {
      const w = this.make()
      this.worker = w
      w.onmessage = e => {
        const m = e.data
        if (m.type === 'ready') resolve()
        else if (m.type === 'failed') { this.kill(); reject(new Error(m.message)) }
        else if (m.type === 'result') this.finish(m)
      }
      w.onerror = () => { this.kill(); reject(new Error('worker')) }
    })
    ready.catch(() => { if (this.ready === ready) this.ready = null }) // allow a retry
    this.ready = ready
    return ready
  }

  private finish(m: Reply) {
    const p = this.pending.get(m.id)
    if (!p) return // an answer for something already settled
    clearTimeout(p.timer)
    this.pending.delete(m.id)
    p.resolve(m.error ? { error: m.error } : { columns: m.columns ?? [], rows: m.rows ?? [], total: m.total ?? 0, ...(m.truncated ? { truncated: true } : {}) })
  }

  async run(profile: Profile, sql: string, { limit = 50, timeoutMs = 5000 }: RunOpts = {}): Promise<QueryResult> {
    const ready = this.ensureReady()
    try { await ready } catch { return { error: LOAD_MSG } }
    const w = this.worker
    if (!w || this.ready !== ready) return stopped() // stopped while the worker was starting
    const id = this.nextId++
    return new Promise<QueryResult>(resolve => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        this.kill() // a running query cannot be interrupted: end the worker, the next run starts a new one
        resolve({ error: TIMEOUT_MSG })
      }, timeoutMs)
      this.pending.set(id, { resolve, timer })
      w.postMessage({ type: 'run', id, profile, sql, limit, timeoutMs })
    })
  }

  /** Starts the worker and seeds a database ahead of the first Run. Rejects if it cannot load. */
  async warm(profile: Profile): Promise<void> {
    const r = await this.run(profile, 'select 1', { limit: 1, timeoutMs: 20000 })
    if ('error' in r) throw new Error(r.error)
  }

  /** Stops whatever is running; those runs settle as "Stopped.". The next run starts a fresh worker. */
  cancel() { this.kill() }
  dispose() { this.kill() }

  private kill() {
    this.worker?.terminate()
    this.worker = null
    this.ready = null
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer)
      p.resolve(stopped())
      this.pending.delete(id)
    }
  }
}

// ---- the entry points the screens use ----
let runner: SqlRunner | null = null
const shared = () => (runner ??= new SqlRunner())
const dbs = new Map<Profile, Promise<Database>>()
const local = (p: Profile) => {
  let d = dbs.get(p)
  if (!d) { d = openProfile(p); dbs.set(p, d); d.catch(() => dbs.delete(p)) }
  return d
}
const inWorker = () => typeof Worker !== 'undefined'

/** Runs a learner query. Worker in the browser; in-process where there is no Worker (tests, server rendering). */
export async function runSql(profile: Profile, sql: string, opts: RunOpts = {}): Promise<QueryResult> {
  if (inWorker()) return shared().run(profile, sql, opts)
  const c = checkSql(sql)
  if ('error' in c) return c
  try { return runWithLimit(await local(profile), c.sql, opts.limit ?? 50) } catch { return { error: LOAD_MSG } }
}

export function warmSql(profile: Profile): Promise<void> {
  return inWorker() ? shared().warm(profile) : local(profile).then(() => undefined)
}
export const cancelSql = () => runner?.cancel()
export const disposeSql = () => { runner?.dispose(); runner = null }
export const isStopped = (r: QueryResult) => 'error' in r && !!r.stopped
