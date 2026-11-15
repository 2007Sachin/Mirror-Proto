// Scene 'c-delete': what removing rows, emptying a table and dropping a table each leave behind.
import { useState } from 'react'
import { Caption, SceneFrame, Seg, useStepper } from '../../visual/shared'
import { COMPARE, commandEffect, SIX, type Cmd } from './logic'
import './concept-scenes.css'

const CMDS: [Cmd, string][] = [['delete', 'DELETE'], ['truncate', 'TRUNCATE'], ['drop', 'DROP']]
const SQL: Record<Cmd, string> = { delete: 'DELETE FROM items WHERE id = 3;', truncate: 'TRUNCATE TABLE items;', drop: 'DROP TABLE items;' }
const CAP: Record<Cmd, string[]> = {
  delete: ['A table of 6 rows.', 'DELETE with a WHERE picks the row with id 3.', 'Only that row is removed. Five rows remain and the table is untouched.'],
  truncate: ['A table of 6 rows.', 'TRUNCATE takes no WHERE: it targets every row.', 'All rows go at once. The empty table stays, and the identity counter resets.'],
  drop: ['A table of 6 rows.', 'DROP targets the table itself.', 'Rows, structure and indexes are all gone. The table no longer exists.'],
}

export default function DeleteScene() {
  const st = useStepper(3, 1700)
  const [cmd, setCmd] = useState<Cmd>('delete')
  const eff = commandEffect(cmd)
  const act = st.i >= 1
  const done = st.i >= 2
  const gone = (id: number) => done && (cmd === 'delete' ? id === 3 : true)
  const sel = (id: number) => st.i === 1 && (cmd === 'delete' ? id === 3 : true)
  const after = done ? eff : { rows: 6, tableExists: true, indexesExist: true, identityReset: false }
  return (
    <SceneFrame title="DELETE, TRUNCATE and DROP" lead="Three ways to remove data, and what each leaves behind." st={st}>
      <Seg label="Command" value={cmd} options={CMDS} onChange={c => { setCmd(c); st.seek(0) }} />
      <pre className="cs-sql">{act ? SQL[cmd] : '-- pick a command, then press Next'}</pre>
      <div className="cs-cols">
        <div className={`cs-frame ${cmd === 'drop' && st.i === 1 ? 'sel' : ''} ${cmd === 'drop' && done ? 'gone' : ''}`} aria-label="Table items">
          <b>items (id, item)</b>
          {SIX.map((r, n) => <div key={r.id} className={`cs-tok ${sel(r.id) ? 'sel' : ''} ${gone(r.id) ? 'gone' : ''}`} style={{ ['--i' as string]: cmd === 'truncate' ? 0 : n }}><span>{r.id}</span><span>{r.item}</span></div>)}
        </div>
        <div className="cs-panel">
          <h4>What is left</h4>
          <div className="cs-facts">
            <span className="cs-count on">Rows: {after.rows}</span>
            <span className="cs-count">Table: {after.tableExists ? 'kept' : 'gone'}</span>
            <span className="cs-count">Indexes: {after.indexesExist ? 'kept' : 'gone'}</span>
            <span className="cs-count">Identity: {after.identityReset ? 'reset' : cmd === 'drop' && done ? 'gone' : 'continues'}</span>
          </div>
          <div className="cs-scroll">
            <table className="cs-cmp">
              <thead><tr><th />{CMDS.map(([c, l]) => <th key={c} className={c === cmd ? 'cur' : ''}>{l}</th>)}</tr></thead>
              <tbody>{COMPARE.map(r => <tr key={r.label}><th>{r.label}</th>{CMDS.map(([c]) => <td key={c} className={c === cmd ? 'cur' : ''}>{r[c]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
      <p className="vz-note on">Rollback behaviour of TRUNCATE differs by database. DROP removes the table itself, so do not count on getting it back.</p>
      <Caption>{CAP[cmd][st.i]}</Caption>
    </SceneFrame>
  )
}
