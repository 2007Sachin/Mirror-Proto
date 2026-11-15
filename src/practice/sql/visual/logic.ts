// Pure logic behind the SQL scenes: no React, no sql.js. Every scene renders from these functions.
// Callers: ExecOrder, Nulls, Joins, GroupBy, Windows (this folder) and logic.test.ts.

export type Cell = string | number | null
export interface TRow { key: string | number; cells: Cell[]; tone?: 'ghost' | 'hl'; tint?: number }

/* ---------- three-valued logic ---------- */
export type Tri = 'T' | 'F' | 'U'
type Prim = string | number | boolean | null
export const not3 = (a: Tri): Tri => (a === 'T' ? 'F' : a === 'F' ? 'T' : 'U')
export const and3 = (a: Tri, b: Tri): Tri => (a === 'F' || b === 'F' ? 'F' : a === 'U' || b === 'U' ? 'U' : 'T')
export const or3 = (a: Tri, b: Tri): Tri => (a === 'T' || b === 'T' ? 'T' : a === 'U' || b === 'U' ? 'U' : 'F')
export const eq3 = (a: Prim, b: Prim): Tri => (a === null || b === null ? 'U' : a === b ? 'T' : 'F')
export const ne3 = (a: Prim, b: Prim): Tri => not3(eq3(a, b))
export const in3 = (x: Prim, list: Prim[]): Tri => list.reduce<Tri>((acc, v) => or3(acc, eq3(x, v)), 'F')
export const triFromBool = (b: boolean | null): Tri => (b === null ? 'U' : b ? 'T' : 'F')

export interface NullRow { id: number; name: string; country: string | null; score: number | null; active: boolean | null }
export const NULL_ROWS: NullRow[] = [
  { id: 1, name: 'Asha', country: 'US', score: 10, active: true },
  { id: 2, name: 'Ben', country: 'UK', score: null, active: false },
  { id: 3, name: 'Chen', country: null, score: 30, active: null },
  { id: 4, name: 'Dia', country: 'US', score: 20, active: true },
  { id: 5, name: 'Eli', country: null, score: null, active: null },
  { id: 6, name: 'Fay', country: 'IN', score: 40, active: false },
]

export interface Verdict { label: string; tone: 't' | 'f' | 'u'; why: string }
export interface NullExpr { id: string; sql: string; label: string; note: string; agg: boolean }
export const NULL_EXPRS: NullExpr[] = [
  { id: 'eq-null', sql: 'country = NULL', label: '= NULL', note: 'Is country = NULL ever true? Watch each row.', agg: false },
  { id: 'is-null', sql: 'country IS NULL', label: 'IS NULL', note: 'IS NULL is the right way to ask whether a value is missing.', agg: false },
  { id: 'ne-us', sql: "country <> 'US'", label: "<> 'US'", note: "Who is not in the US? Missing countries are the surprise.", agg: false },
  { id: 'not-in', sql: "country NOT IN ('UK', NULL)", label: 'NOT IN + NULL', note: 'A single NULL inside a NOT IN list changes the whole answer.', agg: false },
  { id: 'and', sql: 'active AND TRUE', label: 'NULL AND TRUE', note: 'NULL AND TRUE is not true and not false: it stays unknown.', agg: false },
  { id: 'count', sql: 'COUNT(*) vs COUNT(country)', label: 'COUNT(*) vs COUNT(col)', note: 'Both count rows, but only one of them looks at the column.', agg: true },
  { id: 'avg', sql: 'AVG(score)', label: 'AVG ignores NULL', note: 'Missing scores are skipped, they do not count as zero.', agg: true },
]

const tri = (t: Tri, why: string): Verdict => ({ label: t === 'T' ? 'TRUE' : t === 'F' ? 'FALSE' : 'UNKNOWN', tone: t === 'T' ? 't' : t === 'F' ? 'f' : 'u', why })

export function evalNullExpr(id: string, rows: NullRow[] = NULL_ROWS): { verdicts: Verdict[]; kept: number[] | null; summary: string } {
  let verdicts: Verdict[] = []
  let kept: number[] | null = null
  let summary = ''
  if (id === 'eq-null') verdicts = rows.map(() => tri('U', 'Anything compared with NULL is unknown, even NULL itself.'))
  else if (id === 'is-null') verdicts = rows.map(r => tri(r.country === null ? 'T' : 'F', r.country === null ? 'The country is missing, so IS NULL is true.' : `${r.country} is present, so IS NULL is false.`))
  else if (id === 'ne-us') verdicts = rows.map(r => tri(ne3(r.country, 'US'), r.country === null ? 'We cannot compare a missing value, so the answer is unknown.' : r.country === 'US' ? 'US is the same as US, so not-equal is false.' : `${r.country} differs from US, so it is true.`))
  else if (id === 'not-in') verdicts = rows.map(r => { const t = not3(in3(r.country, ['UK', null])); return tri(t, r.country === 'UK' ? 'UK is in the list, so NOT IN is false.' : 'The list holds a NULL, so we can never be sure this value is outside it.') })
  else if (id === 'and') verdicts = rows.map(r => tri(and3(triFromBool(r.active), 'T'), r.active === null ? 'Unknown AND true stays unknown.' : r.active ? 'True AND true is true.' : 'False AND true is false.'))
  else if (id === 'count') {
    verdicts = rows.map(r => ({ label: r.country === null ? 'skipped' : 'counted', tone: r.country === null ? 'u' : 't', why: r.country === null ? 'COUNT(country) skips a missing value; COUNT(*) still counts the row.' : 'Both counts include this row.' }))
    summary = `COUNT(*) = ${rows.length} rows, COUNT(country) = ${rows.filter(r => r.country !== null).length} values.`
  } else if (id === 'avg') {
    const vals = rows.filter(r => r.score !== null).map(r => r.score as number)
    verdicts = rows.map(r => ({ label: r.score === null ? 'skipped' : String(r.score), tone: r.score === null ? 'u' : 't', why: r.score === null ? 'A missing score is left out of the average.' : `${r.score} goes into the average.` }))
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    const zeroAvg = vals.reduce((a, b) => a + b, 0) / rows.length
    summary = `AVG(score) = ${+avg.toFixed(1)}, not ${+zeroAvg.toFixed(1)}: the NULLs are skipped, not counted as 0.`
  }
  if (!NULL_EXPRS.find(e => e.id === id)?.agg) kept = rows.map((r, i) => (verdicts[i].tone === 't' ? r.id : -1)).filter(n => n >= 0)
  return { verdicts, kept, summary }
}

/* ---------- joins ---------- */
export type JoinKind = 'inner' | 'left' | 'right' | 'full' | 'anti'
export interface Pair { l: number | null; r: number | null }
export interface JoinStep { left: number | null; matches: number[]; emit: Pair[]; kind: 'match' | 'pad' | 'drop' | 'keep' }

export function joinSteps<L, R>(kind: JoinKind, left: L[], right: R[], on: (l: L, r: R) => boolean): JoinStep[] {
  const steps: JoinStep[] = []
  const rightSeen = new Set<number>()
  left.forEach((l, i) => {
    const matches = right.map((r, j) => (on(l, r) ? j : -1)).filter(j => j >= 0)
    matches.forEach(j => rightSeen.add(j))
    if (matches.length) steps.push(kind === 'anti' ? { left: i, matches, emit: [], kind: 'drop' } : { left: i, matches, emit: matches.map(j => ({ l: i, r: j })), kind: 'match' })
    else if (kind === 'anti') steps.push({ left: i, matches, emit: [{ l: i, r: null }], kind: 'keep' })
    else if (kind === 'left' || kind === 'full') steps.push({ left: i, matches, emit: [{ l: i, r: null }], kind: 'pad' })
    else steps.push({ left: i, matches, emit: [], kind: 'drop' })
  })
  if (kind === 'right' || kind === 'full') right.forEach((_, j) => { if (!rightSeen.has(j)) steps.push({ left: null, matches: [j], emit: [{ l: null, r: j }], kind: 'pad' }) })
  return steps
}
export const computeJoin = <L, R>(kind: JoinKind, left: L[], right: R[], on: (l: L, r: R) => boolean): Pair[] => joinSteps(kind, left, right, on).flatMap(s => s.emit)

/** SUM over the joined rows vs the real sum over each left row once (the fan-out trap). */
export function fanOutSum(pairs: Pair[], value: (l: number) => number): { joined: number; actual: number } {
  const once = new Set<number>()
  let joined = 0
  for (const p of pairs) if (p.l !== null) { joined += value(p.l); once.add(p.l) }
  return { joined, actual: [...once].reduce((a, l) => a + value(l), 0) }
}

export interface Cust { id: number; name: string; credit: number; ref: number | null }
export interface Order { id: number; cust: number; amt: number }
export const CUSTS: Cust[] = [
  { id: 1, name: 'Asha', credit: 100, ref: null }, { id: 2, name: 'Ben', credit: 50, ref: 1 },
  { id: 3, name: 'Chen', credit: 70, ref: 1 }, { id: 4, name: 'Dia', credit: 30, ref: 2 },
]
export const ORDERS: Order[] = [{ id: 101, cust: 1, amt: 40 }, { id: 102, cust: 1, amt: 25 }, { id: 103, cust: 2, amt: 60 }, { id: 104, cust: 9, amt: 15 }]
/** One-to-one view: Asha's second order is left out so nothing fans out. */
export const ORDERS_ONE = ORDERS.filter(o => o.id !== 102)

/* ---------- group by ---------- */
export interface GRow { id: number; cust: string; region: string; amt: number }
export const G_ROWS: GRow[] = [
  { id: 1, cust: 'c1', region: 'N', amt: 40 }, { id: 2, cust: 'c2', region: 'S', amt: 15 }, { id: 3, cust: 'c1', region: 'N', amt: 90 },
  { id: 4, cust: 'c3', region: 'E', amt: 25 }, { id: 5, cust: 'c4', region: 'S', amt: 60 }, { id: 6, cust: 'c5', region: 'N', amt: 10 },
  { id: 7, cust: 'c3', region: 'E', amt: 30 }, { id: 8, cust: 'c4', region: 'S', amt: 35 },
]
export interface Bucket { key: string; rows: GRow[]; count: number; distinct: number; sum: number; keep: boolean }
export function groupBuckets(rows: GRow[], opts: { where?: (r: GRow) => boolean; having?: (b: Bucket) => boolean } = {}): Bucket[] {
  const map = new Map<string, GRow[]>()
  for (const r of rows) if (!opts.where || opts.where(r)) map.set(r.region, [...(map.get(r.region) ?? []), r])
  return [...map].map(([key, rs]) => {
    const b: Bucket = { key, rows: rs, count: rs.length, distinct: new Set(rs.map(r => r.cust)).size, sum: rs.reduce((a, r) => a + r.amt, 0), keep: true }
    b.keep = opts.having ? opts.having(b) : true
    return b
  })
}

/* ---------- query execution order ---------- */
export const LOGICAL = ['FROM', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'DISTINCT', 'ORDER BY', 'LIMIT'] as const
export const EXEC_ROWS: GRow[] = [
  { id: 1, cust: 'c1', region: 'N', amt: 40 }, { id: 2, cust: 'c2', region: 'N', amt: 90 }, { id: 3, cust: 'c3', region: 'S', amt: 15 },
  { id: 4, cust: 'c4', region: 'S', amt: 60 }, { id: 5, cust: 'c5', region: 'E', amt: 25 }, { id: 6, cust: 'c6', region: 'E', amt: 30 },
  { id: 7, cust: 'c7', region: 'W', amt: 120 }, { id: 8, cust: 'c8', region: 'N', amt: 10 }, { id: 9, cust: 'c9', region: 'S', amt: 35 },
  { id: 10, cust: 'c10', region: 'W', amt: 50 },
]
export interface ExecStep { clause: (typeof LOGICAL)[number] | null; caption: string; cols: string[]; rows: TRow[] }
const TINT = [0, 1, 2, 3, 4]
export function execSteps(): ExecStep[] {
  const where = (r: GRow) => r.amt > 20
  const all = groupBuckets(EXEC_ROWS)
  const bs = groupBuckets(EXEC_ROWS, { where, having: b => b.sum > 100 })
  const tintOf = (k: string) => TINT[all.findIndex(b => b.key === k) + 1]
  const raw = (ghost: boolean): TRow[] => EXEC_ROWS.map(r => ({ key: r.id, cells: [r.id, r.region, r.amt], tone: ghost && !where(r) ? 'ghost' : undefined }))
  const bucketRows = (ghostFail: boolean): TRow[] => bs.map(b => ({ key: `b${b.key}`, cells: [b.key, b.count, b.sum], tint: tintOf(b.key), tone: ghostFail && !b.keep ? 'ghost' : undefined }))
  const kept = bs.filter(b => b.keep)
  const ordered = [...kept].sort((a, b) => b.sum - a.sum)
  const sel = (list: typeof kept, cut: boolean): TRow[] => list.map((b, i) => ({ key: `b${b.key}`, cells: [b.key, b.sum], tint: tintOf(b.key), tone: cut && i >= 1 ? 'ghost' : undefined }))
  const clustered: TRow[] = bs.flatMap(b => b.rows.map(r => ({ key: r.id, cells: [r.id, r.region, r.amt] as Cell[], tint: tintOf(b.key) })))
  return [
    { clause: null, caption: 'Here is a query. SQL does not run it top to bottom, so let us watch the real order.', cols: ['id', 'region', 'amt'], rows: [] },
    { clause: 'FROM', caption: 'FROM runs first: it picks the table, so all ten rows appear.', cols: ['id', 'region', 'amt'], rows: raw(false) },
    { clause: 'WHERE', caption: 'WHERE filters single rows. Anything with amt of 20 or less fades out.', cols: ['id', 'region', 'amt'], rows: raw(true) },
    { clause: 'GROUP BY', caption: 'GROUP BY sorts the surviving rows into one bucket per region.', cols: ['id', 'region', 'amt'], rows: clustered },
    { clause: 'GROUP BY', caption: 'Each bucket folds into a single row with its count and total.', cols: ['region', 'rows', 'SUM(amt)'], rows: bucketRows(false) },
    { clause: 'HAVING', caption: 'HAVING filters whole buckets: totals of 100 or less are dropped.', cols: ['region', 'rows', 'SUM(amt)'], rows: bucketRows(true) },
    { clause: 'SELECT', caption: 'Only now does SELECT run, and the alias total is born.', cols: ['region', 'total'], rows: sel(kept, false) },
    { clause: 'ORDER BY', caption: 'ORDER BY sorts the result. It may use the alias because SELECT is done.', cols: ['region', 'total'], rows: sel(ordered, false) },
    { clause: 'LIMIT', caption: 'LIMIT cuts the list to the first row. That is the answer.', cols: ['region', 'total'], rows: sel(ordered, true) },
  ]
}

/* ---------- window functions ---------- */
export type WinFn = 'row_number' | 'rank' | 'dense_rank' | 'lag' | 'sum' | 'avg'
export interface WRow { dept: string; emp: string; sal: number }
export const W_ROWS: WRow[] = [
  { dept: 'Eng', emp: 'Ana', sal: 95 }, { dept: 'Eng', emp: 'Bo', sal: 90 }, { dept: 'Eng', emp: 'Cy', sal: 90 }, { dept: 'Eng', emp: 'Di', sal: 70 },
  { dept: 'Ops', emp: 'Eve', sal: 80 }, { dept: 'Ops', emp: 'Fox', sal: 60 }, { dept: 'Ops', emp: 'Gus', sal: 60 }, { dept: 'Ops', emp: 'Hal', sal: 40 },
]
/** ponytail: without PARTITION BY the table is simply re-sorted by salary (stable); no other ORDER BY options. */
export const orderedRows = (partitioned: boolean): WRow[] => (partitioned ? [...W_ROWS] : [...W_ROWS].sort((a, b) => b.sal - a.sal))

export function windowCompute(fn: WinFn, partitioned: boolean, preceding: number): { rows: WRow[]; values: (number | null)[]; frames: [number, number][] } {
  const rows = orderedRows(partitioned)
  const part = (i: number) => (partitioned ? rows[i].dept : 'all')
  const values: (number | null)[] = []
  const frames: [number, number][] = []
  rows.forEach((row, i) => {
    let ps = i
    while (ps > 0 && part(ps - 1) === part(i)) ps--
    let v: number | null = null
    let f: [number, number] = [i, i]
    if (fn === 'row_number') { v = i - ps + 1; f = [ps, i] }
    else if (fn === 'rank') { let p = i; while (p > ps && rows[p - 1].sal === row.sal) p--; v = p - ps + 1; f = [p, i] }
    else if (fn === 'dense_rank') { v = new Set(rows.slice(ps, i + 1).map(r => r.sal)).size; f = [ps, i] }
    else if (fn === 'lag') { v = i > ps ? rows[i - 1].sal : null; f = [Math.max(ps, i - 1), i] }
    else if (fn === 'sum') { v = rows.slice(ps, i + 1).reduce((a, r) => a + r.sal, 0); f = [ps, i] }
    else { const s = Math.max(ps, i - preceding); const w = rows.slice(s, i + 1); v = +(w.reduce((a, r) => a + r.sal, 0) / w.length).toFixed(2); f = [s, i] }
    values.push(v); frames.push(f)
  })
  return { rows, values, frames }
}
export function groupAvg(): { dept: string; avg: number; n: number }[] {
  return ['Eng', 'Ops'].map(d => { const rs = W_ROWS.filter(r => r.dept === d); return { dept: d, n: rs.length, avg: rs.reduce((a, r) => a + r.sal, 0) / rs.length } })
}
