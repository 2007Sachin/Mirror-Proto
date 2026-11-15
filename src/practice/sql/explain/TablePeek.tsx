// The real sample tables a problem uses, as row tokens, so the learner sees the data before writing the query.
import { useEffect, useState } from 'react'
import { practiceTables } from '../db'
import Token from './Token'
import type { Cell } from './stages'
import { getDb } from './useDb'
import './explain.css'

export interface TablePeekProps { tables?: string[]; sql?: string; maxRows?: number }
interface Peek { name: string; columns: string[]; types: string[]; rows: Cell[][]; total: number }

const known = new Set(practiceTables.map(t => t.name))
const tablesIn = (sql: string) => [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_]\w*)/gi)].map(m => m[1].toLowerCase()))].filter(n => known.has(n))

export default function TablePeek({ tables, sql, maxRows = 8 }: TablePeekProps) {
  const names = (tables ?? (sql ? tablesIn(sql) : [])).filter(n => known.has(n))
  const keyed = names.join(',')
  const [data, setData] = useState<{ key: string; peeks: Peek[] } | null>(null)
  useEffect(() => {
    let live = true
    getDb().then(db => {
      const peeks = keyed.split(',').filter(Boolean).map(name => {
        const r = db.exec(`SELECT * FROM ${name}`)[0]
        const rows = (r?.values ?? []) as Cell[][]
        const types = (r?.columns ?? []).map((_, c) => { const v = rows.find(x => x[c] !== null)?.[c]; return v === undefined ? 'any' : typeof v === 'number' ? 'number' : 'text' })
        return { name, columns: r?.columns ?? [], types, rows, total: rows.length }
      })
      if (live) setData({ key: keyed, peeks })
    }).catch(() => { if (live) setData({ key: keyed, peeks: [] }) })
    return () => { live = false }
  }, [keyed])

  if (!names.length) return null
  if (!data || data.key !== keyed) return <section className="qx qx-peek"><p className="qx-note">Loading the sample tables...</p></section>
  return (
    <section className="qx qx-peek" aria-label="Sample tables">
      {data.peeks.map(p => (
        <details key={p.name} className="qx-table" open>
          <summary><b>{p.name}</b><span>{p.total} rows</span></summary>
          <ul className="qx-cols" aria-label={`${p.name} columns`}>
            {p.columns.map((c, i) => <li key={c}>{c} <em>{p.types[i]}</em></li>)}
          </ul>
          <div className="qx-grid">
            {p.rows.slice(0, maxRows).map((r, i) => <Token key={i} row={r} cols={p.columns} fields={2} />)}
          </div>
          {p.total > maxRows && <p className="qx-more">and {p.total - maxRows} more</p>}
        </details>
      ))}
    </section>
  )
}
