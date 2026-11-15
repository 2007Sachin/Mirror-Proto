// Scene 'c-index': a full scan versus a B-tree lookup, clustered versus non-clustered, and the write cost of an index.
import { useState } from 'react'
import { Caption, SceneFrame, Seg, useStepper } from '../../visual/shared'
import { CUSTOMERS, indexCounts, leafOf, branchOf } from './logic'
import './concept-scenes.css'

const ID = 17
const ROW_H = 18
type Kind = 'clustered' | 'non'
type Col = 'id' | 'city'

function caption(col: Col, kind: Kind, step: number) {
  if (col === 'city') return [
    'We look for customers in Pune. There is no index on city.',
    'With no index to use, the database reads row after row.',
    'It keeps reading, because any later row could also match.',
    'The scan had to read all 24 rows. The index did not help here.',
    'The index is on id, so a search by city still falls back to the scan.',
    'Every write still has to update the index, even when a search cannot use it.',
  ][step]
  return [
    'We look for the customer with id 17. Two ways to find it.',
    'The full scan reads rows one at a time. The index starts at the root page.',
    'The scan is part way down the table. The index moves to the right branch.',
    'The scan finds id 17 after 17 rows. The index reaches the right leaf in 3 pages.',
    kind === 'clustered' ? 'The leaf page is the row itself, so the index is done at 3 pages.' : 'The leaf only holds a key and a pointer, so one more hop (a key lookup) fetches the row: 4 pages.',
    'Trade-off: an INSERT writes the table and the index, so every write also updates the index.',
  ][step]
}

export default function IndexScene() {
  const st = useStepper(6, 1500)
  const [kind, setKind] = useState<Kind>('clustered')
  const [col, setCol] = useState<Col>('id')
  const clustered = kind === 'clustered'
  const { scan, hops, total, full } = indexCounts(col, clustered, st.i)
  const done = scan >= total && scan > 0
  const leaf = leafOf(ID)
  const branch = branchOf(ID)
  const useIdx = col === 'id'
  return (
    <SceneFrame title="Why an index makes a lookup fast" lead="Find one customer by scanning the table, or by walking an index." st={st}>
      <div className="vz-tools">
        <Seg label="Search by" value={col} options={[['id', 'id = 17'], ['city', 'city (no index on city)']]} onChange={setCol} />
        <Seg label="Index type" value={kind} options={[['clustered', 'Clustered'], ['non', 'Non-clustered']]} onChange={setKind} />
      </div>
      <div className="cs-cols">
        <div className="cs-panel">
          <h4>Full scan <span className={`cs-count ${scan ? 'on' : ''}`}>Rows read: {scan}</span></h4>
          <div className="cs-rows" role="table" aria-label="Customers">
            <div className="cs-r head" role="row"><span>id</span><span>name</span><span>city</span></div>
            {CUSTOMERS.map((c, n) => {
              const hit = done && (col === 'id' ? c.id === ID : c.city === 'Pune')
              return <div key={c.id} role="row" className={`cs-r ${hit ? 'hit' : n < scan ? 'seen' : ''}`}><span>{c.id}</span><span>{c.name}</span><span>{c.city}</span></div>
            })}
            <div className="cs-bar" style={{ transform: `translateY(${Math.max(0, scan - 1) * ROW_H}px)`, opacity: scan > 0 && !done ? 1 : 0 }} />
          </div>
        </div>
        <div className="cs-panel">
          <h4>Index lookup <span className={`cs-count ${useIdx && hops ? 'on' : ''}`}>{useIdx ? `Pages touched: ${hops}` : 'Index not used'}</span></h4>
          <div className={`cs-tree ${useIdx ? '' : 'cs-dim'}`} aria-label="B-tree index on id">
            <div className="cs-lvl l1"><div className={`cs-node ${useIdx && hops >= 1 ? 'lit' : ''}`}>Root</div></div>
            <div className="cs-lvl l2">
              {[0, 1].map(b => <div key={b} className={`cs-node ${useIdx && hops >= 2 && branch === b ? 'lit' : ''}`}>Branch<small>{b ? '13-24' : '1-12'}</small></div>)}
            </div>
            <div className="cs-lvl l3">
              {[0, 1, 2, 3, 4, 5].map(l => (
                <div key={l} className={`cs-node ${clustered ? 'row' : 'ptr'} ${useIdx && hops >= 3 && leaf === l ? 'lit' : ''}`}>{l * 4 + 1}-{l * 4 + 4}<small>{clustered ? 'rows' : 'keys'}</small></div>
              ))}
            </div>
          </div>
          <p className="vz-note">
            {clustered ? 'Clustered: the leaf pages are the table rows, stored in id order.' : 'Non-clustered: leaves hold a key and a pointer into the table, so reading the row costs one more hop.'}
          </p>
          {useIdx && hops >= 4 && <span className="cs-count on cs-key">{clustered ? `Row ${ID} found in the leaf` : `Key lookup: pointer to row ${ID}, ${full} pages in all`}</span>}
          {!useIdx && st.i >= 3 && <p className="vz-warn">The index is on id, so city = 'Pune' scans every row.</p>}
        </div>
      </div>
      <div className="cs-panel">
        <h4>Every write also updates the index</h4>
        <div className="cs-write">
          <span className="cs-sql">INSERT INTO customers VALUES (25, 'Gita', 'Pune');</span>
          <span className={`cs-pulse ${st.i >= 5 ? 'on' : ''}`}>table +1 row</span>
          <span className={`cs-pulse ${st.i >= 5 ? 'on' : ''}`}>index +1 entry</span>
        </div>
      </div>
      <Caption>{caption(col, kind, st.i)}</Caption>
    </SceneFrame>
  )
}
