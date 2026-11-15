// One data row as a small rounded card. Used absolutely positioned (scenes) and in a plain grid (TablePeek).
import type { CSSProperties } from 'react'
import type { Cell } from './stages'
import { keyIndex, plain, show, smallCols, tintOf } from './tokens'

export interface TokenProps { row: Cell[]; cols: string[]; cls?: string; mini?: boolean; focus?: number[]; fields?: number; style?: CSSProperties }

export default function Token({ row, cols, cls = '', mini, focus, fields = 2, style }: TokenProps) {
  const key = keyIndex(cols)
  const small = mini ? [] : smallCols(cols, key, focus, fields)
  return (
    <div className={`qx-tok t${tintOf(row, cols)} ${mini ? 'mini' : ''} ${cls}`} style={style}>
      <b className="qx-k">{show(row[key] ?? null)}</b>
      {small.map(i => (
        <span key={i} className={`qx-f ${focus?.includes(i) ? 'hot' : ''}`}><i>{plain(cols[i])}</i> {show(row[i] ?? null)}</span>
      ))}
    </div>
  )
}
