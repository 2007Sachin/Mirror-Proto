import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { seedSql } from './sqlProblems'
import { checkSql } from '../../practice/sql/worker/sqlGuard'

// `truncated`: the query kept producing rows and was cut off, so `total` means "this many or more". `stopped`: the learner cancelled.
export type QueryResult = { columns: string[]; rows: unknown[][]; total: number; truncated?: boolean } | { error: string; stopped?: boolean }
type Ok = Exclude<QueryResult, { error: string }>

const MAX_ROWS = 50
let sqlPromise: Promise<SqlJsStatic> | null = null

// Loads sql.js once. Tests pass a file path for node; the browser uses the Vite-hashed wasm URL.
export function loadSql(locate: () => string = () => wasmUrl): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: locate })
    sqlPromise.catch(() => { sqlPromise = null }) // allow retry after a failed load
  }
  return sqlPromise
}

export async function createDatabase(locate?: () => string): Promise<Database> {
  const SQL = await loadSql(locate)
  const db = new SQL.Database()
  db.run(seedSql)
  return db
}

// Synchronous path (node tests, code that holds its own Database). Learner screens use runSql in worker/sqlRunner.ts.
export function runQuery(db: Database, sql: string): QueryResult {
  const checked = checkSql(sql)
  if ('error' in checked) return checked
  const clean = checked.sql
  try {
    const res = db.exec(clean)[0]
    if (!res) return { columns: [], rows: [], total: 0 }
    return { columns: res.columns, rows: res.values.slice(0, MAX_ROWS), total: res.values.length }
  } catch (e) {
    return { error: e instanceof Error ? e.message.replace(/^Error:\s*/, '') : 'The query could not run.' }
  }
}

const cell = (v: unknown) => (v === null || v === undefined ? 'null' : typeof v === 'number' ? `n:${v.toFixed(2)}` : `s:${String(v)}`)

// Same rows, ignoring column names; row order only matters when `ordered`.
// ponytail: compares the capped rows (50); every solution returns far fewer, so a longer wrong result still fails on `total`.
export function sameResult(a: QueryResult, b: QueryResult, ordered: boolean): boolean {
  if ('error' in a || 'error' in b || a.truncated || b.truncated) return false
  if (a.total !== b.total || a.columns.length !== b.columns.length) return false
  const keys = (r: Ok) => r.rows.map(row => row.map(cell).join('\u0001'))
  const ka = keys(a), kb = keys(b)
  if (!ordered) { ka.sort(); kb.sort() }
  return ka.every((k, i) => k === kb[i])
}

export function preview(r: QueryResult): string {
  if ('error' in r) return ''
  if (!r.rows.length) return 'No rows.'
  const lines = [r.columns.join(' | '), ...r.rows.slice(0, 5).map(row => row.map(v => (v === null ? 'NULL' : String(v))).join(' | '))]
  return `${lines.join('\n')}${r.total > 5 ? `\n(${r.total} rows)` : ''}`
}
