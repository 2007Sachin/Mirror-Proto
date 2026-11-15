import { useEffect, useRef, useState } from 'react'
import { CompareView, Findings, HighlightedAnswer, Legend } from './ReplayView'
import { useAttempts } from './useAttempts'
import './replay.css'

interface Props {
  interviewId: string | null
  /** Answers the room already has, oldest first. The panel works on the latest one. */
  answers: { question: string; answer: string }[]
}

function Latest({ interviewId, index, question, answer }: { interviewId: string | null; index: number; question: string; answer: string }) {
  const { rows, add } = useAttempts(interviewId, index)
  const [retrying, setRetrying] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (retrying) area.current?.focus() }, [retrying])

  const save = async () => {
    setBusy(true)
    setFailed(false)
    try { await add(question, text.trim()); setRetrying(false); setText('') } catch { setFailed(true) }
    setBusy(false)
  }
  const attempts = [answer, ...rows.map(r => r.answer)]

  return (
    <div className="rp">
      <p className="rp-q"><span className="rp-k">Question</span>{question}</p>
      {retrying ? (
        <div className="rp-retry">
          <label htmlFor="rp-text">Answer it again, in your own words</label>
          <textarea id="rp-text" ref={area} rows={5} value={text} onChange={e => setText(e.target.value)} disabled={busy} />
          {failed && <p role="status">That did not save. Your text is still here. Try again.</p>}
          <div className="rp-row">
            <button type="button" className="ml-btn ml-btn--sm" disabled={busy || text.trim().length < 20} onClick={() => void save()}>{busy ? 'Saving…' : 'Save this try'}</button>
            <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={() => setRetrying(false)}>Skip this</button>
          </div>
        </div>
      ) : (
        <>
          {attempts.length < 2 ? (
            <>
              <HighlightedAnswer text={answer} />
              <Legend />
              <Findings text={answer} />
            </>
          ) : <CompareView attempts={attempts} />}
          <div className="rp-row">
            <button type="button" className="ml-btn ml-btn--sm" onClick={() => setRetrying(true)}>Say it again</button>
          </div>
        </>
      )}
    </div>
  )
}

/** Replay tab for the call room: a calm look at the latest answer, and a way to try it again. Never blocks the interview. */
export default function ReplayPanel({ interviewId, answers }: Props) {
  const i = answers.length - 1
  if (i < 0) return <p className="rp-empty">Once you answer a question, your words show up here.</p>
  return <Latest key={`${interviewId}:${i}`} interviewId={interviewId} index={i} question={answers[i].question} answer={answers[i].answer} />
}
