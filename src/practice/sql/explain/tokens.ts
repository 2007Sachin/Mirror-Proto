// Helpers shared by the row tokens: which column is the headline, which colour a row gets, which small fields show.
import type { Cell } from './stages'

export const plain = (col: string) => col.split('.').pop() ?? col
export const show = (v: Cell) => (v === null ? 'NULL' : typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 100) / 100) : String(v))

export function keyIndex(cols: string[]): number {
  const i = cols.findIndex(c => /^id$/i.test(plain(c)))
  return i >= 0 ? i : 0
}

const COLOUR_COLS = /^(customer_id|user_id|customer|status|country|dept|category|plan|event|name)$/i
// Stable colour group 0-4 (4 is the warm highlight) from the first colour-like column, so equal customers/statuses share a tint.
export function tintOf(row: Cell[], cols: string[]): number {
  let i = cols.findIndex(c => COLOUR_COLS.test(plain(c)))
  if (i < 0) i = keyIndex(cols)
  const s = String(row[i] ?? 'null')
  let h = 0
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0
  return h % 5
}

export function smallCols(cols: string[], key: number, focus: number[] = [], n = 2): number[] {
  const rest = cols.map((_, i) => i).filter(i => i !== key && !focus.includes(i))
  return [...focus.filter(i => i !== key), ...rest].slice(0, n)
}
