import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Database } from 'sql.js'
import { LiveOrb } from '../../components/LiveOrb'
import { createDatabase, preview, runQuery, sameResult, type QueryResult } from './sqlEngine'
import { problems, schemaTables } from './sqlProblems'
import './sqlRound.css'

export interface SqlTurn {
  problem: { id: string; title: string; prompt: string }
  query: string
  passed: boolean
  error?: string
  resultPreview?: string
}
export interface SqlAttempt { problemId: string; title: string; query: string; passed: boolean }

interface Props {
  target: { company: string; role: string }
  onTurn(attempt: SqlTurn): Promise<string>
  onFinish(attempts: SqlAttempt[]): Promise<void>
  onClose(): void
}

// Per-problem working state, reset when moving to the next problem.
interface Work {
  query: string
  result: QueryResult | null
  solved: boolean
  hint: boolean
  followUp: string | null
  offline: boolean
  waiting: boolean
  reply: string
  replySaved: boolean
}
const fresh = (): Work => ({ query: '', result: null, solved: false, hint: false, followUp: null, offline: false, waiting: false, reply: '', replySaved: false })

const solutions: Record<string, QueryResult> = {}

export default function SqlRound({ target, onTurn, onFinish, onClose }: Props) {
  const [db, setDb] = useState<Database | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attemptLoad, setAttemptLoad] = useState(0)
  const [idx, setIdx] = useState(0)
  const [w, setW] = useState<Work>(fresh)
  const [verdict, setVerdict] = useState<'solved' | 'not-yet' | null>(null)
  const [finishing, setFinishing] = useState<'idle' | 'writing' | 'failed'>('idle')
  const attempts = useRef<Map<string, SqlAttempt>>(new Map())
  // ponytail: the transcript of follow-up answers lives only in this ref for the session; nothing reads it yet.
  const transcript = useRef<{ problemId: string; followUp: string; answer: string }[]>([])
  const mounted = useRef(true)
  const busy = useRef(false)
  const problem = problems[idx]
  const last = idx === problems.length - 1

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    let live = true
    createDatabase().then(d => { if (live) setDb(d) }, () => { if (live) setLoadFailed(true) })
    return () => { live = false }
  }, [attemptLoad])

  const patch = (p: Partial<Work>) => setW(prev => ({ ...prev, ...p }))

  const run = useCallback(async () => {
    if (!db || busy.current) return
    busy.current = true
    const p = problems[idx]
    try {
      const result = runQuery(db, w.query)
      solutions[p.id] ??= runQuery(db, p.solution)
      const passed = sameResult(result, solutions[p.id], p.ordered)
      const error = 'error' in result ? result.error : undefined
      attempts.current.set(p.id, { problemId: p.id, title: p.title, query: w.query, passed: passed || !!attempts.current.get(p.id)?.passed })
      setVerdict(passed ? 'solved' : 'not-yet')
      setW(prev => ({ ...prev, result, solved: prev.solved || passed, waiting: true, followUp: null, offline: false, replySaved: false, reply: '' }))
      let followUp: string | null = null
      let offline = false
      try {
        followUp = await onTurn({ problem: { id: p.id, title: p.title, prompt: p.prompt }, query: w.query, passed, error, resultPreview: preview(result) || undefined })
      } catch {
        offline = true
      }
      if (mounted.current) patch({ waiting: false, followUp, offline })
    } finally {
      busy.current = false
    }
  }, [db, idx, w.query, onTurn])

  const finish = async () => {
    const list = [...attempts.current.values()]
    if (!list.length) return onClose()
    setFinishing('writing')
    try {
      await onFinish(list)
      if (mounted.current) onClose()
    } catch {
      if (mounted.current) setFinishing('failed')
    }
  }

  const next = () => {
    if (w.followUp && w.reply.trim() && !w.replySaved) saveReply()
    if (last) return void finish()
    setIdx(i => i + 1)
    setW(fresh())
    setVerdict(null)
  }

  function saveReply() {
    if (!w.followUp || !w.reply.trim()) return
    transcript.current.push({ problemId: problem.id, followUp: w.followUp, answer: w.reply.trim() })
    patch({ replySaved: true })
  }

  const onEditorKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void run(); return }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      const el = e.currentTarget
      const { selectionStart: a, selectionEnd: b } = el
      patch({ query: `${w.query.slice(0, a)}  ${w.query.slice(b)}` })
      requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2)) // keep the caret after the inserted spaces
    }
  }

  if (finishing !== 'idle') {
    return <div className="mirror-landing sql-round"><main className="sql-main sql-center ml-glass" role="status">
      {finishing === 'writing'
        ? <><LiveOrb compact state="thinking" label="The interviewer is writing" /><p className="sql-lead">Writing your debrief…</p></>
        : <><p className="sql-lead">Your debrief did not save.</p><div className="sql-row"><button className="ml-btn" onClick={() => void finish()}>Try again</button><button className="ml-btn ml-btn--quiet" onClick={onClose}>Close</button></div></>}
    </main></div>
  }

  const result = w.result
  const ready = !!db
  return <div className="mirror-landing sql-round">
    <header className="sql-top">
      <div>
        <p className="ml-eyebrow">SQL round</p>
        <h1>{target.role} at {target.company}</h1>
      </div>
      <div className="sql-top-right">
        <span className="sql-progress">Problem {idx + 1} of {problems.length}</span>
        <button className="ml-btn ml-btn--quiet ml-btn--sm" onClick={() => void finish()}>Finish now</button>
      </div>
    </header>

    <main className="sql-main">
      <aside className="sql-side ml-glass">
        <h2>{problem.title}</h2>
        <p className="sql-prompt">{problem.prompt}</p>
        {w.hint
          ? <p className="sql-hint"><b>Hint.</b> {problem.hint}</p>
          : <button className="ml-btn ml-btn--quiet ml-btn--sm" onClick={() => patch({ hint: true })}>Show hint</button>}
        <details className="sql-schema">
          <summary>Tables</summary>
          {schemaTables.map(t => <div key={t.name}><b>{t.name}</b><ul>{t.columns.map(c => <li key={c}>{c}</li>)}</ul></div>)}
        </details>
      </aside>

      <section className="sql-work">
        <div className="sql-editor ml-glass">
          <label className="ml-sr" htmlFor="sql-query">SQL query</label>
          <textarea id="sql-query" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={w.query}
            placeholder="SELECT ..." onChange={e => patch({ query: e.target.value })} onKeyDown={onEditorKey} />
          <div className="sql-row">
            <button className="ml-btn" disabled={!ready} onClick={() => void run()}>Run</button>
            <span className="sql-note">{loadFailed ? '' : ready ? 'Ctrl or Cmd + Enter also runs it.' : 'Setting up your practice database…'}</span>
          </div>
          {loadFailed && <p className="sql-error" role="alert">The practice database did not load. <button className="sql-link" onClick={() => { setLoadFailed(false); setAttemptLoad(n => n + 1) }}>Retry</button></p>}
        </div>

        <div className="sql-results ml-glass" aria-live="polite">
          {verdict && <p className={`sql-verdict is-${verdict}`}>{verdict === 'solved' ? 'Solved' : 'Not yet'}</p>}
          {result && ('error' in result
            ? <p className="sql-error">{result.error}</p>
            : result.rows.length === 0
              ? <p className="sql-note">The query ran and returned no rows.</p>
              : <>
                <div className="sql-table-wrap" tabIndex={0} role="region" aria-label="Query result">
                  <table><thead><tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
                    <tbody>{result.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v === null ? <i>NULL</i> : String(v)}</td>)}</tr>)}</tbody></table>
                </div>
                {result.total > result.rows.length && <p className="sql-note">Showing the first {result.rows.length} of {result.total} rows.</p>}
              </>)}
          {!result && <p className="sql-note">Your results show up here.</p>}
        </div>

        {(w.waiting || w.followUp || w.offline) && <div className="sql-speech ml-glass">
          <div className="sql-orb"><LiveOrb compact state={w.waiting ? 'thinking' : w.followUp ? 'speaking' : 'idle'} label="Interviewer" /></div>
          <div className="sql-speech-body">
            {w.waiting && <p className="sql-note">The interviewer is reading your query…</p>}
            {w.offline && <p>The interviewer is offline. Keep going.</p>}
            {w.followUp && <>
              <p className="sql-follow">{w.followUp}</p>
              <label className="ml-sr" htmlFor="sql-reply">Your answer</label>
              <textarea id="sql-reply" className="sql-reply" rows={3} value={w.reply} placeholder="Answer in your own words" onChange={e => patch({ reply: e.target.value, replySaved: false })} />
              <div className="sql-row">
                <button className="ml-btn ml-btn--quiet ml-btn--sm" disabled={!w.reply.trim() || w.replySaved} onClick={saveReply}>{w.replySaved ? 'Answer kept' : 'Keep my answer'}</button>
              </div>
            </>}
          </div>
        </div>}

        <div className="sql-row sql-next">
          {w.solved
            ? <button className="ml-btn" onClick={next}>{last ? 'Finish and get my debrief' : 'Next problem'}</button>
            : <button className="ml-btn ml-btn--quiet" onClick={next}>{last ? 'Move on and finish' : 'Move on'}</button>}
        </div>
      </section>
    </main>
  </div>
}
