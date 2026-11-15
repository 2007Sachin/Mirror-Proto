// Scene 'c-acid': one transfer of 100 from account A to B, shown for atomicity, consistency, isolation and durability.
import { useState } from 'react'
import { Caption, SceneFrame, Seg, useStepper } from '../../visual/shared'
import { acidSteps, ANOMALIES, isoSteps, LEVELS, MIN_LEVEL, prevented, type AcidProp, type Anomaly, type Level } from './logic'
import './concept-scenes.css'

const PROPS: [AcidProp, string][] = [['atomicity', 'Atomicity'], ['consistency', 'Consistency'], ['isolation', 'Isolation'], ['durability', 'Durability']]
const LEAD: Record<AcidProp, string> = {
  atomicity: 'All of the transaction happens, or none of it.',
  consistency: 'A transaction moves the data from one valid state to another.',
  isolation: 'Concurrent transactions do not see each other half done.',
  durability: 'Once committed, the change survives a crash.',
}
const SHORT: Record<Level, string> = { 'read-uncommitted': 'RU', 'read-committed': 'RC', 'repeatable-read': 'RR', serializable: 'SER' }

const Icon = ({ kind }: { kind: 'log' | 'power' }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'log' ? <><path d="M6 3h9l3 3v15H6z" /><path d="M9 11h6M9 15h6" /></> : <><path d="M12 3v8" /><path d="M7 6.5a7 7 0 1 0 10 0" /></>}
  </svg>
)

function Transfer({ prop, i }: { prop: Exclude<AcidProp, 'isolation'>; i: number }) {
  const s = acidSteps(prop)[Math.min(i, acidSteps(prop).length - 1)]
  const lost = prop === 'durability' && (s.flag === 'off' || s.flag === 'restart')
  return (
    <div className="cs-panel">
      <div className="cs-accts" aria-label="Accounts">
        {(['a', 'b'] as const).map(k => (
          <div key={k} className={`cs-acct ${s.flag === 'refused' && k === 'a' ? 'bad' : ''} ${lost ? 'off' : ''}`}>
            <span>Account {k.toUpperCase()}{prop === 'durability' ? ' (in memory)' : ''}</span><b>{lost ? 'lost' : s[k]}</b>
          </div>
        ))}
      </div>
      <pre className="cs-sql">{s.sql}</pre>
      {prop === 'durability' && (
        <div className="cs-accts">
          <div className={`cs-dev ${i >= 1 ? 'on' : ''}`}><Icon kind="log" />Log file: {i >= 1 ? 'A -100, B +100, COMMIT' : 'empty'}</div>
          <div className={`cs-dev ${s.flag === 'off' ? 'on' : ''}`}><Icon kind="power" />{s.flag === 'off' ? 'Power off' : s.flag === 'restart' ? 'Restarting' : 'Power on'}</div>
        </div>
      )}
      {s.flag === 'crash' && <div className="cs-flag bad">Crash</div>}
      {s.flag === 'refused' && <div className="cs-flag bad">Transaction refused</div>}
    </div>
  )
}

function Isolation({ an, lv, i, setAn, setLv }: { an: Anomaly; lv: Level; i: number; setAn: (a: Anomaly) => void; setLv: (l: Level) => void }) {
  const steps = isoSteps(an, lv)
  const seen = steps.slice(0, i + 1)
  return (
    <>
      <div className="vz-tools">
        <Seg label="Anomaly" value={an} options={ANOMALIES} onChange={setAn} />
        <Seg label="Level" value={lv} options={LEVELS} onChange={setLv} />
      </div>
      <div className="cs-two">
        {(['s1', 's2'] as const).map((k, n) => (
          <div key={k} className="cs-panel cs-sess"><h4>Session {n + 1}</h4>{seen.filter(e => e[k]).map((e, j) => <div key={j} className={`cs-ev ${k === 's2' && e.bad ? 'bad' : ''}`}>{e[k]}</div>)}</div>
        ))}
      </div>
      <div className="cs-scroll">
        <table className="cs-mx" aria-label="Isolation level versus anomaly">
          <thead><tr><th>Anomaly</th>{LEVELS.map(([l]) => <th key={l} className={l === lv ? 'cur' : ''} title={LEVELS.find(x => x[0] === l)![1]}>{SHORT[l]}</th>)}</tr></thead>
          <tbody>{ANOMALIES.map(([a, label]) => <tr key={a}><td>{label}</td>{LEVELS.map(([l]) => { const ok = prevented(a, l); return <td key={l} className={`${ok ? 'ok' : 'no'} ${l === lv && a === an ? 'cur' : ''}`}>{ok ? 'blocked' : 'possible'}</td> })}</tr>)}</tbody>
        </table>
      </div>
      <p className="vz-note">{ANOMALIES.find(x => x[0] === an)![1]} is blocked from {LEVELS.find(x => x[0] === MIN_LEVEL[an])![1].toLowerCase()} upward (SQL standard; engines differ in detail). RU = read uncommitted, RC = read committed, RR = repeatable read, SER = serializable.</p>
    </>
  )
}

export default function AcidScene() {
  const [prop, setProp] = useState<AcidProp>('atomicity')
  const [an, setAn] = useState<Anomaly>('dirty')
  const [lv, setLv] = useState<Level>('read-uncommitted')
  const count = prop === 'isolation' ? isoSteps(an, lv).length : acidSteps(prop).length
  const st = useStepper(count, 1800)
  const cap = prop === 'isolation' ? isoSteps(an, lv)[st.i].caption : acidSteps(prop)[st.i].caption
  return (
    <SceneFrame title="ACID: a bank transfer of 100" lead={LEAD[prop]} st={st}>
      <Seg label="Property" value={prop} options={PROPS} onChange={p => { setProp(p); st.seek(0) }} />
      {prop === 'isolation' ? <Isolation an={an} lv={lv} i={st.i} setAn={a => { setAn(a); st.seek(0) }} setLv={setLv} /> : <Transfer prop={prop} i={st.i} />}
      <Caption>{cap}</Caption>
    </SceneFrame>
  )
}
