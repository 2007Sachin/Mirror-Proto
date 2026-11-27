import { useCallback, useEffect, useRef, useState } from 'react'
import PageSkeleton from '../ui/PageSkeleton'
import './sessions.css'
import '../styles/app-shell.css'
import { api, type InterviewSession, type InterviewSummary } from '../lib/api'
import { reviewSession, type SessionReview } from '../features/sessions/review'
import FallbackNote from '../components/FallbackNote'
import FolderCard from '../components/FolderCard'
import FollowedTap from '../features/room/FollowedTap'

const PAGE = 20
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** Finished sessions as compact cards. One card opens a review with the same sections every time. */
export default function Sessions({ openId, refreshKey, onPractise, onSaveStory }: {
  openId: string | null
  refreshKey?: string
  onPractise: () => void
  onSaveStory?: (turn: { id: string; question: string; answer: string }) => void
}) {
  const [rows, setRows] = useState<InterviewSummary[] | null>(null)
  const [more, setMore] = useState(false)
  const [cursor, setCursor] = useState('')
  const [selected, setSelected] = useState<string | null>(openId)
  const [detail, setDetail] = useState<InterviewSession | null>(null)
  const [previous, setPrevious] = useState<InterviewSession | null>(null)
  const [listFailed, setListFailed] = useState(false)
  const [detailFailed, setDetailFailed] = useState(false)
  const [notesFailed, setNotesFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)
  const [closed, setClosed] = useState(false)
  const opener = useRef<HTMLElement | null>(null)
  const drawer = useRef<HTMLElement>(null)

  const take = useCallback((page: InterviewSummary[], append: boolean) => {
    const done = page.filter(i => i.status === 'completed')
    setRows(prev => append ? [...(prev ?? []), ...done] : done)
    setMore(page.length === PAGE)
    if (page.length) setCursor(page[page.length - 1].createdAt)
    setListFailed(false)
  }, [])

  useEffect(() => {
    let live = true
    api.listInterviews({ limit: PAGE }).then(page => live && take(page, false)).catch(() => live && setListFailed(true))
    return () => { live = false }
  }, [take, refreshKey, tick])

  const current = closed ? null : selected ?? openId
  const close = useCallback(() => { setClosed(true); opener.current?.focus() }, [])
  useEffect(() => { if (current) drawer.current?.focus() }, [current])
  useEffect(() => {
    if (!current) return
    let live = true
    api.getInterview(current).then(d => { if (live) { setDetail(d); setDetailFailed(false) } }).catch(() => live && setDetailFailed(true))
    return () => { live = false }
  }, [current, tick])

  const olderId = detail && rows ? rows.find(r => r.id !== detail.id && r.createdAt < detail.createdAt)?.id ?? null : null
  useEffect(() => {
    if (!olderId) return
    let live = true
    api.getInterview(olderId).then(d => { if (live) setPrevious(d) }).catch(() => { if (live) setPrevious(null) })
    return () => { live = false }
  }, [olderId])

  const writeNotes = async () => {
    if (!current || busy) return
    setBusy(true)
    setNotesFailed(false)
    try { await api.reflect(current); setTick(t => t + 1) } catch { setNotesFailed(true) }
    setBusy(false)
  }

  const shown = detail && detail.id === current ? detail : null
  const prior = previous && previous.id === olderId ? previous : null
  const review: SessionReview | null = shown ? reviewSession(shown, prior, shown.reflection) : null

  return (
    <div className="workspace-content sessions">
      <div className="page-title">
        <div>
          <p className="eyebrow">Sessions</p>
          <h1>What you have practised</h1>
          <p>Open a session for a full read: what landed, what to strengthen, and what to practise next.</p>
        </div>
        <button type="button" className="m-btn" onClick={onPractise}>Practise once more</button>
      </div>

      {listFailed && (
        <div className="m-card" role="status">
          <p className="m-quiet">Could not load your sessions. They are safe.</p>
          <button type="button" className="m-btn m-btn--quiet" onClick={() => setTick(t => t + 1)}>Try again</button>
        </div>
      )}

      {rows === null && !listFailed && <PageSkeleton label="Loading your sessions" />}

      {rows && rows.length === 0 && !listFailed && (
        <div className="m-card">
          <h2>No finished sessions yet</h2>
          <p className="m-quiet">Finish one practice and the review will be here.</p>
          <button type="button" className="m-btn" onClick={onPractise}>Begin a practice</button>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className={`sessions-layout${current ? ' has-review' : ''}`}>
          <ul className="m-grid-cards sessions-cards" role="list">
            {rows.map((s, i) => (
              <li key={s.id}>
                <FolderCard
                  compact tint={i} label="Session" title={s.role} name={s.role} pill={when(s.createdAt)}
                  summary={s.notes ? s.notes.keepWorkingOn : 'Notes not written yet.'}
                  current={s.id === current}
                  onOpen={() => { opener.current = document.activeElement as HTMLElement | null; setSelected(s.id); setClosed(false); setNotesFailed(false) }}
                />
              </li>
            ))}
          </ul>
          {more && <button type="button" className="m-link" onClick={() => void api.listInterviews({ limit: PAGE, before: cursor }).then(page => take(page, true)).catch(() => setListFailed(true))}>Show earlier sessions</button>}

          {current && (
            <aside ref={drawer} tabIndex={-1} className="m-card m-review sess-drawer" role="dialog" aria-modal="false" aria-label="Session review" aria-live="polite" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); close() } }}>
              <div className="sess-drawer__bar"><button type="button" className="sess-drawer__close" onClick={close}>Close</button></div>
              {detailFailed && !shown && (
                <p role="status">Could not open this session. <button type="button" className="m-link" onClick={() => setTick(t => t + 1)}>Try again</button></p>
              )}
              {shown && review && (
                <>
                  <header>
                    <h2>Overview</h2>
                    <p>{review.overview}</p>
                    {shown.reflection && <FallbackNote source={shown.reflection.source} />}
                    {shown.id === openId && shown.turns.some(t => t.transcriptSource === 'voice') && <FollowedTap interviewId={shown.id} />}
                  </header>
                  <section aria-labelledby="sess-q">
                    <h2 id="sess-q">Each question</h2>
                    {review.questions.length === 0 && <p className="m-quiet">No answer was saved in this session.</p>}
                    {review.questions.map(q => (
                      <div key={q.index} className="m-q">
                        <h3>{q.question}</h3>
                        <p><strong>What worked.</strong> {q.worked}</p>
                        <p><strong>What to strengthen.</strong> {q.strengthen}</p>
                        <ul className="m-star">{q.star.map(s => <li key={s.key} className={s.state === 'Still open' ? 'is-open' : ''}><b>{s.label}</b>{s.state}</li>)}</ul>
                        <p className="m-quiet">{q.delivery}</p>
                        <blockquote className="m-quiet">{q.answer}</blockquote>
                        {onSaveStory && <button type="button" className="m-btn m-btn--quiet" onClick={() => onSaveStory({ id: shown.turns.find(t => t.questionIndex === q.index)?.id ?? '', question: q.question, answer: q.answer })}>Save as a story</button>}
                      </div>
                    ))}
                  </section>
                  <section aria-labelledby="sess-pat">
                    <h2 id="sess-pat">Across sessions</h2>
                    <p className="m-quiet">{review.pattern ?? 'This is the only finished session so far, so there is no pattern to compare.'}</p>
                  </section>
                  <section aria-labelledby="sess-next">
                    <h2 id="sess-next">Practise next</h2>
                    <p>{review.nextPractice}</p>
                    <button type="button" className="m-btn" onClick={onPractise}>Practise this next</button>
                  </section>
                  {shown && !shown.reflection && (
                    <div>
                      <p className="m-quiet">Your answers are saved. The notes are not written yet.</p>
                      {notesFailed && <p role="status">That did not go through. Your answers are safe. Try again.</p>}
                      <button type="button" className="m-btn" disabled={busy} onClick={() => void writeNotes()}>{notesFailed ? 'Try again' : 'Write the notes'}</button>
                    </div>
                  )}
                </>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  )
}
