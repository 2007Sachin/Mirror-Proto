// "Find your starting point": predict the output of small queries on small tables. Nothing is run.
import { useState } from 'react'
import { levels } from '../curriculum'
import { DIAG, type Conf, type Tbl } from './diagnostic'
import { diagnose, saveDiag, type Answer, type Diagnosis } from './planLogic'
import './plan.css'

const CONFS: [Conf, string][] = [['guess', 'Guess'], ['fairly', 'Fairly sure'], ['certain', 'Certain']]

function Rows({ t }: { t: Tbl }) {
  return (
    <table className="dg-tbl">
      <caption>{t.name}</caption>
      <thead><tr>{t.cols.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
      <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c === null ? <i>NULL</i> : c}</td>)}</tr>)}</tbody>
    </table>
  )
}

export default function Diagnostic({ titles, order, onOpen, onClose, onDone }: {
  titles: Record<string, string>; order: string[]; onOpen(id: string, level: Diagnosis['level']): void; onClose(): void; onDone(d: Diagnosis): void
}) {
  const [n, setN] = useState(0)
  const [pick, setPick] = useState<number | null>(null)
  const [conf, setConf] = useState<Conf | null>(null)
  const [shown, setShown] = useState(false)
  const [done, setDone] = useState<Answer[]>([])
  const [res, setRes] = useState<Diagnosis | null>(null)

  if (res) {
    const lv = levels.find(l => l.id === res.level)?.title
    return (
      <section className="ml-glass dg" aria-live="polite">
        <h2>Start with {lv}</h2>
        <p>{res.missed.length ? `A few ideas are worth another look: ${res.missed.join(', ')}.` : 'You read every one of these correctly. The situations and case studies are a good next test.'}</p>
        {res.surprises.length > 0 && <p className="dg-soft">You felt sure about {res.surprises.join(' and ')}, and it works a little differently from the first guess. A short look will settle it.</p>}
        <p className="dg-lead">Good first modules</p>
        <ul className="dg-start">{res.modules.map(m => <li key={m}><button type="button" className="ml-btn ml-btn--sm" onClick={() => onOpen(m, res.level)}>{titles[m] ?? m}</button></li>)}</ul>
        <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={onClose}>Back to the path</button>
      </section>
    )
  }

  const q = DIAG[n]
  const last = n === DIAG.length - 1
  const lock = () => { setShown(true) }
  const next = () => {
    const all = [...done, { id: q.id, pick: pick!, conf: conf! }]
    if (last) { const d = diagnose(all, order); saveDiag({ level: d.level, modules: d.modules }); onDone(d); setRes(d); return }
    setDone(all); setN(n + 1); setPick(null); setConf(null); setShown(false)
  }

  return (
    <section className="ml-glass dg" aria-labelledby="dg-q">
      <p className="dg-step">Question {n + 1}. Work it out in your head. Nothing runs.</p>
      <div className="dg-tables">{q.tables.map(t => <Rows key={t.name} t={t} />)}</div>
      <pre className="dg-sql" tabIndex={0} aria-label="Query">{q.sql}</pre>
      <h2 id="dg-q">{q.ask}</h2>
      <fieldset className="dg-fs" disabled={shown}><legend className="ml-sr">Your prediction</legend>
        <div className="dg-opts">{q.options.map((o, i) => (
          <label key={o} className={`${pick === i ? 'is-on' : ''}${shown && i === q.answer ? ' is-right' : ''}`}>
            <input type="radio" name="dg-pick" checked={pick === i} onChange={() => setPick(i)} /><span>{o}</span>
          </label>
        ))}</div>
      </fieldset>
      <fieldset className="dg-fs" disabled={shown}><legend>How sure are you?</legend>
        <div className="dg-opts dg-conf">{CONFS.map(([v, t]) => (
          <label key={v} className={conf === v ? 'is-on' : ''}><input type="radio" name="dg-conf" checked={conf === v} onChange={() => setConf(v)} /><span>{t}</span></label>
        ))}</div>
      </fieldset>
      {!shown
        ? <button type="button" className="ml-btn dg-go" disabled={pick === null || conf === null} onClick={lock}>Lock in my answer</button>
        : (
          <>
            <p className="dg-why" role="status"><b>{pick === q.answer ? 'That matches.' : `It is “${q.options[q.answer]}”.`}</b> {q.why}</p>
            <button type="button" className="ml-btn dg-go" onClick={next}>{last ? 'See where to start' : 'Next question'}</button>
          </>
        )}
      <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm dg-quit" onClick={onClose}>Leave the check</button>
    </section>
  )
}
