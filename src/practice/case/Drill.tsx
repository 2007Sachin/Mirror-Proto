import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Database } from 'sql.js'
import { runQuery, type QueryResult } from '../../pages/target/sqlEngine'
import type { DrillProps } from '../types'
import { cases, createCaseDb, type Pick } from './data'
import './drill.css'

function ResultTable({ result }: { result: QueryResult }) {
  if ('error' in result) return <p className="csd-error">{result.error}</p>
  if (!result.rows.length) return <p className="csd-note">The query ran and returned no rows.</p>
  return <>
    <div className="csd-table-wrap" tabIndex={0} role="region" aria-label="Query result">
      <table><thead><tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{result.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v === null ? <i>NULL</i> : String(v)}</td>)}</tr>)}</tbody></table>
    </div>
    {result.total > result.rows.length && <p className="csd-note">Showing the first {result.rows.length} of {result.total} rows.</p>}
  </>
}

function Choices({ name, legend, opts, value, onPick, locked, best, tag }: {
  name: string; legend: string; opts: (Pick & { kind?: string })[]; value: string | null; onPick(id: string): void; locked: boolean; best: string; tag?: (o: Pick & { kind?: string }) => string
}) {
  return <fieldset className="csd-opts" disabled={locked}>
    <legend className="csd-q">{legend}</legend>
    {opts.map(o => {
      const mark = locked ? (o.id === best ? 'is-best' : o.id === value ? 'is-miss' : '') : value === o.id ? 'is-pick' : ''
      return <div key={o.id}>
        <label className={`csd-opt ${mark}`}>
          <input type="radio" name={name} checked={value === o.id} onChange={() => onPick(o.id)} />
          <span>{o.text}</span>
        </label>
        {locked && <p className="csd-why"><b>{o.id === best ? 'Best answer' : tag ? tag(o) : 'Not the cause'}</b> {o.why}</p>}
      </div>
    })}
  </fieldset>
}

export default function Drill({ item, onAttempt, onClose }: DrillProps) {
  const c = cases.find(x => x.id === item.id)
  const [db, setDb] = useState<Database | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadTry, setLoadTry] = useState(0)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [cause, setCause] = useState<string | null>(null)
  const [rec, setRec] = useState<string | null>(null)
  const [note, setNote] = useState('') // ponytail: kept in this component only, never sent or graded
  const [done, setDone] = useState(false)
  const [start] = useState(Date.now)
  const sent = useRef(false)

  useEffect(() => {
    let live = true
    if (c) createCaseDb(c.id).then(d => { if (live) setDb(d) }, () => { if (live) setLoadFailed(true) })
    return () => { live = false }
  }, [c, loadTry])

  if (!c) return <div className="mirror-landing csd"><p className="csd-error" role="alert">This case is not available.</p><button className="ml-btn" onClick={onClose}>Back</button></div>

  const run = () => { if (db) setResult(runQuery(db, query)) }
  const finish = () => {
    if (!cause || !rec || sent.current) return
    sent.current = true
    setDone(true)
    onAttempt({
      itemId: item.id, track: 'case', topic: item.topic, level: item.level,
      correct: cause === c.cause && c.recs.find(r => r.id === rec)?.kind === 'best',
      seconds: Math.min(3600, Math.round((Date.now() - start) / 1000)),
      hintsUsed: 0,
    })
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); return }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      const el = e.currentTarget
      const { selectionStart: a, selectionEnd: b } = el
      setQuery(`${query.slice(0, a)}  ${query.slice(b)}`)
      requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2))
    }
  }
  const gotCause = cause === c.cause
  const gotRec = c.recs.find(r => r.id === rec)?.kind === 'best'

  return <div className="mirror-landing csd">
    <header className="csd-top">
      <div>
        <p className="ml-eyebrow">Case simulator · {c.topic} · Level {c.level}</p>
        <h1>{c.title}</h1>
      </div>
      <button className="ml-btn ml-btn--quiet" onClick={onClose}>Back</button>
    </header>

    <main className="csd-main">
      <aside className="csd-side ml-glass">
        <p className="csd-from">Message from the {c.from}</p>
        <p className="csd-brief">“{c.brief}”</p>
        <details className="csd-schema" open>
          <summary>Tables</summary>
          {c.tables.map(t => <div key={t.name}><b>{t.name}</b><ul>{t.columns.map(col => <li key={col}>{col}</li>)}</ul></div>)}
        </details>
      </aside>

      <section className="csd-work">
        <div className="csd-editor ml-glass">
          <h2>1. Look into the data</h2>
          <label className="ml-sr" htmlFor="csd-query">SQL query</label>
          <textarea id="csd-query" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={query}
            placeholder="SELECT ..." onChange={e => setQuery(e.target.value)} onKeyDown={onKey} />
          <div className="csd-row">
            <button className="ml-btn" disabled={!db} onClick={run}>Run</button>
            <span className="csd-note">{loadFailed ? '' : db ? 'Run as many queries as you like. Ctrl or Cmd + Enter also runs it.' : 'Setting up the case data…'}</span>
          </div>
          {loadFailed && <p className="csd-error" role="alert">The case data did not load. <button className="csd-link" onClick={() => { setLoadFailed(false); setLoadTry(n => n + 1) }}>Retry</button></p>}
        </div>

        <div className="csd-results ml-glass" aria-live="polite">
          {result ? <ResultTable result={result} /> : <p className="csd-note">Your results show up here.</p>}
        </div>

        <div className="csd-step ml-glass">
          <h2>2. What do you think happened?</h2>
          <Choices name="csd-cause" legend="Pick the most likely cause." opts={c.causes} value={cause} onPick={setCause} locked={done} best={c.cause} />
        </div>

        <div className="csd-step ml-glass">
          <h2>3. What would you tell the stakeholder?</h2>
          <Choices name="csd-rec" legend="Pick your recommendation." opts={c.recs} value={rec} onPick={setRec} locked={done}
            best={c.recs.find(r => r.kind === 'best')!.id} tag={o => (o.kind === 'harmful' ? 'Harmful' : 'Tempting, but not the best')} />
          <label className="csd-q" htmlFor="csd-note">Your conclusion in one line (only you see this)</label>
          <textarea id="csd-note" className="csd-note-box" rows={2} maxLength={240} value={note} onChange={e => setNote(e.target.value)} placeholder="Signups fell because..." />
          <div className="csd-row">
            <button className="ml-btn" disabled={!cause || !rec || done} onClick={finish}>Finish the case</button>
            {!done && <span className="csd-note">{cause && rec ? 'You can still run queries after you finish.' : 'Choose a cause and a recommendation first.'}</span>}
          </div>
        </div>

        <div className="csd-results ml-glass" aria-live="polite">
          {!done ? <p className="csd-note">The debrief shows up here after you finish.</p> : <>
            <p className={`csd-verdict ${gotCause && gotRec ? 'is-right' : 'is-miss'}`}>{gotCause && gotRec ? 'Right' : 'Not quite'}</p>
            <p className="csd-note">Cause: {gotCause ? 'right' : 'not quite'}. Recommendation: {gotRec ? 'right' : 'not quite'}.</p>
            <h3>What really happened</h3>
            <p className="csd-text">{c.debrief.cause}</p>
            <h3>Queries that would have shown it</h3>
            {c.debrief.queries.map(q => <div key={q.label} className="csd-q-ex">
              <p className="csd-note">{q.label}</p>
              <pre className="csd-code">{q.sql}</pre>
              <button className="ml-btn ml-btn--quiet" onClick={() => { setQuery(q.sql); if (db) setResult(runQuery(db, q.sql)) }}>Run this query</button>
            </div>)}
            <h3>What a strong answer says</h3>
            <p className="csd-text">{c.debrief.strong}</p>
            {note.trim() && <><h3>Your conclusion</h3><p className="csd-text">{note}</p></>}
          </>}
        </div>
      </section>
    </main>
  </div>
}
