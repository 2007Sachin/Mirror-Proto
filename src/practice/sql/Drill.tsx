import { Suspense, lazy, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { modules } from './curriculum'
import { isConceptId } from './concepts/logic'
import { scenes } from './scenes'
import './path.css'
import type { Database } from 'sql.js'
import { runQuery, sameResult, type QueryResult } from '../../pages/target/sqlEngine'
import type { DrillProps } from '../types'
import { createPracticeDb, practiceTables } from './db'
import { problems } from './problems'
import { QueryExplainer, TablePeek } from './explain'
import { compareText, diffRows, diffText, sameSql, surprised, tablesIn, type Confidence, type Expect } from './lesson/logic'
import './drill.css'

function ResultTable({ result }: { result: QueryResult }) {
  if ('error' in result) return <p className="sqd-error">{result.error}</p>
  if (!result.rows.length) return <p className="sqd-note">The query ran and returned no rows.</p>
  return <>
    <div className="sqd-table-wrap" tabIndex={0} role="region" aria-label="Query result">
      <table><thead><tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{result.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v === null ? <i>NULL</i> : String(v)}</td>)}</tr>)}</tbody></table>
    </div>
    {result.total > result.rows.length && <p className="sqd-note">Showing the first {result.rows.length} of {result.total} rows.</p>}
  </>
}

const Skeleton = ({ label }: { label: string }) => <p className="sqd-skel" role="status">{label}</p>

const EXPECTS: { key: 'zero' | 'one' | 'few' | 'many'; label: string }[] = [
  { key: 'zero', label: 'None' }, { key: 'one', label: 'One' }, { key: 'few', label: 'A few' }, { key: 'many', label: 'Many' },
]
const CONF: { key: Confidence; label: string }[] = [
  { key: 'guess', label: 'Guess' }, { key: 'fairly', label: 'Fairly sure' }, { key: 'certain', label: 'Certain' },
]
type Tab = 'result' | 'watch' | 'notes'
const TABS: { key: Tab; label: string }[] = [{ key: 'result', label: 'Result' }, { key: 'watch', label: 'Watch it run' }, { key: 'notes', label: 'Notes' }]

/** Splits "a, b (most first)" into column chips; anything that is not a plain list stays one chip. */

function SqlDrill({ item, onAttempt, onClose }: DrillProps) {
  const problem = problems.find(p => p.id === item.id)
  const [db, setDb] = useState<Database | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadTry, setLoadTry] = useState(0)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [want, setWant] = useState<QueryResult | null>(null)
  const [ranSql, setRanSql] = useState('')
  const [verdict, setVerdict] = useState<'solved' | 'not-yet' | null>(null)
  const [hintStage, setHintStage] = useState(0) // 0 none, 1 nudge, 2 hint
  const [idea, setIdea] = useState(false)
  const [solution, setSolution] = useState<QueryResult | null>(null)
  const [start] = useState(Date.now)
  const busy = useRef(false)
  // lesson state: all in memory, per problem, never sent anywhere
  const [dataOpen, setDataOpen] = useState(false)
  const [skipPredict, setSkipPredict] = useState(false)
  const [expect, setExpect] = useState<Expect | null>(null)
  const [num, setNum] = useState('')
  const [conf, setConf] = useState<Confidence | null>(null)
  const [firstTotal, setFirstTotal] = useState<number | null>(null)
  const [watch, setWatch] = useState(false)
  const [watching, setWatching] = useState<'yours' | 'model'>('yours')
  const [thought, setThought] = useState('')
  const [tab, setTab] = useState<Tab>('result')
  const [mob, setMob] = useState<'q' | 'a'>('q') // narrow screens: Question | Your query

  useEffect(() => {
    let live = true
    createPracticeDb().then(d => { if (live) setDb(d) }, () => { if (live) setLoadFailed(true) })
    return () => { live = false }
  }, [loadTry])

  if (!problem) return <div className="mirror-landing sqd sqd--gone"><p className="sqd-error" role="alert">This problem is not available.</p><button className="ml-btn" onClick={onClose}>Back</button></div>

  const run = () => {
    if (!db || busy.current) return
    busy.current = true
    try {
      const got = runQuery(db, query)
      const expected = runQuery(db, problem.solution)
      const ok = sameResult(got, expected, problem.ordered)
      setResult(got)
      setWant(expected)
      setRanSql(query)
      setVerdict(ok ? 'solved' : 'not-yet')
      setTab('result')
      setMob('a')
      if (firstTotal === null && !('error' in got)) setFirstTotal(got.total)
      if (ok) setWatching('yours')
      onAttempt({
        itemId: item.id, track: 'sql', topic: item.topic, level: item.level,
        correct: ok && solution === null, // solution viewed: never solved
        seconds: Math.min(3600, Math.round((Date.now() - start) / 1000)),
        hintsUsed: hintStage,
      })
    } finally {
      busy.current = false
    }
  }

  const showHint = () => setHintStage(s => Math.min(2, s + 1))
  // ponytail: `explain` is an optional problems.ts field; read through a cast so this compiles with or without it
  const explain = (problem as { explain?: string }).explain
  const ownerMod = modules.find(m => m.problemIds.includes(problem.id))
  const Scene = ownerMod?.sceneId ? scenes[ownerMod.sceneId] : undefined
  const showSolution = () => {
    if (!db) return
    setSolution(runQuery(db, problem.solution))
    setTab('notes')
  }
  const tables = tablesIn(problem.solution, practiceTables.map(t => t.name))
  const tableNames = problem.tables?.length ? problem.tables : tables

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
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex(t => t.key === tab)
    const n = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length : -1
    if (n < 0) return
    e.preventDefault()
    setTab(TABS[n].key)
    document.getElementById(`sqd-tab-${TABS[n].key}`)?.focus()
  }

  const pickNum = (v: string) => {
    setNum(v)
    const n = Number(v)
    setExpect(v.trim() !== '' && Number.isInteger(n) && n >= 0 && n < 100000 ? { kind: 'number', n } : null)
  }

  const solved = verdict === 'solved'
  const modelVisible = solved || solution !== null
  const ranOk = result !== null && !('error' in result)
  const compare = expect && firstTotal !== null ? compareText(expect, firstTotal) : null
  const surprise = expect && conf && firstTotal !== null && surprised(expect, conf, firstTotal)
  const diff = verdict === 'not-yet' && result && want ? diffRows(result, want) : null
  const colsDiffer = !!(result && want && !('error' in result) && !('error' in want) && result.columns.join() !== want.columns.join())
  const differs = !sameSql(ranSql, problem.solution)
  const watchSql = watching === 'model' ? problem.solution : ranSql
  const predictOpen = verdict === null && !skipPredict
  const cols = problem.output ? [problem.output] : []

  return <div className="mirror-landing sqd" data-mob={mob}>
    <header className="sqd-top">
      <div className="sqd-head">
        <span className="sqd-crumb">{problem.topic} · Level {problem.level}</span>
        <h1>{problem.title}</h1>
        <span className="sqd-meta">
          {problem.pattern && <span className="sqd-tag">{problem.pattern}</span>}
          {problem.asked && <span className="sqd-tag">{problem.asked}</span>}
          <span className="sqd-tag">{problem.minutes} min</span>
        </span>
      </div>
      <div className="sqd-row">
        {Scene && <button className="sqd-btn" onClick={() => setIdea(true)}>See the idea</button>}
        <button className="sqd-btn" onClick={onClose}>Back</button>
      </div>
    </header>
    {idea && Scene && <div className="sqd-drawer" onClick={() => setIdea(false)} onKeyDown={e => { if (e.key === 'Escape') setIdea(false) }}>
      <div className="sqd-drawer-panel" role="dialog" aria-modal="true" aria-label={ownerMod?.title ?? 'The idea'} onClick={e => e.stopPropagation()}>
        <button className="sqd-btn" autoFocus onClick={() => setIdea(false)}>Close</button>
        <Suspense fallback={<p className="sqd-note" role="status">Getting the picture ready…</p>}><Scene /></Suspense>
      </div>
    </div>}

    <div className="sqd-mobtabs" role="group" aria-label="Show">
      <button className="sqd-mt" aria-pressed={mob === 'q'} onClick={() => setMob('q')}>Question</button>
      <button className="sqd-mt" aria-pressed={mob === 'a'} onClick={() => setMob('a')}>Your query</button>
    </div>

    <div className="sqd-body">
      <aside className="sqd-brief" aria-label="The question">
        {problem.scenario && <p className="sqd-scenario">{problem.scenario}</p>}
        <p className="sqd-task">{problem.prompt}</p>

        {cols.length > 0 && <div className="sqd-blk">
          <h2>You will return</h2>
          <ul className="sqd-cols">{cols.map(c => <li key={c}><code>{c}</code></li>)}</ul>
        </div>}

        {!!problem.edgeCases?.length && <div className="sqd-blk">
          <h2>Watch for</h2>
          <ul className="sqd-bullets">{problem.edgeCases.map(c => <li key={c}>{c}</li>)}</ul>
        </div>}

        {tableNames.length > 0 && <details className="sqd-blk sqd-data" open={dataOpen} onToggle={e => setDataOpen(e.currentTarget.open)}>
          <summary><h2>The data</h2><span className="sqd-names">{tableNames.join(', ')}</span></summary>
          {dataOpen && <Suspense fallback={<Skeleton label="Laying out the tables…" />}>
            <TablePeek tables={tableNames} sql={problem.solution} maxRows={3} />
          </Suspense>}
        </details>}

        {solved && problem.followUp && <details className="sqd-blk sqd-follow">
          <summary><h2>Interviewer follow-up</h2></summary>
          <p>{problem.followUp}</p>
        </details>}

        <div className="sqd-blk sqd-ladder">
          <h2>Stuck?</h2>
          <div className="sqd-row">
            <button className="sqd-btn" disabled={hintStage >= 1} onClick={showHint}>Nudge</button>
            <button className="sqd-btn" disabled={hintStage < 1 || hintStage >= 2} onClick={showHint}>Hint</button>
            <button className="sqd-btn" disabled={!db || solution !== null} onClick={showSolution}>Show solution</button>
          </div>
          {hintStage >= 1 && <p className="sqd-hint"><b>Nudge.</b> Say the answer in words first: which rows, which columns, grouped how?</p>}
          {hintStage >= 2 && <p className="sqd-hint"><b>Hint.</b> {problem.hint}</p>}
        </div>
      </aside>

      <section className="sqd-work" aria-label="Your query">
        {predictOpen && <div className="sqd-predict" role="group" aria-label="Predict first">
          <span className="sqd-lbl">Rows back?</span>
          <div className="sqd-chips" role="group" aria-label="Expected number of rows">
            {EXPECTS.map(o => <button key={o.key} className="sqd-chip" aria-pressed={expect?.kind === o.key} onClick={() => { setNum(''); setExpect({ kind: o.key }) }}>{o.label}</button>)}
            <input className="sqd-num" inputMode="numeric" placeholder="or a number" value={num} onChange={e => pickNum(e.target.value.replace(/\D/g, ''))} aria-label="Expected number of rows" />
          </div>
          <span className="sqd-lbl">How sure?</span>
          <div className="sqd-chips" role="group" aria-label="How sure you are">
            {CONF.map(o => <button key={o.key} className="sqd-chip" aria-pressed={conf === o.key} onClick={() => setConf(o.key)}>{o.label}</button>)}
          </div>
          <button className="sqd-link" onClick={() => setSkipPredict(true)}>Skip</button>
        </div>}

        <label className="ml-sr" htmlFor="sqd-query">SQL query</label>
        <textarea id="sqd-query" className="sqd-editor" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={query}
          placeholder="SELECT ..." onChange={e => setQuery(e.target.value)} onKeyDown={onKey} />

        <div className="sqd-actions">
          <button className="sqd-run" disabled={!db} onClick={run}>Run</button>
          <button className="sqd-chip" aria-pressed={!skipPredict} onClick={() => setSkipPredict(v => !v)}>Predict</button>
          <span className="sqd-note">{loadFailed ? '' : db ? 'Ctrl or Cmd + Enter also runs it.' : 'Setting up your practice database…'}</span>
          {loadFailed && <span className="sqd-error" role="alert">The practice database did not load. <button className="sqd-link" onClick={() => { setLoadFailed(false); setLoadTry(n => n + 1) }}>Retry</button></span>}
          {solved && <button className="sqd-run sqd-next" onClick={onClose}>Next problem</button>}
        </div>

        <div className="sqd-out">
          <div className="sqd-tabs" role="tablist" aria-label="Output">
            {TABS.map(t => <button key={t.key} id={`sqd-tab-${t.key}`} role="tab" className="sqd-tab" aria-selected={tab === t.key} aria-controls="sqd-panel"
              tabIndex={tab === t.key ? 0 : -1} onClick={() => setTab(t.key)} onKeyDown={onTabKey}>
              {t.label}{t.key === 'watch' && result && tab !== 'watch' && <span className="sqd-dot" aria-label="ready" />}
            </button>)}
          </div>
          <div id="sqd-panel" className="sqd-panel" role="tabpanel" aria-labelledby={`sqd-tab-${tab}`}>
            <div aria-live="polite" className="sqd-live">
              {verdict && <p className={`sqd-verdict is-${verdict}`}>{solved ? 'Solved' : 'Not yet'}</p>}
            </div>
            {tab === 'result' && <>
              {solved && solution !== null && <p className="sqd-note">You looked at the solution first, so this one counts as attempted.</p>}
              {compare && <p className="sqd-hint">{compare}{surprise && <> That surprised you. Look at the WHERE step in Watch it run.</>}</p>}
              {result ? <ResultTable result={result} /> : <p className="sqd-note">Your results show up here.</p>}
              {diff && <div className="sqd-hint"><b>Where it went differently.</b>{diffText(diff, colsDiffer).map(t => <span key={t} className="sqd-line">{t}</span>)}</div>}
            </>}
            {tab === 'watch' && (!result
              ? <p className="sqd-note">Run your query first, then watch it step by step.</p>
              : !watch
                ? <button className="sqd-btn" onClick={() => setWatch(true)}>Watch your query run</button>
                : <>
                  {modelVisible && differs && <div className="sqd-chips" role="group" aria-label="Which query to watch">
                    <button className="sqd-chip" aria-pressed={watching === 'yours'} onClick={() => setWatching('yours')}>Yours</button>
                    <button className="sqd-chip" aria-pressed={watching === 'model'} onClick={() => setWatching('model')}>Model</button>
                  </div>}
                  {modelVisible && !differs && <p className="sqd-note">Your query matches the model solution.</p>}
                  {watching === 'yours' && !ranOk
                    ? <p className="sqd-error">Your query did not run, so there is nothing to watch yet. Fix the error and run it again.</p>
                    : <Suspense fallback={<Skeleton label="Getting the picture ready…" />}>
                      <QueryExplainer key={watchSql} sql={watchSql} compact autoPlay={false} title={watching === 'model' ? 'Model solution' : 'Your query'} />
                    </Suspense>}
                </>)}
            {tab === 'notes' && <>
              {solved && explain && <p className="sqd-hint"><b>Why this works.</b> {explain}</p>}
              <label htmlFor="sqd-think" className="sqd-lbl">Think out loud</label>
              <p className="sqd-note">Say why you wrote it that way. Private to this screen: it is not saved or sent anywhere.</p>
              <textarea id="sqd-think" className="sqd-think" value={thought} onChange={e => setThought(e.target.value)} />
              {solved && thought.trim() && <div className="sqd-compare">
                <p><b>You said</b>{thought}</p>
                {explain && <p><b>The model&rsquo;s reasoning</b>{explain}</p>}
              </div>}
              {solution && <>
                <span className="sqd-lbl">Reference solution</span>
                <pre className="sqd-code">{problem.solution}</pre>
                <ResultTable result={solution} />
              </>}
            </>}
          </div>
        </div>
      </section>
    </div>
  </div>
}

// Concept questions never need sql.js, so they get their own lazy component; hooks stay unconditional in each.
const ConceptDrill = lazy(() => import('./concepts/ConceptDrill'))
export default function Drill(props: DrillProps) {
  return isConceptId(props.item.id)
    ? <Suspense fallback={<p className="sqd-skel" role="status">Loading…</p>}><ConceptDrill {...props} /></Suspense>
    : <SqlDrill {...props} />
}
