import { useEffect, useState } from 'react'
import type { Turn } from '../../lib/api'
import { answerAttempts, type AnswerAttemptRow } from '../../lib/data'
import { CompareView, Findings, HighlightedAnswer, Legend } from './ReplayView'

/** "Your answers" in a finished session: each turn with highlights and any later tries side by side. */
export default function SessionAnswers({ interviewId, turns, onSaveStory }: { interviewId: string; turns: Turn[]; onSaveStory?: (turn: Turn) => void }) {
  const [rows, setRows] = useState<AnswerAttemptRow[]>([])
  useEffect(() => {
    let live = true
    answerAttempts.list({ interviewId, kind: 'retry' }).then(r => { if (live) setRows(r) }).catch(() => {})
    return () => { live = false }
  }, [interviewId])
  if (!turns.length) return null
  return (
    <section className="rp-sessions" aria-labelledby="rp-answers">
      <h2 id="rp-answers">Your answers</h2>
      <Legend />
      <ul role="list">
        {[...turns].sort((a, b) => a.questionIndex - b.questionIndex).map(t => {
          const later = rows.filter(r => r.questionIndex === t.questionIndex).map(r => r.answer)
          return (
            <li key={t.id}>
              <p className="rp-q">{t.question}</p>
              {later.length ? <CompareView attempts={[t.answer, ...later]} /> : <><HighlightedAnswer text={t.answer} /><Findings text={t.answer} /></>}
              {onSaveStory && <button type="button" className="button button--secondary" onClick={() => onSaveStory(t)}>Save as a story</button>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
