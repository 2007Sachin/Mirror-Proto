// Scene 'nulls': a truth-table playground. Each row evaluates to TRUE / FALSE / UNKNOWN; WHERE keeps only TRUE.
import { useMemo, useState } from 'react'
import { Caption, SceneFrame, Seg, cellText, useStepper } from './shared'
import { evalNullExpr, NULL_EXPRS, NULL_ROWS } from './logic'

const COL_OF: Record<string, number> = { 'eq-null': 0, 'is-null': 0, 'ne-us': 0, 'not-in': 0, and: 2, count: 0, avg: 1 }

export default function Nulls() {
  const [id, setId] = useState('eq-null')
  const expr = NULL_EXPRS.find(e => e.id === id)!
  const res = useMemo(() => evalNullExpr(id), [id])
  const n = NULL_ROWS.length
  const st = useStepper(n + 2) // 0 intro, 1..n one row each, n+1 the result
  const done = st.i === n + 1
  const col = COL_OF[id]
  let caption = expr.note
  if (st.i >= 1 && st.i <= n) caption = `${NULL_ROWS[st.i - 1].name}: ${res.verdicts[st.i - 1].why}`
  if (done) caption = expr.agg ? res.summary : `WHERE keeps only TRUE rows: ${res.kept?.length} of ${n}. Unknown is dropped just like false.`
  return (
    <SceneFrame title="NULL is not a value" lead="A comparison with NULL is neither true nor false. Pick an expression and watch." st={st}>
      <Seg label="Expression" value={id} onChange={v => { setId(v); st.reset() }} options={NULL_EXPRS.map(e => [e.id, e.label])} />
      <p className="vz-note"><code>WHERE {expr.sql}</code></p>
      <div className="vz-scroll">
        <table className="vz-tbl">
          <thead><tr><th>id</th><th>name</th><th>country</th><th>score</th><th>active</th><th>result</th></tr></thead>
          <tbody>
            {NULL_ROWS.map((r, i) => {
              const shown = st.i > i
              const v = res.verdicts[i]
              const out = done && !expr.agg && v.tone !== 't'
              const cell = [r.country, r.score, r.active === null ? null : r.active ? 'true' : 'false']
              return (
                <tr key={r.id} className={`${st.i === i + 1 ? 'cur' : ''} ${out ? 'out' : ''}`}>
                  <td>{r.id}</td><td>{r.name}</td>
                  {cell.map((c, j) => <td key={j} className={[0, 1, 2][j] === col ? 'col' : ''}>{cellText(c)}</td>)}
                  <td>{shown ? <><span className={`vz-chip ${v.tone}`}>{v.label}</span>{done && !expr.agg && v.tone === 't' && <span className="vz-kept">kept</span>}</> : <span className="vz-pend">...</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Caption>{caption}</Caption>
    </SceneFrame>
  )
}
