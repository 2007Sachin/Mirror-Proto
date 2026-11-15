// Scene 'exec-order': the logical order a query runs in, with a live table that changes after each clause.
import { AnimTable, Caption, SceneFrame, useStepper } from './shared'
import { execSteps, LOGICAL } from './logic'

const STEPS = execSteps()
const LINES: { clause: (typeof LOGICAL)[number]; text: string }[] = [
  { clause: 'SELECT', text: 'SELECT region, SUM(amt) AS total' },
  { clause: 'FROM', text: 'FROM orders' },
  { clause: 'WHERE', text: 'WHERE amt > 20' },
  { clause: 'GROUP BY', text: 'GROUP BY region' },
  { clause: 'HAVING', text: 'HAVING SUM(amt) > 100' },
  { clause: 'ORDER BY', text: 'ORDER BY total DESC' },
  { clause: 'LIMIT', text: 'LIMIT 1' },
]
const USED = new Set(LINES.map(l => l.clause))

export default function ExecOrder() {
  const st = useStepper(STEPS.length)
  const s = STEPS[st.i]
  const reached = s.clause ? LOGICAL.indexOf(s.clause) : -1
  const cls = (c: (typeof LOGICAL)[number]) => (c === s.clause ? 'on' : LOGICAL.indexOf(c) < reached ? 'done' : '')
  const lesson = s.clause === 'WHERE' || s.clause === 'SELECT'
  return (
    <SceneFrame title="The real order a query runs in" lead="You write SELECT first, but the database reads it last." st={st}>
      <ol className="vz-order" aria-label="Logical order">
        {LOGICAL.map((c, n) => <li key={c} className={USED.has(c) ? cls(c) : 'skip'}>{n + 1}. {c}</li>)}
      </ol>
      <div className="vz-stage">
        <pre className="vz-code" aria-label="Query">
          {LINES.map(l => <span key={l.clause} className={`vz-ln ${cls(l.clause)}`}>{l.text}</span>)}
        </pre>
        <AnimTable cols={s.cols} rows={s.rows} maxRows={10} hlCol={s.clause === 'SELECT' ? 1 : undefined} />
      </div>
      <p className={`vz-note ${lesson ? 'on' : ''}`}>
        This is why you cannot use a SELECT alias in WHERE: WHERE runs at step 3, but <b>total</b> is only created at step 6.
      </p>
      <Caption>{s.caption}</Caption>
    </SceneFrame>
  )
}
