import { useCallback, useEffect, useRef, useState } from 'react'
import './sessions.css'
import { api, type InterviewSession, type InterviewSummary } from '../lib/api'
import SessionAnswers from '../features/replay/SessionAnswers'
import type { Turn } from '../lib/api'
import FallbackNote from '../components/FallbackNote'
import { BarChart3, Check, RotateCcw, Target } from 'lucide-react'

const PAGE = 20
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

/** Every finished session, newest first, read from the server so a reload loses nothing. */
export default function Sessions({ openId, refreshKey, onPractise, onSaveStory }: {
  /** The session that just finished, opened first when there is one. */
  openId: string | null
  /** Changes when new notes land, so the list reads again. */
  refreshKey?: string
  onPractise: () => void
  /** Offered next to each answer when provided (the story bank wires it). */
  onSaveStory?: (turn: Turn) => void
}) {
  const [rows, setRows] = useState<InterviewSummary[] | null>(null)
  const [more, setMore] = useState(false)
  const [selected, setSelected] = useState<string | null>(openId)
  const [detail, setDetail] = useState<InterviewSession | null>(null)
  const [listFailed, setListFailed] = useState(false)
  const [detailFailed, setDetailFailed] = useState(false)
  const [notesFailed, setNotesFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0) // bump to read the list and the open session again
  const cursor = useRef('')

  const take = useCallback((page: InterviewSummary[], before?: string) => {
    setRows(prev => [...(before ? (prev ?? []) : []), ...page.filter(i => i.status === 'completed')])
    setMore(page.length === PAGE) // the cursor walks every row, finished or not
    if (page.length) cursor.current = page[page.length - 1].createdAt
    setListFailed(false)
  }, [])

  useEffect(() => {
    let live = true
    api.listInterviews({ limit: PAGE }).then(page => live && take(page)).catch(() => live && setListFailed(true))
    return () => { live = false }
  }, [take, refreshKey, tick])

  const showOlder = () => api.listInterviews({ limit: PAGE, before: cursor.current }).then(page => take(page, cursor.current)).catch(() => setListFailed(true))

  const current = selected ?? openId ?? rows?.[0]?.id ?? null
  useEffect(() => {
    if (!current) return
    let live = true
    api.getInterview(current).then(d => { if (live) { setDetail(d); setDetailFailed(false) } }).catch(() => live && setDetailFailed(true))
    return () => { live = false }
  }, [current, tick])

  const writeNotes = async () => {
    if (!current || busy) return
    setBusy(true)
    setNotesFailed(false)
    try {
      await api.reflect(current)
      setTick(t => t + 1)
    } catch {
      setNotesFailed(true)
    }
    setBusy(false)
  }

  const shown = detail && detail.id === current ? detail : null
  const reflection = shown?.reflection ?? null
  return (
    <div className="workspace-content sessions">
      <div className="page-title">
        <div>
          <p className="eyebrow">YOUR PRACTICE</p>
          <h1>Sessions</h1>
          <p>Every practice you have finished, newest first.</p>
        </div>
        <button type="button" className="button button--primary" onClick={onPractise}><RotateCcw size={15} /> Practise again</button>
      </div>

      {listFailed && (
        <div className="empty-state" role="status">
          <p>Could not load your sessions. They are safe. Try again.</p>
          <button type="button" className="button button--secondary" onClick={() => setTick(t => t + 1)}>Try again</button>
        </div>
      )}

      {rows && rows.length === 0 && !listFailed && (
        <div className="empty-state">
          <BarChart3 size={30} />
          <h2>No finished sessions yet.</h2>
          <p>Finish one practice and your notes will be here.</p>
          <button type="button" className="button button--primary" onClick={onPractise}>Start a practice</button>
        </div>
      )}

      {rows && rows.length > 0 && (
        <ul className="sessions-list" role="list">
          {rows.map(s => (
            <li key={s.id}>
              <button type="button" className="sessions-row" aria-current={s.id === current} onClick={() => { setSelected(s.id); setNotesFailed(false) }}>
                <strong>{s.role}</strong>
                <span>{when(s.createdAt)} · {plural(s.answered, 'answer')}</span>
                <p>{s.notes ? s.notes.keepWorkingOn : 'Notes not written yet.'}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {more && <button type="button" className="button button--ghost" onClick={() => void showOlder()}>Show older sessions</button>}

      {current && (
        <section className="sessions-detail" aria-live="polite">
          {detailFailed && !shown && (
            <p role="status">
              Could not open this session.{' '}
              <button type="button" className="button button--secondary" onClick={() => setTick(t => t + 1)}>Try again</button>
            </p>
          )}
          {shown && reflection && (
            <>
              <section className="reflection-block">
                <div className="card-label"><Check size={16} /> WHAT STOOD OUT</div>
                <ul role="list">{reflection.evidence.map((item, i) => <li key={i}><blockquote>“{item.quote}”</blockquote></li>)}</ul>
              </section>
              <section className="reflection-block">
                <div className="card-label"><Target size={16} /> KEEP WORKING ON</div>
                <h2>{reflection.focus}</h2>
              </section>
              {reflection.suggestion && (
                <section className="next-step">
                  <div><div className="eyebrow">SUGGESTION</div><h3>{reflection.suggestion}</h3></div>
                  <button type="button" className="button button--primary" onClick={onPractise}>Try it in a new practice</button>
                </section>
              )}
              <FallbackNote source={reflection.source} />
            </>
          )}
          {shown && <SessionAnswers key={shown.id} interviewId={shown.id} turns={shown.turns} onSaveStory={onSaveStory} />}
          {shown && !reflection && (
            <div className="sessions-actions">
              <p>Your answers are saved. The notes are not written yet.</p>
              {notesFailed && <p role="status">That did not go through. Your answers are safe. Try again.</p>}
              <button type="button" className="button button--primary" disabled={busy} onClick={() => void writeNotes()}>
                {notesFailed ? 'Try again' : 'Write my notes'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
