// Pure layout: turns a stage and a width into absolutely positioned boxes and tokens with a start (x0,y0,o0) and a settled (x1,y1,o1) pose.
// The UI only flips one flag, so every motion is a CSS transform/opacity transition.
import type { Cell, RowSet, Stage } from './stages'

export interface Tok { id: string; row: Cell[]; cols: string[]; x0: number; y0: number; o0: number; x1: number; y1: number; o1: number; w: number; h: number; cls: string; mini?: boolean; focus?: number[]; delay: number }
export interface Box { x: number; y: number; w: number; h: number; title: string; sub?: string; chip?: string; foot?: string; badge?: string; kind: 'in' | 'out' | 'table' | 'bucket'; dropped?: boolean }
export interface Link { x0: number; y0: number; x1: number; y1: number; dup: boolean }
export interface Scene { height: number; boxes: Box[]; toks: Tok[]; links: Link[] }

const GAP = 8, HEAD = 32, FOOT = 22, MINI = 26

export function layout(st: Stage, W: number, compact: boolean): Scene {
  const toks: Tok[] = [], boxes: Box[] = [], links: Link[] = []
  const tokH = compact ? 40 : 54
  const inner = Math.max(120, W)
  const n = Math.max(2, Math.floor((inner + GAP) / (104 + GAP)))
  const tw = Math.floor((inner - (n - 1) * GAP) / n)
  const boxW = tw * n + (n - 1) * GAP
  let y = 0
  const slot = (by: number, i: number) => ({ x: (i % n) * (tw + GAP), y: by + HEAD + Math.floor(i / n) * (tokH + GAP) })
  const heightOf = (rs: RowSet) => HEAD + Math.max(1, Math.ceil(rs.rows.length / n)) * (tokH + GAP) + (rs.more ? FOOT : 0)

  const addBox = (title: string, rs: RowSet, kind: Box['kind'], chip?: string) => {
    const by = y
    boxes.push({ x: 0, y: by, w: boxW, h: heightOf(rs), title, sub: `${rs.total} ${rs.total === 1 ? 'row' : 'rows'}`, chip, foot: rs.more ? `and ${rs.more} more` : undefined, kind })
    y += heightOf(rs) + 12
    return by
  }
  const flagCls = (rs: RowSet, i: number) => (rs.flags?.[i] === 'dup' ? 'dup' : rs.flags?.[i] === 'nomatch' ? 'nomatch' : '')
  const statics = (by: number, rs: RowSet, cols: string[], id: string, focus?: number[]) =>
    rs.rows.forEach((row, i) => {
      const s = slot(by, i)
      toks.push({ id: `${id}${i}`, row, cols, x0: s.x, y0: s.y + 10, o0: 0, x1: s.x, y1: s.y, o1: 1, w: tw, h: tokH, cls: flagCls(rs, i), focus, delay: Math.min(i * 30, 300) })
    })

  const bucketGrid = (bs: NonNullable<Stage['buckets']>, origins: { x: number; y: number }[], cols: string[]): Scene => {
    const heights = bs.map(b => HEAD + b.members.length * (MINI + 4) + (b.more ? 16 : 0) + 30)
    const rowsH: number[] = []
    heights.forEach((h, i) => { const r = Math.floor(i / n); rowsH[r] = Math.max(rowsH[r] ?? 0, h) })
    const rowY: number[] = []
    let acc = y
    rowsH.forEach((h, r) => { rowY[r] = acc; acc += h + GAP })
    bs.forEach((b, i) => {
      const r = Math.floor(i / n), bx = (i % n) * (tw + GAP), byy = rowY[r]
      boxes.push({ x: bx, y: byy, w: tw, h: rowsH[r], title: b.label, sub: `${b.count}`, badge: b.badge, foot: b.more ? `and ${b.more} more` : undefined, kind: 'bucket', dropped: !b.kept })
      b.members.forEach((m, k) => {
        const tx = bx + 8, ty = byy + HEAD + k * (MINI + 4), o = m.from >= 0 ? origins[m.from] : undefined
        toks.push({ id: `m${i}-${k}`, row: m.row, cols, x0: o ? o.x : tx, y0: o ? o.y : ty, o0: o || !origins.length ? 1 : 0, x1: tx, y1: ty, o1: b.kept ? 1 : 0.3, w: tw - 16, h: MINI, cls: '', mini: true, delay: Math.min(i * 40 + k * 20, 300) })
      })
    })
    return { height: Math.max(acc, y), boxes, toks, links }
  }

  if (st.kind === 'source' || st.kind === 'cte' || st.kind === 'setop') {
    (st.tables ?? []).forEach((t, ti) => statics(addBox(t.name, t.rowset, 'table'), t.rowset, t.columns, `t${ti}-`))
    if (st.kind === 'setop') statics(addBox('Result', st.after, 'out'), st.after, st.columns, 'r')
    return { height: y, boxes, toks, links }
  }

  const inCols = st.inCols ?? st.columns
  if (st.kind === 'having') return bucketGrid(st.buckets ?? [], [], inCols)

  const dropped = st.kind === 'join' ? (st.join?.unmatched ?? 0) : Math.max(0, st.before.total - st.after.total)
  const showChip = dropped > 0 && st.kind !== 'order' && st.kind !== 'select'
  const by = addBox(st.kind === 'join' ? 'Left rows' : 'Rows in', st.before, 'in', showChip ? `${dropped} out: ${st.reason ?? 'filtered'}` : undefined)
  const bslot = (i: number) => slot(by, i)
  st.before.rows.forEach((row, i) => {
    const s = bslot(i), drop = st.before.flags?.[i] === 'drop'
    toks.push({ id: `b${i}`, row, cols: inCols, x0: s.x, y0: s.y, o0: 1, x1: s.x + (drop ? 14 : 0), y1: s.y, o1: drop ? 0 : 0.38, w: tw, h: tokH, cls: drop ? 'drop' : '', delay: 0 })
  })
  if (st.kind === 'group') return bucketGrid(st.buckets ?? [], st.before.rows.map((_, i) => bslot(i)), inCols)

  const ay = addBox(st.kind === 'select' ? 'Output rows' : 'Rows out', st.after, 'out')
  st.after.rows.forEach((row, j) => {
    const s = slot(ay, j), f = st.after.from?.[j] ?? -1
    const o = f >= 0 ? bslot(f) : null
    toks.push({ id: `a${j}`, row, cols: st.columns, x0: o ? o.x : s.x, y0: o ? o.y : s.y + 10, o0: o ? 1 : 0, x1: s.x, y1: s.y, o1: 1, w: tw, h: tokH, cls: flagCls(st.after, j), focus: st.windowCols, delay: Math.min(j * 25, 250) })
    if (st.kind === 'join' && o) links.push({ x0: o.x + tw / 2, y0: o.y + tokH, x1: s.x + tw / 2, y1: s.y, dup: st.after.flags?.[j] === 'dup' })
  })
  return { height: y, boxes, toks, links }
}
