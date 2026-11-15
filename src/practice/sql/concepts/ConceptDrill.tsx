import { Suspense, useEffect, useMemo, useState } from 'react'
import type { DrillProps } from '../../types'
import { scenes } from '../scenes'
import { concepts } from './data'
import { checkAnswer } from './logic'
import '../drill.css'
import './concept.css'

// Owner's request: "add from the website also i need those kind of questions also" (conceptual SQL interview questions).
export default function ConceptDrill({ item, onAttempt, onClose }: DrillProps) {
  const q = useMemo(() => concepts.find(c => c.id === item.id), [item.id])
  const [own, setOwn] = useState('')          // private, memory only
  const [picked, setPicked] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [shown, setShown] = useState(false)   // answer revealed
  const [start] = useState(Date.now)
  const [mob, setMob] = useState<'q' | 'a'>('q')

  const report = (ok: boolean, hints: number) => {
    if (!q) return
    onAttempt({ itemId: q.id, track: 'sql', topic: q.topic, level: q.level, correct: ok, seconds: Math.min(3600, Math.round((Date.now() - start) / 1000)), hintsUsed: hints })
  }
  const check = () => {
    if (!q || picked === null) return
    const ok = checkAnswer(q.answer, picked)
    setChecked(true); setCorrect(ok); setMob('a')
    report(ok, 0)
  }
  const reveal = () => { if (!q) return; setShown(true); setPicked(q.answer); report(false, 1) }
  const retry = () => { setChecked(false); setPicked(null); setMob('q') }

  useEffect(() => {
    if (!q || checked) return
    const h = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= q.options.length) setPicked(n - 1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [q, checked])

  if (!q) return <div className="mirror-landing sqd sqd--gone"><p className="sqd-error" role="alert">This question is not available.</p><button className="ml-btn" onClick={onClose}>Back</button></div>

  const Scene = q.sceneId ? scenes[q.sceneId] : undefined
  const done = checked && (correct || shown)
  return (
    <div className="mirror-landing sqd cc">
      <div className="sqd-top">
        <div className="sqd-head"><span className="sqd-crumb">Concepts · {q.topic} · Level {q.level}</span></div>
        <div className="sqd-row"><button type="button" className="sqd-link" onClick={onClose}>Close</button></div>
      </div>
      <div className="cc-tabs" role="tablist" aria-label="Question or answer">
        <button type="button" role="tab" aria-selected={mob === 'q'} onClick={() => setMob('q')}>Question</button>
        <button type="button" role="tab" aria-selected={mob === 'a'} disabled={!checked} onClick={() => setMob('a')}>Answer</button>
      </div>
      <div className="sqd-body cc-body" data-mob={mob}>
        <section className="sqd-brief cc-left" aria-label="Question">
          <h1>{q.title}</h1>
          <p className="sqd-task">{q.question}</p>
          {!checked && (
            <label className="cc-own">
              <span>Think first: in your own words <i>(private, stays on this page)</i></span>
              <textarea rows={2} maxLength={400} value={own} onChange={e => setOwn(e.target.value)} placeholder="One line is enough." />
            </label>
          )}
          <div className="cc-opts" role="radiogroup" aria-label="Choose an answer">
            {q.options.map((o, i) => (
              <label key={i} className={`cc-opt${picked === i ? ' is-on' : ''}${done && i === q.answer ? ' is-right' : ''}`}>
                <input type="radio" name={`cc-${q.id}`} checked={picked === i} disabled={checked} onChange={() => setPicked(i)} />
                <kbd aria-hidden="true">{i + 1}</kbd><span>{o}</span>
              </label>
            ))}
          </div>
          <div className="sqd-row">
            {!checked && <button type="button" className="sqd-run" disabled={picked === null} onClick={check}>Check</button>}
            {checked && !done && (<>
              <button type="button" className="sqd-run" onClick={retry}>Try again</button>
              <button type="button" className="sqd-btn" onClick={reveal}>Show answer</button>
            </>)}
            {done && <button type="button" className="sqd-run" onClick={onClose}>Next</button>}
          </div>
        </section>

        <section className="sqd-work cc-right" aria-label="Answer">
          <div role="status" aria-live="polite" className="cc-verdict">
            {checked && (shown ? 'Here is the answer' : correct ? "That's right" : 'Not quite')}
          </div>
          {!checked && <p className="sqd-note">Pick an answer and check it. The explanation shows up here.</p>}
          {checked && !done && <p className="sqd-note">Have another look, or show the answer.</p>}
          {done && (
            <div className="cc-scroll">
              <p className="cc-why">{q.why}</p>
              {q.trap && <p className="cc-trap"><b>Common trap:</b> {q.trap}</p>}
              <div className="cc-say">
                <h2>Say it like this</h2>
                <div className={own.trim() ? 'cc-cmp' : ''}>
                  {own.trim() && <blockquote className="cc-mine"><b>Yours</b>{own}</blockquote>}
                  <blockquote><b>Model</b>{q.sayIt}</blockquote>
                </div>
              </div>
              {q.followUp && <p className="cc-follow"><b>The interviewer might ask next:</b> {q.followUp}</p>}
              {Scene && <div className="cc-scene"><Suspense fallback={<p className="sqd-skel" role="status">Getting the picture ready…</p>}><Scene /></Suspense></div>}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
