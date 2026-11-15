import type { QueryResult } from '../../../pages/target/sqlEngine'

export type Expect = { kind: 'zero' | 'one' | 'few' | 'many' } | { kind: 'number'; n: number }
export type Confidence = 'guess' | 'fairly' | 'certain'

// ponytail: "few" = 2 to 9 rows, "many" = 10 or more; a fixed rule of thumb, not tuned per problem.
export function bucket(n: number): 'zero' | 'one' | 'few' | 'many' {
  return n === 0 ? 'zero' : n === 1 ? 'one' : n < 10 ? 'few' : 'many'
}

const WORDS = { zero: 'no rows', one: 'one row', few: 'a few rows', many: 'a lot of rows' }

export const expectWords = (e: Expect) => (e.kind === 'number' ? `${e.n} ${e.n === 1 ? 'row' : 'rows'}` : WORDS[e.kind])

export function matches(e: Expect, actual: number): boolean {
  return e.kind === 'number' ? e.n === actual : e.kind === bucket(actual)
}

export function compareText(e: Expect, actual: number): string {
  const got = actual === 0 ? 'no rows' : `${actual} ${actual === 1 ? 'row' : 'rows'}`
  return matches(e, actual) ? `You expected ${expectWords(e)}, and it returned ${got}.` : `You expected ${expectWords(e)}, it returned ${got}.`
}

export function surprised(e: Expect, c: Confidence, actual: number): boolean {
  return c !== 'guess' && !matches(e, actual)
}

export interface RowDiff { gotCount: number; wantCount: number; missing: string[]; extra: string[]; missingN: number; extraN: number }

const fmt = (r: unknown[]) => r.map(v => (v === null ? 'NULL' : String(v))).join(', ')

/** Compares as multisets, order ignored. Null when either side is an error. */
export function diffRows(got: QueryResult, want: QueryResult): RowDiff | null {
  if ('error' in got || 'error' in want) return null
  const count = new Map<string, number>()
  for (const r of want.rows) count.set(fmt(r), (count.get(fmt(r)) ?? 0) + 1)
  const extra: string[] = []
  for (const r of got.rows) {
    const k = fmt(r), n = count.get(k) ?? 0
    if (n > 0) count.set(k, n - 1)
    else extra.push(k)
  }
  const missing: string[] = []
  count.forEach((n, k) => { for (let i = 0; i < n; i++) missing.push(k) })
  return {
    gotCount: got.total, wantCount: want.total,
    missing: missing.slice(0, 3), extra: extra.slice(0, 3), missingN: missing.length, extraN: extra.length,
  }
}

export function diffText(d: RowDiff, columnsDiffer: boolean): string[] {
  const out: string[] = []
  if (d.gotCount !== d.wantCount) {
    out.push(`Yours returned ${d.gotCount} ${d.gotCount === 1 ? 'row' : 'rows'}; the model returned ${d.wantCount}.`)
  } else out.push(`Both return ${d.gotCount} ${d.gotCount === 1 ? 'row' : 'rows'}, but not the same ones.`)
  if (columnsDiffer) out.push('The columns are different too: check which columns you select, and their order.')
  if (d.extraN) out.push(`Rows you have that the model does not: ${d.extra.map(r => `(${r})`).join(' ')}${d.extraN > 3 ? ' and more' : ''}.`)
  if (d.missingN) out.push(`Rows the model has that you are missing: ${d.missing.map(r => `(${r})`).join(' ')}${d.missingN > 3 ? ' and more' : ''}.`)
  return out
}

const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/;\s*$/, '').trim().toLowerCase()
export const sameSql = (a: string, b: string) => norm(a) === norm(b)

/** Tables a query mentions, in schema order. */
export function tablesIn(sql: string, names: string[]): string[] {
  return names.filter(n => new RegExp('\\b' + n + '\\b', 'i').test(sql))
}
