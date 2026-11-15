import { useEffect, useState } from 'react'
import '../../landing.css'
import './screen.css'
import { api } from '../../lib/api'
import { getCapabilities } from '../../lib/data'
import { buildListenFor, missingParts, pickWeakest, type ScreenTurn } from './debriefLogic'

export interface ScreenDebriefProps {
  turns: ScreenTurn[]
  /** The target's skill names, for the job's-own-words check. */
  skills: string[]
  /** True only when the server really capped this call at four (long calls are not switched on). */
  cappedAtFour?: boolean
  /** Opens the replay flow on one answer. The button shows only when this is given. */
  onReplay?: (turn: { index: number; question: string; answer: string }) => void
  onDone: () => void
}

export default function ScreenDebrief({ turns, skills, cappedAtFour, onReplay, onDone }: ScreenDebriefProps) {
  const items = buildListenFor(turns, skills)
  const weakest = pickWeakest(turns)
  const w = weakest === null ? null : turns[weakest]
  return (
    <div className="sc-wrap">
      <header>
        <p className="ml-eyebrow">Screening call</p>
        <h1>Your call is finished</h1>
        <p className="sc-muted">Automated screening tools tend to listen for the things below. Each one shows your own words where they appeared. It is a read of your words, nothing more.</p>
        {cappedAtFour && <p className="sc-note">This call used up to four questions.</p>}
      </header>

      <section className="ml-glass sc-card" aria-labelledby="sc-listen">
        <h2 id="sc-listen">What automated screeners listen for</h2>
        <ul className="sc-list">
          {items.map(it => (
            <li key={it.id}>
              <b>{it.label}</b>
              {it.found ? (
                <ul className="sc-quotes">{it.quotes.map((q, i) => <li key={i}><q>{q.text}</q></li>)}</ul>
              ) : (
                <p className="sc-muted">Nothing in your answers showed this yet. {it.tip}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {w && weakest !== null && (
        <section className="ml-glass sc-card" aria-labelledby="sc-weak">
          <h2 id="sc-weak">One answer to say again</h2>
          <p className="sc-q">{w.question}</p>
          <p className="sc-muted">{missingParts(w.answer)}</p>
          {onReplay && <button type="button" className="ml-btn ml-btn--sm" onClick={() => onReplay({ index: weakest, question: w.question, answer: w.answer })}>Replay this answer</button>}
        </section>
      )}

      <div className="sc-actions"><button type="button" className="ml-btn" onClick={onDone}>Back to Today</button></div>
    </div>
  )
}

/** Loads the saved call and shows its debrief. A failed load says so plainly. */
export function ScreenDebriefPage({ interviewId, onDone, onReplay }: { interviewId: string; onDone: () => void; onReplay?: ScreenDebriefProps['onReplay'] }) {
  const [state, setState] = useState<{ turns: ScreenTurn[]; skills: string[]; capped: boolean } | 'error' | null>(null)
  useEffect(() => {
    let stop = false
    void (async () => {
      try {
        const s = await api.getInterview(interviewId)
        const [target, caps] = await Promise.all([s.targetId ? api.getTarget(s.targetId).catch(() => null) : null, getCapabilities()])
        if (!stop) setState({ turns: s.turns.map(t => ({ question: t.question, answer: t.answer })), skills: target?.skills.map(k => k.name) ?? [], capped: caps.screenLongCalls === false && (s.questionCap ?? 99) <= 4 })
      } catch { if (!stop) setState('error') }
    })()
    return () => { stop = true }
  }, [interviewId])
  if (state === null) return <div className="sc-wrap"><p className="sc-muted" role="status">Getting your debrief ready…</p></div>
  if (state === 'error') return <div className="sc-wrap"><p className="sc-muted" role="alert">We could not open this call right now. Your answers are saved in Sessions.</p><button type="button" className="ml-btn ml-btn--sm" onClick={onDone}>Back to Today</button></div>
  return <ScreenDebrief turns={state.turns} skills={state.skills} cappedAtFour={state.capped} onReplay={onReplay} onDone={onDone} />
}
