// Scene 'c-normal': an orders sheet normalised step by step (1NF, 2NF, 3NF), then the update anomaly and when to denormalise.
import { Caption, SceneFrame, useStepper } from '../../visual/shared'
import { rawTable, rowsTouchedByCityChange, to1NF, to2NF, to3NF, type NTable } from './logic'
import './concept-scenes.css'

const FKS: Record<string, string[]> = { order_items: ['order -> orders', 'product_id -> products'], orders3: ['customer_id -> customers'] }

function Tbl({ t, hl, rowHl, fks }: { t: NTable; hl?: number[]; rowHl?: (r: string[]) => boolean; fks?: string[] }) {
  const cols = hl ?? t.hl ?? []
  return (
    <div className="cs-t" role="group" aria-label={`Table ${t.name}`}>
      <div className="cs-t-h">{t.name}{fks?.map(f => <span key={f} className="cs-fk">FK {f}</span>)}</div>
      <div className="cs-scroll">
        <table>
          <thead><tr>{t.cols.map((c, j) => <th key={c} className={cols.includes(j) ? 'hl' : ''}>{c}</th>)}</tr></thead>
          <tbody>{t.rows.map((r, n) => <tr key={n} style={{ ['--i' as string]: n }} className={rowHl?.(r) ? 'row-hl' : ''}>{r.map((c, j) => <td key={j} className={cols.includes(j) ? 'hl' : ''}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

const CAPTIONS = [
  'One spreadsheet holds every order, with customer details repeated on each row.',
  'The items cell holds several values at once. That breaks first normal form.',
  '1NF: one value per cell, so each order line becomes its own row.',
  'Product name depends on product_id alone, which is only part of the key (order, product).',
  '2NF: products move to their own table and order lines link to them with a foreign key.',
  'City depends on the customer, not on the order. That is a transitive dependency.',
  '3NF: customers get their own table, so each city is stored once.',
  'Customer C1 moves city. The flat table changes 4 rows; the normalised design changes 1.',
  'Sometimes you copy data back on purpose, for example for a read-heavy report.',
]

export default function NormalScene() {
  const st = useStepper(CAPTIONS.length, 1800)
  const i = st.i
  const flat = rowsTouchedByCityChange('C1', 'flat')
  const norm = rowsTouchedByCityChange('C1', 'normalised')
  const t3 = to3NF()
  let body
  if (i <= 1) body = <Tbl t={rawTable()} hl={i === 1 ? [3] : []} />
  else if (i <= 3) body = <Tbl t={to1NF()} hl={i === 3 ? [1, 2] : []} />
  else if (i <= 5) body = <div className="cs-tbls">{to2NF().map(t => <Tbl key={t.name} t={t} hl={t.name === 'orders' && i === 5 ? [2] : []} fks={t.name === 'order_items' ? FKS.order_items : undefined} />)}</div>
  else if (i === 6) body = <div className="cs-tbls">{t3.map(t => <Tbl key={t.name + 3} t={t} hl={t.name === 'customers' ? [2] : []} fks={t.name === 'order_items' ? FKS.order_items : t.name === 'orders' ? FKS.orders3 : undefined} />)}</div>
  else if (i === 7) body = (
    <div className="cs-two">
      <div className="cs-panel"><h4>Unnormalised <span className="cs-count on">{flat} rows to change</span></h4><Tbl t={to1NF()} hl={[4]} rowHl={r => r[3] === 'C1'} /></div>
      <div className="cs-panel"><h4>Normalised <span className="cs-count on">{norm} row to change</span></h4><Tbl t={t3.find(t => t.name === 'customers')!} hl={[2]} rowHl={r => r[0] === 'C1'} /></div>
    </div>
  )
  else body = (
    <div className="cs-tbls">
      <p className="vz-note on" style={{ flex: '1 1 100%' }}><b>Why denormalise sometimes.</b> A report that joins four tables on every page load can be slow, so a read-heavy system may keep a flat copy. Trade-off: faster reads, but more to keep in sync on every write.</p>
      {t3.filter(t => t.name === 'orders' || t.name === 'customers').map(t => <Tbl key={t.name + 3} t={t} fks={t.name === 'orders' ? FKS.orders3 : undefined} />)}
    </div>
  )
  return (
    <SceneFrame title="Normal forms, one step at a time" lead="Split a messy sheet into tables so each fact is stored once." st={st}>
      {body}
      <Caption>{CAPTIONS[i]}</Caption>
    </SceneFrame>
  )
}
