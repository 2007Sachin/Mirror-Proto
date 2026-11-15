// Pure query-to-stages engine for the Query Explainer. No React.
// buildStages(sql) splits one SELECT into logical stages; runStages(db, stages) runs progressive probes on the sample DB
// to fill every stage with REAL rows. Callers: QueryExplainer.tsx, stages.test.ts.
// Only the given SELECT/WITH text (and pieces cut from it) is ever executed.
import type { Database } from 'sql.js'

export type Cell = string | number | null
export type Flag = 'keep' | 'drop' | 'dup' | 'nomatch'
export interface RowSet { rows: Cell[][]; total: number; more: number; flags?: Flag[]; from?: number[] }
export interface TableSet { name: string; columns: string[]; rowset: RowSet }
export interface Bucket { label: string; count: number; badge: string; kept: boolean; members: { row: Cell[]; from: number }[]; more: number }
export interface Pick { expr: string; name: string; window: boolean }
export interface JoinInfo { type: string; matched: number; unmatched: number; duplicated: number; left: number; out: number }
export type StageKind = 'source' | 'cte' | 'setop' | 'join' | 'where' | 'group' | 'having' | 'select' | 'distinct' | 'order' | 'limit'

export interface Stage {
  id: string
  kind: StageKind
  chip: string
  title: string
  caption: string
  sql: string
  full: string
  clause?: string
  columns: string[]
  inCols?: string[]
  before: RowSet
  after: RowSet
  tables?: TableSet[]
  buckets?: Bucket[]
  reason?: string
  picks?: Pick[]
  windowCols?: number[]
  join?: JoinInfo
  iterations?: number
  recursive?: boolean
  _run?: (db: Database, st: RunState, out: Stage) => void
}

interface Data { cols: string[]; rows: Cell[][] }
interface RunState { cur: Data | null; fromRows: Data[]; buckets: Bucket[]; hav: Map<string, boolean>; widths: number[] }

export const CAP = 12
const FORBIDDEN = /\b(insert|update|delete|drop|alter|create|replace|pragma|attach|detach|vacuum|reindex)\b/i
const empty = (): RowSet => ({ rows: [], total: 0, more: 0 })

// ---------- text helpers ----------
const short = (s: string, n = 44) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '...' : t }
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
const fmt = (v: Cell) => (v === null ? 'NULL' : typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 100) / 100) : String(v))
const jk = (v: unknown) => JSON.stringify(v)

// Blank comments; `top` also blanks quoted text and everything inside parentheses, so keyword search only sees the top level.
function scan(sql: string) {
  let text = '', top = '', depth = 0, i = 0
  while (i < sql.length) {
    const c = sql[i], n = sql[i + 1]
    if (c === '-' && n === '-') { while (i < sql.length && sql[i] !== '\n') { text += ' '; top += ' '; i++ } continue }
    if (c === '/' && n === '*') { const e = sql.indexOf('*/', i + 2), end = e < 0 ? sql.length : e + 2; text += ' '.repeat(end - i); top += ' '.repeat(end - i); i = end; continue }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1
      while (j < sql.length) { if (sql[j] === c) { if (sql[j + 1] === c) { j += 2; continue } break } j++ }
      const end = Math.min(j + 1, sql.length)
      text += sql.slice(i, end); top += '_'.repeat(end - i); i = end; continue
    }
    text += c
    if (c === '(') { top += depth === 0 ? '(' : ' '; depth++ }
    else if (c === ')') { depth = Math.max(0, depth - 1); top += depth === 0 ? ')' : ' ' }
    else top += depth ? ' ' : c
    i++
  }
  const s = text.search(/\S/), e = text.replace(/[\s;]+$/, '').length
  if (s < 0 || e <= s) return { text: '', top: '' }
  return { text: text.slice(s, e), top: top.slice(s, e) }
}

interface Piece { text: string; top: string; sep: string; start: number; end: number }
function splitTop(text: string, top: string, sep: RegExp): Piece[] {
  const re = new RegExp(sep.source, 'gi')
  const out: Piece[] = []
  let last = 0, lastSep = ''
  for (const m of top.matchAll(re)) {
    out.push({ text: text.slice(last, m.index), top: top.slice(last, m.index), sep: lastSep, start: last, end: m.index })
    last = m.index + m[0].length; lastSep = m[0]
  }
  out.push({ text: text.slice(last), top: top.slice(last), sep: lastSep, start: last, end: text.length })
  return out
}

// ---------- parsing ----------
interface Item { text: string; expr: string; name: string; agg: boolean; win: boolean }
interface Ref { raw: string; kw: string; name: string; alias: string; body?: string; on?: string; end: number }
interface Core {
  distinct: boolean; items: Item[]; itemsText: string; from: string; refs: Ref[]
  where?: string; group: string[]; having?: string; order?: string; limit?: string
}

function parseCore(text: string, top: string): Core | null {
  const marks: { k: string; s: number; e: number }[] = []
  for (const m of top.matchAll(/\b(SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b/gi))
    marks.push({ k: m[1].toUpperCase().replace(/\s+/g, ' '), s: m.index, e: m.index + m[0].length })
  if (!marks.length || marks[0].k !== 'SELECT') return null
  const part = (k: string) => {
    const i = marks.findIndex(m => m.k === k)
    if (i < 0) return null
    const end = i + 1 < marks.length ? marks[i + 1].s : text.length
    return { t: text.slice(marks[i].e, end).trim(), s: marks[i].e, e: end }
  }
  const sel = part('SELECT')!
  let itemsText = sel.t
  let distinct = false
  const dm = /^\s*(DISTINCT|ALL)\b/i.exec(text.slice(sel.s, sel.e))
  if (dm) { distinct = /distinct/i.test(dm[1]); itemsText = text.slice(sel.s + dm[0].length, sel.e).trim() }
  const off = text.slice(sel.s, sel.e).indexOf(itemsText)
  const base = sel.s + Math.max(0, off)
  const items: Item[] = splitTop(itemsText, top.slice(base, base + itemsText.length), /,/).map(p => {
    const t = p.text.trim()
    const am = /^([\s\S]*?)\s+as\s+("?)(\w+)\2\s*$/i.exec(t)
    const win = /\bover\b/i.test(p.top)
    return { text: t, expr: am ? am[1] : t, name: am ? am[3] : t, win, agg: !win && /\b(count|sum|avg|min|max|total|group_concat)\s*\(/i.test(p.top) }
  })
  const fromP = part('FROM')
  const refs: Ref[] = []
  if (fromP) {
    const ftext = text.slice(fromP.s, fromP.e), ftop = top.slice(fromP.s, fromP.e)
    const lead = ftext.length - ftext.trimStart().length
    const pieces = splitTop(ftext, ftop, /,|\b(?:NATURAL\s+)?(?:(?:LEFT|RIGHT|FULL)(?:\s+OUTER)?|INNER|CROSS)?\s*JOIN\b/)
    for (const p of pieces) {
      const onm = /\b(ON|USING)\b/i.exec(p.top)
      const refText = (onm ? p.text.slice(0, onm.index) : p.text).trim()
      const on = onm ? p.text.slice(onm.index + onm[0].length).trim() : undefined
      const refTop = (onm ? p.top.slice(0, onm.index) : p.top).trim()
      let name = '', alias = '', body: string | undefined
      if (refText.startsWith('(')) {
        const close = refTop.indexOf(')')
        body = refText.slice(1, close)
        alias = (/^\s*(?:as\s+)?(\w+)/i.exec(refText.slice(close + 1)) || [])[1] || 'subquery'
        name = alias
      } else {
        const w = refText.split(/\s+/)
        name = w[0].replace(/["`]/g, '')
        const rest = w.slice(1).filter(x => x.toLowerCase() !== 'as')
        alias = (rest[0] || name).replace(/["`]/g, '')
      }
      refs.push({ raw: p.text, kw: p.sep.trim().replace(/\s+/g, ' ').toUpperCase(), name, alias, body, on, end: p.end - lead })
    }
    if (refs.length) refs[refs.length - 1].end = ftext.trim().length
  }
  const g = part('GROUP BY')
  const group = g ? splitTop(g.t, top.slice(g.s + (text.slice(g.s, g.e).indexOf(g.t)), g.s + text.slice(g.s, g.e).indexOf(g.t) + g.t.length), /,/).map(p => p.text.trim()).filter(Boolean) : []
  return {
    distinct, items, itemsText, from: fromP ? text.slice(fromP.s, fromP.e).trim() : '', refs,
    where: part('WHERE')?.t, group, having: part('HAVING')?.t, order: part('ORDER BY')?.t, limit: part('LIMIT')?.t,
  }
}

// ---------- running ----------
function q(db: Database, sql: string): Data {
  const r = db.exec(sql)[0]
  return r ? { cols: r.columns, rows: r.values as Cell[][] } : { cols: [], rows: [] }
}
const setOf = (rows: Cell[][], flags?: Flag[], from?: number[]): RowSet => {
  const out: RowSet = { rows: rows.slice(0, CAP), total: rows.length, more: Math.max(0, rows.length - CAP) }
  if (flags) out.flags = flags.slice(0, CAP)
  if (from) out.from = from.slice(0, CAP)
  return out
}
// Choose up to `cap` row indexes, mixing kept and dropped so a filter is visible even when the first rows all look alike.
function pick(keep: boolean[], cap = CAP): number[] {
  if (keep.length <= cap) return keep.map((_, i) => i)
  const k: number[] = [], d: number[] = []
  keep.forEach((v, i) => (v ? k : d).push(i))
  const takeD = Math.min(d.length, Math.max(cap - k.length, Math.min(4, d.length)), cap - Math.min(k.length, cap - 4 > 0 ? 1 : 0))
  const takeK = Math.min(k.length, cap - takeD)
  return [...k.slice(0, takeK), ...d.slice(0, cap - takeK)].sort((a, b) => a - b)
}
// Match each after-row to a before-row by content (first unused), for stable sorts, distinct and limit.
function align(before: Cell[][], after: Cell[][]): number[] {
  const q2 = new Map<string, number[]>()
  before.forEach((r, i) => { const k = jk(r); (q2.get(k) ?? q2.set(k, []).get(k)!).push(i) })
  return after.map(r => q2.get(jk(r))?.shift() ?? -1)
}
const dispFrom = (from: number[]) => from.map(i => (i >= 0 && i < CAP ? i : -1))
const labels = (refs: Ref[], k: number, raw: string[], widths: number[]): string[] => {
  if (refs.length < 2 || widths.slice(0, k + 1).reduce((a, b) => a + b, 0) !== raw.length) return raw
  const out: string[] = []
  refs.slice(0, k + 1).forEach((r, i) => { for (let c = 0; c < widths[i]; c++) out.push(`${r.alias}.${raw[out.length]}`) })
  return out
}

// ---------- building ----------
export function buildStages(input: string): Stage[] {
  const { text, top } = scan(input)
  if (!text || !/^(select|with)\b/i.test(text) || FORBIDDEN.test(text) || top.includes(';')) return []
  const full = text
  let n = 0
  const mk = (kind: StageKind, chip: string, title: string, sql: string, extra: Partial<Stage> = {}): Stage => ({
    id: `${kind}-${n++}`, kind, chip, title, caption: title, sql, full, columns: [], before: empty(), after: empty(), ...extra,
  })
  try {
    const stages = plan(text, top, mk)
    if (stages.length >= 2) return stages
    return [...stages, mk('select', 'RESULT', 'Result', full)]
  } catch {
    return degraded(full, mk)
  }
}

type Mk = (kind: StageKind, chip: string, title: string, sql: string, extra?: Partial<Stage>) => Stage

// Exotic query: show the tables it names, then the final result. ponytail: no per-clause breakdown for these.
function degraded(full: string, mk: Mk): Stage[] {
  const names = [...new Set([...full.matchAll(/\b(?:from|join)\s+([a-z_]\w*)/gi)].map(m => m[1]))]
  const src = mk('source', 'FROM', 'The tables', full)
  src._run = (db, st, out) => {
    out.tables = names.flatMap(nm => { try { const d = q(db, `SELECT * FROM ${nm}`); return [{ name: nm, columns: d.cols, rowset: setOf(d.rows) }] } catch { return [] } })
    out.caption = out.tables.length ? `The query starts from ${out.tables.map(t => `${t.name} (${plural(t.rowset.total, 'row')})`).join(' and ')}.` : 'The query reads no table.'
    st.cur = null
  }
  const fin = mk('select', 'RESULT', 'Result', full)
  fin._run = (db, _st, out) => { const d = q(db, full); out.columns = d.cols; out.after = setOf(d.rows); out.caption = `The query returns ${plural(d.rows.length, 'row')}.` }
  return [src, fin]
}

function plan(text: string, top: string, mk: Mk): Stage[] {
  const stages: Stage[] = []
  let prefix = ''
  let mainText = text, mainTop = top
  // WITH name AS (...), ...
  const wm = /^with\s+(recursive\s+)?/i.exec(text)
  if (wm) {
    const rec = !!wm[1]
    let pos = wm[0].length
    const raws: string[] = []
    for (;;) {
      const m = /^\s*(\w+)\s*(\([^)]*\))?\s*as\s*(?:not\s+materialized\s*|materialized\s*)?\(/i.exec(text.slice(pos))
      if (!m) throw new Error('cte')
      const open = pos + m[0].length - 1
      const close = top.indexOf(')', open)
      if (close < 0) throw new Error('cte')
      const raw = text.slice(pos, close + 1).trim()
      raws.push(raw)
      const name = m[1]
      const pre = `WITH ${rec ? 'RECURSIVE ' : ''}${raws.join(', ')} `
      const st = mk('cte', `WITH ${name}`, `${rec ? 'Recursive ' : ''}${name}`, `SELECT * FROM ${name}`, { recursive: rec, clause: short(text.slice(open + 1, close), 120) })
      st._run = (db, _s, out) => {
        const d = q(db, `${pre}SELECT * FROM ${name}`)
        out.columns = d.cols; out.after = setOf(d.rows)
        out.tables = [{ name, columns: d.cols, rowset: out.after }]
        if (rec) {
          const c = d.cols.findIndex(x => /^(level|lvl|depth|n|i|step|gen|day|d)$/i.test(x))
          if (c >= 0) out.iterations = new Set(d.rows.map(r => r[c])).size
        }
        out.caption = rec
          ? `${name} repeats its recursive step until no new rows appear${out.iterations ? ` (${plural(out.iterations, 'round')})` : ''}, ending with ${plural(d.rows.length, 'row')}.`
          : `${name} is worked out first: ${plural(d.rows.length, 'row')}, ready for the main query.`
      }
      stages.push(st)
      pos = close + 1
      const after = /^\s*,/.exec(text.slice(pos))
      if (after) { pos += after[0].length; continue }
      prefix = pre
      break
    }
    mainText = text.slice(pos).trim(); mainTop = top.slice(pos).trim()
  }

  // set operations
  const segs = splitTop(mainText, mainTop, /\b(?:UNION\s+ALL|UNION|INTERSECT|EXCEPT)\b/)
  if (segs.length > 1) {
    const ops = segs.slice(1).map(s => s.sep.trim().replace(/\s+/g, ' ').toUpperCase())
    const st = mk('setop', ops[0], `${[...new Set(ops)].join(' / ')} the queries`, mainText)
    st._run = (db, _s, out) => {
      out.tables = segs.map((s, i) => { const d = q(db, prefix + s.text); return { name: `Query ${i + 1}`, columns: d.cols, rowset: setOf(d.rows) } })
      const d = q(db, prefix + mainText)
      out.columns = d.cols; out.after = setOf(d.rows)
      const sizes = out.tables.map(t => t.rowset.total)
      const op = ops[0]
      out.caption = `${op} joins ${sizes.join(' and ')} rows into ${plural(d.rows.length, 'row')}${/UNION$/.test(op) ? ', dropping repeats' : op === 'UNION ALL' ? ', keeping every row' : op === 'INTERSECT' ? ', keeping only rows in both' : ', keeping rows only in the first'}.`
    }
    stages.push(st)
    return stages
  }

  const core = parseCore(mainText, mainTop)
  if (!core) throw new Error('core')
  return [...stages, ...coreStages(core, prefix, mk)]
}

function coreStages(core: Core, prefix: string, mk: Mk): Stage[] {
  const out: Stage[] = []
  const { refs, items } = core
  const fromEnd = (k: number) => core.from.slice(0, refs[k].end)
  const probeFrom = (k: number) => `${prefix}SELECT * FROM ${fromEnd(k)}`
  const wh = core.where ? ` WHERE ${core.where}` : ''

  // sub-selects in FROM get their own stage first
  refs.forEach(r => {
    if (!r.body) return
    const st = mk('cte', `FROM ${r.alias}`, `Subquery ${r.alias}`, `SELECT * FROM (${r.body})`, { clause: short(r.body, 120) })
    st._run = (db, _s, o) => {
      const d = q(db, `${prefix}SELECT * FROM (${r.body})`)
      o.columns = d.cols; o.after = setOf(d.rows); o.tables = [{ name: r.alias, columns: d.cols, rowset: o.after }]
      o.caption = `The inner query behind ${r.alias} returns ${plural(d.rows.length, 'row')} first.`
    }
    out.push(st)
  })

  if (refs.length) {
    const st = mk('source', 'FROM', `Read ${refs.map(r => r.alias).join(', ')}`, `SELECT * FROM ${fromEnd(refs.length - 1)}`, { clause: `FROM ${short(core.from, 100)}` })
    st._run = (db, s, o) => {
      const widths: number[] = []
      o.tables = refs.map(r => {
        const d = q(db, `${prefix}SELECT * FROM ${r.body ? `(${r.body})` : r.name}`)
        widths.push(d.cols.length)
        return { name: r.alias === r.name ? r.name : `${r.name} ${r.alias}`, columns: d.cols, rowset: setOf(d.rows) }
      })
      s.widths = widths
      const first = q(db, `${prefix}SELECT * FROM ${core.from.slice(0, refs[0].end)}`)
      s.fromRows = [{ cols: labels(refs, 0, first.cols, widths), rows: first.rows }]
      s.cur = s.fromRows[0]
      o.columns = first.cols; o.after = o.tables[0].rowset
      o.caption = `FROM reads ${o.tables.map(t => `${t.name} (${plural(t.rowset.total, 'row')})`).join(' and ')}.`
    }
    out.push(st)
  }

  refs.forEach((r, k) => {
    if (k === 0) return
    const kindWord = r.kw === ',' ? 'Comma join' : r.kw
    const st = mk('join', r.kw === ',' ? 'JOIN' : r.kw.replace(/ JOIN$/, '') === 'JOIN' ? 'JOIN' : r.kw, `${kindWord} ${r.alias}`, probeFrom(k), { clause: short(`${r.kw} ${r.raw.trim()}`, 120) })
    st._run = (db, s, o) => {
      const widths = s.widths
      const left = s.fromRows[k - 1]
      const res = q(db, probeFrom(k))
      const lw = left.cols.length
      const cols = labels(refs, k, res.cols, widths)
      const outRows = res.rows
      const keyOf = (r2: Cell[]) => jk(r2.slice(0, lw))
      const counts = new Map<string, number>()
      outRows.forEach(r2 => counts.set(keyOf(r2), (counts.get(keyOf(r2)) ?? 0) + 1))
      const outer = /LEFT|FULL/.test(r.kw)
      const noMatch = outRows.map(r2 => outer && r2.length > lw && r2.slice(lw).every(v => v === null))
      const leftIdx = new Map<string, number>()
      left.rows.forEach((r2, i) => { if (!leftIdx.has(jk(r2))) leftIdx.set(jk(r2), i) })
      const unmatchedLeft = outer ? noMatch.filter(Boolean).length : left.rows.filter(r2 => !counts.has(jk(r2))).length
      const dupKeys = [...counts.entries()].filter(([key, c]) => c > 1 && !(outer && noMatch.some((nm, i) => nm && keyOf(outRows[i]) === key))).length
      const matched = left.rows.length - unmatchedLeft
      o.join = { type: kindWord, matched, unmatched: unmatchedLeft, duplicated: dupKeys, left: left.rows.length, out: outRows.length }
      // display: the first rows of the result, the left rows they came from, then a few left rows that matched nothing
      const shown = outRows.slice(0, CAP)
      const srcIdx = shown.map(r2 => leftIdx.get(keyOf(r2)) ?? -1)
      const order: number[] = []
      srcIdx.forEach(i => { if (i >= 0 && !order.includes(i)) order.push(i) })
      const lostIdx = outer ? [] : left.rows.map((r2, i) => (counts.has(jk(r2)) ? -1 : i)).filter(i => i >= 0)
      lostIdx.forEach(i => { if (order.length < CAP) order.push(i) })
      o.before = { rows: order.map(i => left.rows[i]), total: left.rows.length, more: Math.max(0, left.rows.length - order.length), flags: order.map(i => (counts.has(jk(left.rows[i])) || outer ? 'keep' : 'drop')) }
      o.after = { rows: shown, total: outRows.length, more: Math.max(0, outRows.length - shown.length),
        flags: shown.map((r2, i) => (noMatch[i] ? 'nomatch' : (counts.get(keyOf(r2)) ?? 0) > 1 ? 'dup' : 'keep')),
        from: srcIdx.map(i => order.indexOf(i)) }
      o.columns = cols
      o.reason = 'no match'
      const grow = outRows.length - (outer ? left.rows.length : matched)
      o.caption = `${kindWord} ${r.alias}: ${matched} of ${plural(left.rows.length, 'row')} found a match${unmatchedLeft ? (outer ? `; ${unmatchedLeft} kept with empty ${r.alias} fields` : `; ${unmatchedLeft} had no match and left`) : ''}${dupKeys ? `. ${plural(dupKeys, 'row')} matched more than once, so the result grows to ${outRows.length} rows` : ''}.`
      void grow
      s.fromRows[k] = { cols, rows: outRows }
      s.cur = s.fromRows[k]
    }
    out.push(st)
  })

  const fromAll = refs.length ? fromEnd(refs.length - 1) : ''
  if (core.where && refs.length) {
    const st = mk('where', 'WHERE', 'Keep matching rows', `SELECT * FROM ${fromAll}${wh}`, { clause: `WHERE ${short(core.where, 100)}`, reason: short(core.where, 30) })
    st._run = (db, s, o) => {
      const res = q(db, `${prefix}SELECT CASE WHEN (${core.where}) THEN 1 ELSE 0 END, * FROM ${fromAll}`)
      const keep = res.rows.map(r2 => r2[0] === 1)
      const rows = res.rows.map(r2 => r2.slice(1))
      const cols = s.cur && s.cur.cols.length === res.cols.length - 1 ? s.cur.cols : res.cols.slice(1)
      const bi = pick(keep)
      const keptIdx = keep.flatMap((v, i) => (v ? [i] : []))
      const posOf = new Map(bi.map((v, p) => [v, p]))
      o.before = { rows: bi.map(i => rows[i]), total: rows.length, more: Math.max(0, rows.length - bi.length), flags: bi.map(i => (keep[i] ? 'keep' : 'drop')) }
      const kr = keptIdx.map(i => rows[i])
      o.after = { ...setOf(kr), flags: kr.slice(0, CAP).map(() => 'keep' as Flag), from: keptIdx.slice(0, CAP).map(i => posOf.get(i) ?? -1) }
      o.columns = cols
      const kept = kr.length, tot = rows.length
      o.caption = `WHERE ${short(core.where!, 40)} keeps ${kept === tot ? `all ${tot}` : kept === 0 ? `none of the ${tot}` : `${kept} of ${tot}`} rows${kept < tot ? ` and drops ${tot - kept}` : ''}.`
      s.cur = { cols, rows: kr }
    }
    out.push(st)
  }

  // grouping: explicit GROUP BY, or aggregates with no GROUP BY (one group for everything)
  const aggItems = items.filter(i => i.agg)
  const grouped = refs.length > 0 && (core.group.length > 0 || aggItems.length > 0 || !!core.having)
  const gs = core.group.map(g => {
    if (/^\d+$/.test(g)) return items[Number(g) - 1]?.expr ?? g
    const byAlias = items.find(i => i.name === g && i.expr !== g)
    return byAlias ? byAlias.expr : g
  })
  if (grouped) {
    const keysSql = gs.map(g => `(${g})`)
    const st = mk('group', 'GROUP BY', gs.length ? `Group by ${short(core.group.join(', '), 30)}` : 'Collapse into one group', `SELECT * FROM ${fromAll}${wh}`, { clause: core.group.length ? `GROUP BY ${short(core.group.join(', '), 90)}` : undefined })
    st._run = (db, s, o) => {
      const mem = q(db, `${prefix}SELECT ${[...keysSql, '*'].join(', ')} FROM ${fromAll}${wh}`)
      const nk = gs.length
      const before = s.cur?.rows ?? mem.rows.map(r2 => r2.slice(nk))
      const hflag = core.having ? `CASE WHEN (${core.having}) THEN 1 ELSE 0 END` : '1'
      const agg = q(db, `${prefix}SELECT ${[...aggItems.map(i => i.expr), hflag, ...keysSql].join(', ')} FROM ${fromAll}${wh}${gs.length ? ` GROUP BY ${gs.join(', ')}` : ''}`)
      const na = aggItems.length
      const info = new Map<string, Cell[]>()
      agg.rows.forEach(r2 => info.set(jk(r2.slice(na + 1)), r2.slice(0, na + 1)))
      const buckets = new Map<string, Bucket>()
      mem.rows.forEach((r2, i) => {
        const key = jk(r2.slice(0, nk))
        let b = buckets.get(key)
        if (!b) { b = { label: nk ? r2.slice(0, nk).map(fmt).join(', ') : 'all rows', count: 0, badge: '', kept: true, members: [], more: 0 }; buckets.set(key, b) }
        b.count++
        if (b.members.length < 4) b.members.push({ row: r2.slice(nk), from: i < CAP ? i : -1 }); else b.more++
      })
      if (!nk && !buckets.size) buckets.set('[]', { label: 'all rows', count: 0, badge: '', kept: true, members: [], more: 0 })
      s.hav = new Map()
      buckets.forEach((b, key) => {
        const v = info.get(key)
        b.badge = v && na ? aggItems.slice(0, 2).map((it, i) => `${short(it.name, 20)} = ${fmt(v[i])}`).join(' | ') : plural(b.count, 'row')
        b.kept = !v || v[na] === 1
        s.hav.set(key, b.kept)
      })
      const all = [...buckets.values()]
      s.buckets = all
      o.buckets = all.slice(0, CAP)
      const cols = [...core.group.map(g => short(g, 16)), 'rows']
      const summary = all.map(b => [...(b.label === 'all rows' && !nk ? [] : b.label.split(', ')), b.count] as Cell[])
      o.columns = cols
      o.before = { ...setOf(before), flags: before.slice(0, CAP).map(() => 'keep' as Flag) }
      o.after = setOf(summary.map(r2 => (nk ? r2 : [r2[r2.length - 1]])))
      o.caption = nk
        ? `GROUP BY ${short(core.group.join(', '), 30)} puts ${plural(before.length, 'row')} into ${plural(all.length, 'group')}${na ? ', each with its own running ' + aggItems.slice(0, 2).map(i => short(i.name, 18)).join(' and ') : ''}.`
        : `The aggregate collapses all ${plural(before.length, 'row')} into one group.`
      s.cur = { cols, rows: all.map(b => [...(nk ? b.label.split(', ') : []), b.count]) }
    }
    out.push(st)

    if (core.having) {
      const hv = mk('having', 'HAVING', 'Keep matching groups', `SELECT * FROM ${fromAll}${wh} GROUP BY ${gs.join(', ')} HAVING ${core.having}`, { clause: `HAVING ${short(core.having, 100)}`, reason: short(core.having, 30) })
      hv._run = (_db, s, o) => {
        const all = s.buckets
        const kept = all.filter(b => b.kept)
        o.buckets = all.slice(0, CAP)
        o.before = setOf(all.map(b => [b.label, b.count]))
        o.after = setOf(kept.map(b => [b.label, b.count]))
        o.columns = ['group', 'rows']
        o.caption = `HAVING ${short(core.having!, 40)} keeps ${kept.length === all.length ? `all ${all.length}` : `${kept.length} of ${all.length}`} groups${kept.length < all.length ? ` and drops ${all.length - kept.length}` : ''}.`
        const cols = s.cur?.cols ?? []
        const rows = s.cur ? s.cur.rows.filter((_r, i) => all[i]?.kept) : []
        s.cur = { cols, rows }
      }
      out.push(hv)
    }
  }

  // projection
  const selectSql = (o: { distinct?: boolean; order?: boolean; limit?: boolean }) =>
    `SELECT ${o.distinct && core.distinct ? 'DISTINCT ' : ''}${core.itemsText}${refs.length ? ` FROM ${fromAll}` : ''}${wh}${core.group.length ? ` GROUP BY ${core.group.join(', ')}` : ''}${core.having ? ` HAVING ${core.having}` : ''}${o.order && core.order ? ` ORDER BY ${core.order}` : ''}${o.limit && core.limit ? ` LIMIT ${core.limit}` : ''}`
  const picks: Pick[] = items.map(i => ({ expr: short(i.expr, 40), name: short(i.name, 24), window: i.win }))
  const sel = mk('select', 'SELECT', 'Pick the output columns', selectSql({}), { clause: `SELECT ${short(core.itemsText, 100)}`, picks })
  sel._run = (db, s, o) => {
    const res = q(db, prefix + selectSql({}))
    const before = s.cur?.rows ?? []
    o.columns = res.cols
    o.windowCols = items.flatMap((i, c) => (i.win ? [c] : []))
    o.before = { ...setOf(before), flags: before.slice(0, CAP).map(() => 'keep' as Flag) }
    const same = before.length === res.rows.length
    o.after = setOf(res.rows, undefined, res.rows.map((_r, j) => (same && j < CAP ? j : -1)))
    const w = o.windowCols.map(c => res.cols[c])
    o.caption = `SELECT keeps ${plural(res.cols.length, 'column')} (${short(res.cols.join(', '), 40)})${grouped ? ', one row per group' : ''}.${w.length ? ` ${w.join(', ')} ${w.length === 1 ? 'is a window column, worked out' : 'are window columns, worked out'} for every row without merging them.` : ''}`
    s.cur = { cols: res.cols, rows: res.rows }
  }
  out.push(sel)

  if (core.distinct) {
    const st = mk('distinct', 'DISTINCT', 'Remove repeated rows', selectSql({ distinct: true }), { clause: 'DISTINCT' })
    st._run = (db, s, o) => {
      const d = q(db, prefix + selectSql({ distinct: true }))
      const rows = s.cur!.rows
      const seen = new Set<string>()
      const keep = rows.map(r2 => { const k = jk(r2); const f = !seen.has(k); seen.add(k); return f })
      const bi = pick(keep)
      o.columns = d.cols
      o.before = { rows: bi.map(i => rows[i]), total: rows.length, more: Math.max(0, rows.length - bi.length), flags: bi.map(i => (keep[i] ? 'keep' : 'drop')) }
      const pos = new Map(bi.map((v, p) => [v, p]))
      const fi = keep.flatMap((v, i) => (v ? [i] : []))
      o.after = setOf(d.rows, undefined, fi.slice(0, CAP).map(i => pos.get(i) ?? -1))
      o.reason = 'repeat'
      o.caption = rows.length === d.rows.length ? `DISTINCT finds no repeats: all ${rows.length} rows stay.` : `DISTINCT removes ${plural(rows.length - d.rows.length, 'repeated row')}, leaving ${d.rows.length}.`
      s.cur = { cols: d.cols, rows: d.rows }
    }
    out.push(st)
  }

  if (core.order) {
    const st = mk('order', 'ORDER BY', 'Sort the rows', selectSql({ distinct: true, order: true }), { clause: `ORDER BY ${short(core.order, 100)}` })
    st._run = (db, s, o) => {
      const d = q(db, prefix + selectSql({ distinct: true, order: true }))
      const rows = s.cur!.rows
      o.columns = d.cols
      o.before = { ...setOf(rows), flags: rows.slice(0, CAP).map(() => 'keep' as Flag) }
      o.after = setOf(d.rows, undefined, dispFrom(align(rows, d.rows)))
      o.caption = `ORDER BY ${short(core.order!, 40)} puts the ${plural(rows.length, 'row')} in order. It changes the order only, not which rows stay.`
      s.cur = { cols: d.cols, rows: d.rows }
    }
    out.push(st)
  }

  if (core.limit) {
    const st = mk('limit', 'LIMIT', 'Take the first rows', selectSql({ distinct: true, order: true, limit: true }), { clause: `LIMIT ${core.limit}`, reason: 'past the limit' })
    st._run = (db, s, o) => {
      const d = q(db, prefix + selectSql({ distinct: true, order: true, limit: true }))
      const rows = s.cur!.rows
      o.columns = d.cols
      o.before = { ...setOf(rows), flags: rows.slice(0, CAP).map((_r, i) => (i < d.rows.length ? 'keep' : 'drop') as Flag) }
      o.after = { ...setOf(d.rows), flags: d.rows.slice(0, CAP).map(() => 'keep' as Flag), from: dispFrom(align(rows, d.rows)).slice(0, CAP) }
      o.caption = d.rows.length < rows.length ? `LIMIT ${core.limit} keeps the first ${d.rows.length} of ${rows.length} rows.` : `LIMIT ${core.limit} is larger than the ${rows.length} rows, so all stay.`
      s.cur = { cols: d.cols, rows: d.rows }
    }
    out.push(st)
  }
  return out
}

export function runStages(db: Database, stages: Stage[]): Stage[] {
  if (!stages.length) return []
  const full = stages[0].full
  const st: RunState = { cur: null, fromRows: [], buckets: [], hav: new Map(), widths: [] }
  const done: Stage[] = []
  for (const s of stages) {
    const o: Stage = { ...s }
    o.inCols = st.cur?.cols
    try { o._run?.(db, st, o); done.push(o) } catch {  /* skip a stage whose probe cannot run; the rest still explain the query */ }
  }
  let res: Stage[] = done
  // The last stage always shows the real result of the original query.
  try {
    const fin = q(db, full)
    if (!res.length) throw new Error('none')
    const last = res[res.length - 1]
    res = [...res.slice(0, -1), { ...last, columns: fin.cols, after: { ...last.after, rows: fin.rows.slice(0, CAP), total: fin.rows.length, more: Math.max(0, fin.rows.length - CAP) } }]
    if (res.length < 2) throw new Error('short')
  } catch {
    const d = degraded(full, (kind, chip, title, sql, extra = {}) => ({ id: kind, kind, chip, title, caption: title, sql, full, columns: [], before: empty(), after: empty(), ...extra }))
    const st2: RunState = { cur: null, fromRows: [], buckets: [], hav: new Map(), widths: [] }
    res = d.map(s => { const o = { ...s }; try { o._run?.(db, st2, o) } catch { /* fall through with empty data */ } return o })
  }
  return res
}
