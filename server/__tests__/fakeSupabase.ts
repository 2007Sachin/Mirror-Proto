import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types.js'

type Op = 'select' | 'insert' | 'upsert' | 'update' | 'delete'
export interface Call {
  table: string
  op: Op
  payload?: unknown
  options?: unknown
  /** [method, column, value] for eq/in/like/is/lt/gte */
  filters: [string, string, unknown][]
  order?: [string, boolean]
  limit?: number
  /** `.select()` after insert/update/upsert */
  returning: boolean
  terminal?: 'single' | 'maybeSingle'
}
export interface Reply {
  data?: unknown
  error?: { message: string; code?: string } | null
}
export type Handler = (call: Call) => Reply | undefined

const STAMP = '2026-01-01T00:00:00.000Z'
const withDefaults = (r: unknown, n: number) => ({ id: `id-${n}`, created_at: STAMP, updated_at: STAMP, ...(r as object) })

class Builder implements PromiseLike<Reply> {
  private call: Call
  constructor(
    table: string,
    private calls: Call[],
    private handler: Handler,
    private rows: Record<string, unknown[]>,
  ) {
    this.call = { table, op: 'select', filters: [], returning: false }
  }
  select() { this.call.returning = true; return this }
  insert(payload: unknown) { Object.assign(this.call, { op: 'insert', payload }); return this }
  upsert(payload: unknown, options?: unknown) { Object.assign(this.call, { op: 'upsert', payload, options }); return this }
  update(payload: unknown) { Object.assign(this.call, { op: 'update', payload }); return this }
  delete() { this.call.op = 'delete'; return this }
  private f(method: string, col: string, value: unknown) { this.call.filters.push([method, col, value]); return this }
  eq(col: string, v: unknown) { return this.f('eq', col, v) }
  in(col: string, v: unknown) { return this.f('in', col, v) }
  like(col: string, v: unknown) { return this.f('like', col, v) }
  is(col: string, v: unknown) { return this.f('is', col, v) }
  lt(col: string, v: unknown) { return this.f('lt', col, v) }
  gte(col: string, v: unknown) { return this.f('gte', col, v) }
  order(col: string, o?: { ascending?: boolean }) { this.call.order = [col, o?.ascending !== false]; return this }
  limit(n: number) { this.call.limit = n; return this }
  single() { this.call.terminal = 'single'; return this }
  maybeSingle() { this.call.terminal = 'maybeSingle'; return this }

  private run(): Reply {
    const c = this.call
    this.calls.push(c)
    const scripted = this.handler(c)
    if (scripted) return { data: null, error: null, ...scripted }
    if (c.op === 'delete') return { data: null, error: null }
    if (c.op === 'select') {
      const rows = this.rows[c.table] ?? []
      return { data: c.terminal ? (rows[0] ?? null) : rows, error: null }
    }
    const list = Array.isArray(c.payload) ? c.payload : [c.payload]
    const echoed = list.map((r, i) => withDefaults(r, i + 1))
    return { data: c.returning ? (c.terminal ? echoed[0] : echoed) : null, error: null }
  }
  then<A = Reply, B = never>(ok?: ((v: Reply) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve().then(() => this.run()).then(ok, bad)
  }
}

/**
 * A chainable stand-in for the typed Supabase client. It records every executed query in `calls`.
 * Unscripted queries echo inserts (adding id/timestamps) and read `rows[table]`.
 */
export function fakeClient(handler: Handler = () => undefined, rows: Record<string, unknown[]> = {}) {
  const calls: Call[] = []
  const client = { from: (table: string) => new Builder(table, calls, handler, rows) } as unknown as SupabaseClient<Database>
  return { client, calls }
}

export const eqOf = (c: Call, col: string) => c.filters.find(([m, k]) => m === 'eq' && k === col)?.[2]
export const rowsOf = (c: Call): Record<string, unknown>[] => (Array.isArray(c.payload) ? c.payload : [c.payload]) as Record<string, unknown>[]
