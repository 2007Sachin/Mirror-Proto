import { useState } from 'react'
import type { DrillProps } from '../types'
import { items } from './items'
import './drill.css'

export default function Drill({ item, onAttempt, onClose }: DrillProps) {
  const q = items.find(i => i.id === item.id)
  const [pick, setPick] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [start] = useState(Date.now)

  if (!q) return <div className="mirror-landing stt"><p className="stt-note" role="alert">This question is not available.</p><button className="ml-btn" onClick={onClose}>Back</button></div>

  const right = pick === q.best
  const check = () => {
    if (pick === null || checked) return
    setChecked(true)
    onAttempt({
      itemId: item.id, track: 'stats', topic: item.topic, level: item.level,
      correct: pick === q.best,
      seconds: Math.min(3600, Math.round((Date.now() - start) / 1000)),
      hintsUsed: 0,
    })
  }

  return <div className="mirror-landing stt">
    <header className="stt-top">
      <div>
        <p className="ml-eyebrow">Stats and A/B testing · {q.topic} · Level {q.level}</p>
        <h1>{q.title}</h1>
      </div>
      <button className="ml-btn ml-btn--quiet" onClick={onClose}>Back</button>
    </header>

    <main className="stt-main">
      <section className="stt-card ml-glass">
        <p className="stt-scenario">{q.scenario}</p>
        <fieldset className="stt-opts" disabled={checked}>
          <legend className="stt-q">{q.question}</legend>
          {q.options.map((o, i) => {
            const mark = checked ? (i === q.best ? 'is-best' : i === pick ? 'is-miss' : '') : pick === i ? 'is-pick' : ''
            return <label key={i} className={`stt-opt ${mark}`}>
              <input type="radio" name="stt-answer" checked={pick === i} onChange={() => setPick(i)} />
              <span>{o.text}</span>
            </label>
          })}
        </fieldset>
        <div className="stt-row">
          <button className="ml-btn" disabled={pick === null || checked} onClick={check}>Check answer</button>
          {!checked && <span className="stt-note">{pick === null ? 'Choose one answer first.' : 'You get one try on this question.'}</span>}
        </div>
      </section>

      <section className="stt-card ml-glass" aria-live="polite">
        {!checked ? <p className="stt-note">Your result and the explanation show up here.</p> : <>
          <p className={`stt-verdict ${right ? 'is-right' : 'is-miss'}`}>{right ? 'Right' : 'Not quite'}</p>
          <p className="stt-sum">{q.summary}</p>
          <ul className="stt-why">
            {q.options.map((o, i) => <li key={i} className={i === q.best ? 'is-best' : ''}>
              <b>{i === q.best ? 'Best answer' : i === pick ? 'Your pick' : 'Other option'}</b>
              <span className="stt-quote">{o.text}</span>
              <span>{o.why}</span>
            </li>)}
          </ul>
          {q.working && <details className="stt-work">
            <summary>Show the working</summary>
            <ul>{q.working.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </details>}
          <p className="stt-note">To try again, close this question and open it again.</p>
        </>}
      </section>
    </main>
  </div>
}
