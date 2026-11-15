import { Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Database } from 'sql.js'
import { runQuery, sameResult, type QueryResult } from '../../../pages/target/sqlEngine'
import type { AttemptReport } from '../../types'
import { createPracticeDb, practiceTables } from '../db'
import { QueryExplainer, TablePeek } from '../explain'
import { tablesIn } from '../lesson/logic'
import type { SqlProblem } from '../problems'
import type { ConceptQuestion } from '../concepts/types'
import {
  PRESETS, buildMock, clamp, clockText, customPreset, describe, makeClock, milestone, outcome, remainingMs, revisit, summarise,
  type Custom, type Kind, type MockPreset, type QResult,
} from './mockLogic'
import '../drill.css'
import '../concepts/concept.css'
import './mock.css'

// Owner's request: "build it in our database and for mock test". Timed, exam-mode practice: no hints, no explanations until the end.
export interface MockProps {
  problems: SqlProblem[]
  concepts: ConceptQuestion[]
  solved: Set<string>
  onAttempt(r: AttemptReport): void
  /** Opens a learning module in the path (Path owns that). */
  openModule(moduleId: string): void
  /** Which module a problem belongs to, for the revisit list. */
  moduleOf(id: string): { id: string; title: string } | undefined
  /** True while a test is running, so Path can hide its own chrome. */
  onLive?(live: boolean): void
  onBack(): void
  /** Preset to highlight and scroll to on the presets screen (preset id). */
  initialPreset?: string
}

interface Ans { draft: string; picked: number | null; sub: string | number | null; tries: number; ok: boolean; first: boolean }
interface St {
  v: 1; presetId: string; name: string; minutes: number; startedAt: number; deadline: number
  qs: { id: string; kind: Kind }[]; ans: Record<string, Ans>; flags: string[]; seen: string[]; spent: Record<string, number>; idx: number
}
const KEY = 'mirror.sql.mock.v1'
const blank = (): Ans => ({ draft: '', picked: null, sub: null, tries: 0, ok: false, first: false })

function load(): St | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as St | null
    return s && s.v === 1 && Array.isArray(s.qs) && s.qs.length && Number.isFinite(s.deadline) && Number.isFinite(s.startedAt) ? s : null
  } catch { return null }
}
const save = (s: St | null) => { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY) } catch { /* storage blocked: the test still runs, it just cannot resume */ } }

function ResultTable({ result }: { result: QueryResult }) {
  // ponytail: small copy of the drill's table (Drill.tsx does not export it); share it if a third screen needs it.
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

// a wrapper, so the render-purity lint sees clock reads in handlers and effects as such
const nowMs = () => Date.now()
const mins = (sec: number) => (sec < 60 ? `${sec} sec` : `${Math.round(sec / 60)} min`)

export default function MockTest(props: MockProps) {
  const [mode, setMode] = useState<{ t: 'pick' } | { t: 'run'; st: St } | { t: 'done'; st: St; usedMs: number }>({ t: 'pick' })
  const { onLive } = props
  useEffect(() => { onLive?.(mode.t === 'run'); return () => onLive?.(false) }, [mode.t, onLive])
  if (mode.t === 'run') return <Exam key={mode.st.startedAt} {...props} st0={mode.st} onDone={(st, usedMs) => { save(null); setMode({ t: 'done', st, usedMs }) }} />
  if (mode.t === 'done') return <Results {...props} st={mode.st} usedMs={mode.usedMs} onAgain={() => start(mode.st.presetId)} onPresets={() => setMode({ t: 'pick' })} />
  return <Picker {...props} onStart={p => start(p)} onResume={st => setMode({ t: 'run', st })} />

  function start(p: string | MockPreset, custom?: Custom) {
    const preset = typeof p === 'string' ? (p === 'custom' ? customPreset(custom ?? lastCustom) : PRESETS.find(x => x.id === p)) : p
    if (!preset) return
    if (preset.id === 'custom') lastCustom = custom ?? lastCustom
    const def = buildMock(preset, props.problems, props.concepts, props.solved, nowMs() % 2147483647)
    if (!def.items.length) return
    const st: St = { v: 1, presetId: def.presetId, name: def.name, minutes: def.minutes, ...makeClock(def.minutes, nowMs()), qs: def.items, ans: {}, flags: [], seen: [def.items[0].id], spent: {}, idx: 0 }
    save(st)
    setMode({ t: 'run', st })
  }
}
// ponytail: "Retake" on a custom test reuses the last custom settings held in module memory; it is lost on page reload (then it falls back to defaults).
let lastCustom: Custom = { count: 4, minutes: 30, concepts: true, difficulty: 0 }

// ---------------- preset screen ----------------
function Picker({ problems, concepts, onStart, onResume, onBack, initialPreset }: MockProps & { onStart(p: MockPreset): void; onResume(st: St): void }) {
  const [saved, setSaved] = useState<St | null>(() => {
    const s = load()
    // forget a saved test whose questions are no longer in the bank
    return s && s.qs.every(q => (q.kind === 'sql' ? problems : concepts).some(p => p.id === q.id)) ? s : null
  })
  const [c, setC] = useState<Custom>(lastCustom)
  const [now] = useState(nowMs)
  const picked = useRef<HTMLLIElement | null>(null)
  useEffect(() => { picked.current?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }, [])
  const none = !problems.length && !concepts.length
  const left = saved ? remainingMs(saved.startedAt, saved.deadline, now) : 0
  const set = (patch: Partial<Custom>) => setC(p => { const n = { ...p, ...patch }; lastCustom = n; return n })
  return (
    <section className="mk-pick" aria-label="Mock test">
      <p className="sp-lede">A timed practice round. No hints and no explanations until the end, like the real thing.</p>
      {saved && (
        <div className="ml-glass mk-resume" role="group" aria-label="Unfinished mock test">
          <span><b>{saved.name}</b> · {left > 0 ? `${clockText(left)} left` : 'time is up'}</span>
          <span className="sqd-row">
            <button type="button" className="sqd-run" onClick={() => onResume(saved)}>Resume your mock test</button>
            <button type="button" className="sqd-btn" onClick={() => { save(null); setSaved(null) }}>Discard</button>
          </span>
        </div>
      )}
      {none && <p className="pr-note" role="status">No questions are available yet.</p>}
      <ul className="mk-cards">
        {PRESETS.map(p => (
          <li key={p.id} ref={p.id === initialPreset ? picked : undefined} className={`ml-glass mk-card${p.id === initialPreset ? ' is-picked' : ''}`}>
            <h2>{p.name}</h2>
            <p>{describe(p)}</p>
            <button type="button" className="sqd-run" disabled={none} onClick={() => onStart(p)}>Start</button>
          </li>
        ))}
        <li className="ml-glass mk-card mk-own">
          <h2>Build your own</h2>
          <div className="mk-fields">
            <label>Questions<input type="number" min={2} max={8} value={c.count} onChange={e => set({ count: Number(e.target.value) })} onBlur={() => set({ count: clamp(c.count, 2, 8) })} /></label>
            <label>Minutes<input type="number" min={10} max={90} step={5} value={c.minutes} onChange={e => set({ minutes: Number(e.target.value) })} onBlur={() => set({ minutes: clamp(c.minutes, 10, 90) })} /></label>
          </div>
          <div className="sqd-chips" role="group" aria-label="Include concept questions">
            <button type="button" className="sqd-chip" aria-pressed={c.concepts} onClick={() => set({ concepts: !c.concepts })}>Concept questions: {c.concepts ? 'yes' : 'no'}</button>
          </div>
          <div className="sqd-chips" role="group" aria-label="Difficulty">
            {([[0, 'Any'], [1, 'Beginner'], [2, 'Pro'], [3, 'Advanced']] as const).map(([v, t]) => <button key={v} type="button" className="sqd-chip" aria-pressed={c.difficulty === v} onClick={() => set({ difficulty: v })}>{t}</button>)}
          </div>
          <p>{describe(customPreset(c))}</p>
          <button type="button" className="sqd-run" disabled={none} onClick={() => onStart(customPreset(c))}>Start</button>
        </li>
      </ul>
      <button type="button" className="sqd-link" onClick={onBack}>Back</button>
    </section>
  )
}

// ---------------- the exam ----------------
function Exam({ problems, concepts, onAttempt, st0, onDone }: MockProps & { st0: St; onDone(st: St, usedMs: number): void }) {
  const [st, setSt] = useState(st0)
  const [db, setDb] = useState<Database | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadTry, setLoadTry] = useState(0)
  const [now, setNow] = useState(nowMs)
  const [confirm, setConfirm] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [dataOpen, setDataOpen] = useState(false)
  const [mob, setMob] = useState<'q' | 'a'>('q')
  const [say, setSay] = useState('')
  const mark = useRef(0)
  useEffect(() => { mark.current = nowMs() }, [])
  const said = useRef<number | null>(null)
  const finished = useRef(false)
  const pById = useMemo(() => new Map(problems.map(p => [p.id, p])), [problems])
  const cById = useMemo(() => new Map(concepts.map(c => [c.id, c])), [concepts])

  useEffect(() => { save(st) }, [st])
  useEffect(() => {
    let live = true
    createPracticeDb().then(d => { if (live) setDb(d) }, () => { if (live) setLoadFailed(true) })
    return () => { live = false }
  }, [loadTry])

  const q = st.qs[st.idx]
  const left = remainingMs(st.startedAt, st.deadline, now)
  const total = st.deadline - st.startedAt
  useEffect(() => { const t = setInterval(() => setNow(nowMs()), 1000); return () => clearInterval(t) }, [])

  // submit the open answer into a state copy; reports once per Submit answer
  const submitInto = (s: St, id: string): St => {
    const a = s.ans[id] ?? blank()
    const kind = s.qs.find(x => x.id === id)?.kind
    const secs = Math.min(3600, Math.round(((s.spent[id] ?? 0) + (s.qs[s.idx].id === id ? nowMs() - mark.current : 0)) / 1000))
    let ok = false, sub: string | number
    if (kind === 'concept') {
      const c = cById.get(id)
      if (!c || a.picked === null) return s
      ok = a.picked === c.answer; sub = a.picked
      onAttempt({ itemId: id, track: 'sql', topic: c.topic, level: c.level, correct: ok, seconds: secs, hintsUsed: 0 })
    } else {
      const p = pById.get(id)
      if (!p || !db || !a.draft.trim()) return s
      ok = sameResult(runQuery(db, a.draft), runQuery(db, p.solution), p.ordered); sub = a.draft
      onAttempt({ itemId: id, track: 'sql', topic: p.topic, level: p.level, correct: ok, seconds: secs, hintsUsed: 0 })
    }
    return { ...s, ans: { ...s.ans, [id]: { ...a, sub, tries: a.tries + 1, ok, first: a.tries === 0 ? ok : a.first } } }
  }
  const pending = (s: St, id: string) => { const a = s.ans[id]; return !!a && (s.qs.find(x => x.id === id)?.kind === 'concept' ? a.picked !== null && a.picked !== a.sub : a.draft.trim() !== '' && a.draft !== a.sub) }
  const bank = (s: St): St => ({ ...s, spent: { ...s.spent, [s.qs[s.idx].id]: (s.spent[s.qs[s.idx].id] ?? 0) + nowMs() - mark.current } })

  const finish = () => {
    if (finished.current) return
    finished.current = true
    let s = bank(st)
    const id = s.qs[s.idx].id
    if (pending(s, id)) s = submitInto(s, id) // the open question is submitted as it stands
    onDone(s, Math.min(total, nowMs() - st.startedAt))
  }
  const finishRef = useRef(finish)
  useEffect(() => { finishRef.current = finish })
  useEffect(() => { if (left <= 0 && (db || loadFailed)) finishRef.current() }, [left, db, loadFailed])

  // calm announcements at 10, 5 and 1 minutes; no sound
  const ms = milestone(left, total)
  useEffect(() => {
    if (ms !== null && ms !== said.current && (said.current === null || ms < said.current)) { said.current = ms; setSay(`${ms} minute${ms === 1 ? '' : 's'} left.`) }
  }, [ms])

  const go = (i: number) => {
    if (i === st.idx || i < 0 || i >= st.qs.length) return
    setSt(s => ({ ...bank(s), idx: i, seen: s.seen.includes(s.qs[i].id) ? s.seen : [...s.seen, s.qs[i].id] }))
    mark.current = nowMs(); setResult(null); setMob('q'); setDataOpen(false)
  }
  const patch = (p: Partial<Ans>) => setSt(s => ({ ...s, ans: { ...s.ans, [q.id]: { ...(s.ans[q.id] ?? blank()), ...p } } }))
  const flag = () => setSt(s => ({ ...s, flags: s.flags.includes(q.id) ? s.flags.filter(x => x !== q.id) : [...s.flags, q.id] }))
  const a = st.ans[q.id] ?? blank()
  const problem = q.kind === 'sql' ? pById.get(q.id) : undefined
  const concept = q.kind === 'concept' ? cById.get(q.id) : undefined

  const run = () => { if (db && problem) { setResult(runQuery(db, a.draft)); setMob('a') } }
  const submit = () => { setSt(submitInto(st, q.id)); setMob('a') } // not inside an updater: onAttempt must fire once
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); return }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      const el = e.currentTarget, { selectionStart: s, selectionEnd: t } = el
      patch({ draft: `${a.draft.slice(0, s)}  ${a.draft.slice(t)}` })
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2))
    }
  }

  const state = (id: string): 'new' | 'progress' | 'answered' => {
    const x = st.ans[id]
    return x && x.tries > 0 ? 'answered' : (x && (x.draft.trim() || x.picked !== null)) || st.seen.includes(id) ? 'progress' : 'new'
  }
  const stateText = { new: 'not started', progress: 'in progress', answered: 'answered' }
  const unanswered = st.qs.map((x, i) => ({ i, x })).filter(({ x }) => !(st.ans[x.id]?.tries) && !pending(st, x.id))
  const title = (id: string) => pById.get(id)?.title ?? cById.get(id)?.title ?? id
  const tableNames = problem ? (problem.tables?.length ? problem.tables : tablesIn(problem.solution, practiceTables.map(t => t.name))) : []
  const submitted = a.tries > 0 && (concept ? a.picked === a.sub : a.draft === a.sub)

  if (!problem && !concept) return <div className="mirror-landing sqd sqd--gone"><p className="sqd-error" role="alert">This question is not available.</p><button className="sqd-btn" onClick={() => go(st.idx + 1)}>Next question</button></div>

  return <div className="mirror-landing sqd mk" data-mob={mob}>
    <header className="sqd-top mk-top">
      <div className="sqd-head"><h1>{st.name}</h1><span className="sqd-crumb">Question {st.idx + 1} of {st.qs.length}</span></div>
      <div className="sqd-row">
        <span className={`mk-clock${left <= 300000 ? ' is-low' : ''}`} role="timer" aria-live="off" aria-label="Time left">{clockText(left)}</span>
        <button type="button" className="sqd-run" onClick={() => setConfirm(true)}>Submit test</button>
      </div>
    </header>
    <span className="ml-sr" role="status" aria-live="polite">{say}</span>

    <nav className="mk-nav" aria-label="Questions">
      {st.qs.map((x, i) => {
        const s = state(x.id), f = st.flags.includes(x.id)
        return <button key={x.id} type="button" className={`mk-n is-${s}${i === st.idx ? ' is-cur' : ''}${f ? ' is-flag' : ''}`} aria-current={i === st.idx ? 'true' : undefined}
          aria-label={`Question ${i + 1}, ${stateText[s]}${f ? ', flagged' : ''}`} onClick={() => go(i)}>{i + 1}{f && <span className="mk-flag" aria-hidden="true" />}</button>
      })}
      <button type="button" className="sqd-btn mk-flagbtn" aria-pressed={st.flags.includes(q.id)} onClick={flag}>Flag for review</button>
    </nav>

    <div className="sqd-mobtabs" role="group" aria-label="Show">
      <button className="sqd-mt" aria-pressed={mob === 'q'} onClick={() => setMob('q')}>Question</button>
      <button className="sqd-mt" aria-pressed={mob === 'a'} onClick={() => setMob('a')}>Answer</button>
    </div>

    {confirm && <div className="mk-confirm" role="dialog" aria-label="Submit the test" onKeyDown={e => { if (e.key === 'Escape') setConfirm(false) }}>
      <div className="mk-confirm-box">
        <h2>Submit the test?</h2>
        {unanswered.length ? <>
          <p>These have no answer yet:</p>
          <ul>{unanswered.map(({ i, x }) => <li key={x.id}>{i + 1}. {title(x.id)}</li>)}</ul>
        </> : <p>Every question has an answer. You can still change them until you submit.</p>}
        <div className="sqd-row">
          <button type="button" className="sqd-run" autoFocus onClick={() => { setConfirm(false); finish() }}>Submit test</button>
          <button type="button" className="sqd-btn" onClick={() => setConfirm(false)}>Keep working</button>
        </div>
      </div>
    </div>}

    <div className="sqd-body">
      <aside className="sqd-brief" aria-label="The question">
        {problem && <>
          <h2>{problem.topic} · {problem.pattern ?? `Level ${problem.level}`}</h2>
          {problem.scenario && <p className="sqd-scenario">{problem.scenario}</p>}
          <p className="sqd-task">{problem.prompt}</p>
          {problem.output && <div className="sqd-blk"><h2>You will return</h2><ul className="sqd-cols"><li><code>{problem.output}</code></li></ul></div>}
          {tableNames.length > 0 && <details className="sqd-blk sqd-data" open={dataOpen} onToggle={e => setDataOpen(e.currentTarget.open)}>
            <summary><h2>The data</h2><span className="sqd-names">{tableNames.join(', ')}</span></summary>
            {dataOpen && <Suspense fallback={<p className="sqd-skel" role="status">Laying out the tables…</p>}><TablePeek tables={tableNames} sql={problem.solution} maxRows={3} /></Suspense>}
          </details>}
        </>}
        {concept && <>
          <h2>{concept.topic}</h2>
          <p className="sqd-task">{concept.question}</p>
        </>}
      </aside>

      <section className="sqd-work mk-work" aria-label="Your answer">
        {problem && <>
          <label className="ml-sr" htmlFor="mk-query">SQL query</label>
          <textarea id="mk-query" className="sqd-editor" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={a.draft} placeholder="SELECT ..." onChange={e => patch({ draft: e.target.value })} onKeyDown={onKey} />
          <div className="sqd-actions">
            <button type="button" className="sqd-btn" disabled={!db || !a.draft.trim()} onClick={run}>Run</button>
            <button type="button" className="sqd-run" disabled={!db || !a.draft.trim()} onClick={submit}>Submit answer</button>
            <span className="sqd-note" role="status">{loadFailed ? '' : !db ? 'Setting up your practice database…' : submitted ? 'Answer submitted. You can change it until the test ends.' : a.tries > 0 ? 'Changed since you last submitted.' : 'Run tests your query. Submit answer records it.'}</span>
            {loadFailed && <span className="sqd-error" role="alert">The practice database did not load. <button className="sqd-link" onClick={() => { setLoadFailed(false); setLoadTry(n => n + 1) }}>Retry</button></span>}
          </div>
          <div className="sqd-out"><div className="sqd-panel" aria-label="Result of Run">{result ? <ResultTable result={result} /> : <p className="sqd-note">Run shows your result here.</p>}</div></div>
        </>}
        {concept && <>
          <div className="cc-opts" role="radiogroup" aria-label="Choose an answer">
            {concept.options.map((o, i) => (
              <label key={i} className={`cc-opt${a.picked === i ? ' is-on' : ''}`}>
                <input type="radio" name={`mk-${q.id}`} checked={a.picked === i} onChange={() => patch({ picked: i })} />
                <kbd aria-hidden="true">{i + 1}</kbd><span>{o}</span>
              </label>
            ))}
          </div>
          <div className="sqd-actions">
            <button type="button" className="sqd-run" disabled={a.picked === null} onClick={submit}>Submit answer</button>
            <span className="sqd-note" role="status">{submitted ? 'Answer submitted. You can change it until the test ends.' : a.tries > 0 ? 'Changed since you last submitted.' : ''}</span>
          </div>
        </>}
        <div className="sqd-actions mk-step">
          <button type="button" className="sqd-btn" disabled={st.idx === 0} onClick={() => go(st.idx - 1)}>Previous</button>
          <button type="button" className="sqd-btn" disabled={st.idx >= st.qs.length - 1} onClick={() => go(st.idx + 1)}>Next</button>
        </div>
      </section>
    </div>
  </div>
}

// ---------------- results ----------------
function Results({ problems, concepts, moduleOf, openModule, st, usedMs, onAgain, onPresets }: MockProps & { st: St; usedMs: number; onAgain(): void; onPresets(): void }) {
  const results: QResult[] = st.qs.map(x => {
    const p = x.kind === 'sql' ? problems.find(y => y.id === x.id) : undefined
    const c = x.kind === 'concept' ? concepts.find(y => y.id === x.id) : undefined
    const a = st.ans[x.id] ?? blank()
    return { id: x.id, kind: x.kind, title: p?.title ?? c?.title ?? x.id, topic: p?.topic ?? c?.topic ?? '', pattern: p?.pattern, moduleId: x.kind === 'sql' ? moduleOf(x.id)?.id : undefined, tries: a.tries, solved: a.tries > 0 && a.ok, first: a.first && a.ok, seconds: Math.round((st.spent[x.id] ?? 0) / 1000) }
  })
  const s = summarise(results, Math.round(usedMs / 1000), st.minutes * 60)
  const list = revisit(results)
  const line = (n: number, w: string) => (n ? `${n} ${w}` : '')
  const words = [line(s.firstTry, 'solved first try'), line(s.afterRetries, 'solved after changes'), line(s.notSolved, 'not solved yet'), line(s.skipped, 'skipped')].filter(Boolean).join(', ')
  return (
    <section className="mk-res" aria-label="Mock test results">
      <h2>{st.name}: finished</h2>
      <p className="mk-sum" role="status">{words || 'No answers were submitted.'}. You used {mins(s.usedSeconds)} of {mins(s.allowedSeconds)}.</p>
      <div className="sqd-row">
        <button type="button" className="sqd-run" onClick={onAgain}>Retake with new questions</button>
        <button type="button" className="sqd-btn" onClick={onPresets}>Back to presets</button>
      </div>
      {list.length > 0 && <div className="ml-glass mk-rev">
        <h3>What to revisit</h3>
        <ul>{list.map(r => {
          const m = r.moduleId ? moduleOf(results.find(x => x.moduleId === r.moduleId)?.id ?? '') : undefined
          return <li key={r.key}><span>{m?.title ?? r.topic} <i>{r.why}</i></span>{r.moduleId && <button type="button" className="sqd-link" onClick={() => openModule(r.moduleId!)}>Open module</button>}</li>
        })}</ul>
      </div>}
      <ol className="mk-rows">
        {results.map((r, i) => <Row key={r.id} n={i + 1} r={r} st={st} problems={problems} concepts={concepts} />)}
      </ol>
    </section>
  )
}

function Row({ n, r, st, problems, concepts }: { n: number; r: QResult; st: St; problems: SqlProblem[]; concepts: ConceptQuestion[] }) {
  const [watch, setWatch] = useState(false)
  const p = problems.find(x => x.id === r.id), c = concepts.find(x => x.id === r.id)
  const a = st.ans[r.id]
  return (
    <li className="ml-glass mk-row">
      <details>
        <summary>
          <span className="mk-rn">{n}</span>
          <span className="mk-rt"><b>{r.title}</b>{r.pattern && <i>{r.pattern}</i>}</span>
          <span className={`mk-out is-${outcome(r) === 'Not yet' || outcome(r) === 'Skipped' ? 'no' : 'yes'}`}>{outcome(r)}</span>
          <span className="mk-time">{mins(r.seconds)}</span>
        </summary>
        <div className="mk-body">
          {p && <>
            <p className="sqd-task">{p.prompt}</p>
            <span className="sqd-lbl">Your query</span>
            <pre className="sqd-code">{typeof a?.sub === 'string' ? a.sub : 'Nothing was submitted.'}</pre>
            <span className="sqd-lbl">Model solution</span>
            <pre className="sqd-code">{p.solution}</pre>
            {p.explain && <p className="sqd-hint"><b>Why this works.</b> {p.explain}</p>}
            {p.followUp && <p className="sqd-hint"><b>The interviewer might ask next:</b> {p.followUp}</p>}
            {!watch ? <button type="button" className="sqd-btn" onClick={() => setWatch(true)}>Watch it run</button>
              : <Suspense fallback={<p className="sqd-skel" role="status">Getting the picture ready…</p>}><QueryExplainer sql={p.solution} compact autoPlay={false} title="Model solution" /></Suspense>}
          </>}
          {c && <>
            <p className="sqd-task">{c.question}</p>
            <p className="sqd-note">Your answer: {typeof a?.sub === 'number' ? c.options[a.sub] : 'Nothing was submitted.'}</p>
            <p className="sqd-note">Right answer: {c.options[c.answer]}</p>
            <p className="sqd-hint">{c.why}</p>
            {c.followUp && <p className="sqd-hint"><b>The interviewer might ask next:</b> {c.followUp}</p>}
          </>}
        </div>
      </details>
    </li>
  )
}
