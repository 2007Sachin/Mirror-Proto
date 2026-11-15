import { useMemo, useState } from 'react'
import { answerAttempts } from '../../../lib/data'
import { useSavedExplain, type Saved } from './useSavedExplain'
import type { SqlProblem } from '../problems'
import { buildExplainSteps } from './explainLogic'
import { useDictation } from './useDictation'
import '../drill.css'
import './aloud.css'

function Compare({ mine, problem }: { mine: Saved[]; problem: SqlProblem }) {
  const model = problem.explain, edges = problem.edgeCases ?? []
  return <div className="al-pair">
    <div><b>You said</b>{mine.length ? mine.map(m => <p key={m.question}>{m.answer}</p>) : <p>You skipped every question.</p>}</div>
    <div><b>The model&rsquo;s reasoning</b>
      {model && <p>{model}</p>}
      {edges.map(e => <p key={e}>{e}</p>)}
      {!model && !edges.length && <p>No model reasoning is written for this one.</p>}
    </div>
  </div>
}

/** `dictation={false}` hides the microphone (tests, typing only). */
export default function ExplainAloud({ problem, sql, onClose, dictation = true }: { problem: SqlProblem; sql: string; onClose(): void; dictation?: boolean }) {
  const [round, setRound] = useState(0)
  const saved = useSavedExplain(problem.id, round)
  const [redo, setRedo] = useState(false)
  const steps = useMemo(() => buildExplainSteps({ problem, sql }), [problem, sql])
  const [i, setI] = useState(0)
  const [text, setText] = useState('')
  const [voiced, setVoiced] = useState(false)
  const [mine, setMine] = useState<Saved[]>([])
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const mic = useDictation(t => { setText(cur => (cur.trim() ? `${cur.trim()} ${t}` : t)); setVoiced(true) })

  if (done) return <div className="al">
    <h3>Your explanation</h3>
    {mine.length > 0 && <p className="sqd-note">Saved as text only. No audio is kept.</p>}
    <Compare mine={mine} problem={problem} />
    <p className="sqd-note">Read yours next to the model&rsquo;s. Where they differ is worth a second look.</p>
    <button type="button" className="sqd-link" onClick={onClose}>Close</button>
  </div>

  if (saved === null) return <p className="sqd-note" role="status">Looking for your saved explanation…</p>
  if (saved.length && !redo) return <div className="al">
    <h3>Your saved explanation</h3>
    <p className="sqd-note">Saved as text only. No audio is kept.</p>
    <Compare mine={saved} problem={problem} />
    <div className="sqd-row">
      <button type="button" className="sqd-btn" onClick={() => { setRedo(true); setI(0); setText(''); setMine([]) }}>Do it again</button>
      <button type="button" className="sqd-link" onClick={onClose}>Close</button>
    </div>
  </div>
  const step = steps[i]
  const advance = (list: Saved[]) => {
    setMine(list); setText(''); setVoiced(false); setFailed(false)
    if (i + 1 < steps.length) setI(i + 1)
    else { setDone(true); setRound(n => n + 1) }
  }
  const save = async () => {
    const answer = text.trim()
    if (!answer || busy) return
    setBusy(true); setFailed(false)
    try {
      await answerAttempts.add({ interviewId: null, questionIndex: null, question: step.prompt, attempt: 1, answer, kind: 'explain', itemId: problem.id, transcriptSource: voiced ? 'voice' : 'text' })
      advance([...mine, { question: step.prompt, answer }])
    } catch { setFailed(true) } finally { setBusy(false) }
  }

  return <div className="al">
    <h3>Explain it out loud</h3>
    <p className="sqd-note">{i === 0 ? 'Answer as you would to an interviewer. Type, or use the microphone and edit the words before you save.' : 'Next question'}</p>
    <p className="al-q" id="al-q">{step.prompt}</p>
    {step.hint && <p className="sqd-note">{step.hint}</p>}
    <label className="ml-sr" htmlFor="al-text">Your answer</label>
    <textarea id="al-text" className="al-text" aria-describedby="al-q" value={text} onChange={e => { setText(e.target.value); if (!e.target.value.trim()) setVoiced(false) }} />
    <div className="sqd-actions">
      {dictation && !mic.unavailable && <button type="button" className="sqd-btn" aria-pressed={mic.state === 'recording'} disabled={mic.state === 'transcribing'} onClick={() => void mic.toggle()}>
        {mic.state === 'recording' ? 'Stop and add to the box' : mic.state === 'transcribing' ? 'Writing it down…' : 'Use the microphone'}
      </button>}
      <button type="button" className="sqd-run" disabled={!text.trim() || busy} onClick={() => void save()}>{i + 1 < steps.length ? 'Save and continue' : 'Save and finish'}</button>
      <button type="button" className="sqd-btn" disabled={busy} onClick={() => advance(mine)}>Skip</button>
      <button type="button" className="sqd-link" onClick={onClose}>Close</button>
    </div>
    {dictation && mic.unavailable && <p className="sqd-note" role="status">Voice is not set up here, so type your answer.</p>}
    {mic.error && <p className="sqd-error" role="alert">{mic.error}</p>}
    {failed && <p className="sqd-error" role="alert">That did not save. Try again.</p>}
  </div>
}
