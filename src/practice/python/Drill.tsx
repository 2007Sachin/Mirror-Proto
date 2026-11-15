import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { DrillProps } from '../types'
import { problems } from './problems'
import { PythonRunner, type RunResult, type RuntimeState } from './runner'
import './drill.css'

export default function Drill({ item, onAttempt, onClose }: DrillProps) {
  const problem = problems.find(p => p.id === item.id)
  const [code, setCode] = useState(problem?.starter ?? '')
  const [rt, setRt] = useState<RuntimeState>('idle')
  const [running, setRunning] = useState(false)
  const [res, setRes] = useState<RunResult | null>(null)
  const [hint, setHint] = useState(false)
  const [solution, setSolution] = useState(false)
  const runner = useRef<PythonRunner | null>(null)
  const mounted = useRef(true)
  const busy = useRef(false)
  const hints = useRef(0)
  const [started] = useState(() => Date.now())
  const solutionSeen = useRef(false)
  const [attempt, setAttempt] = useState(0) // bump to Retry the download

  useEffect(() => {
    mounted.current = true
    const r = new PythonRunner()
    runner.current = r
    const off = r.onState(s => { if (mounted.current) setRt(s) })
    r.ensureReady().catch(() => {}) // failure shows through onState
    return () => { mounted.current = false; off(); r.dispose(); runner.current = null; busy.current = false }
  }, [attempt])

  const run = useCallback(async () => {
    const r = runner.current
    if (!problem || !r || busy.current || r.state !== 'ready') return
    busy.current = true
    setRunning(true)
    try {
      const out = await r.run(code, problem.tests)
      if (!mounted.current) return
      setRes(out)
      onAttempt({
        itemId: problem.id, track: 'python', topic: problem.topic, level: problem.level,
        correct: out.ok && !solutionSeen.current, // ponytail: a run after peeking at the solution never counts as solved
        seconds: Math.min(3600, Math.round((Date.now() - started) / 1000)),
        hintsUsed: hints.current,
      })
    } finally {
      busy.current = false
      if (mounted.current) setRunning(false)
    }
  }, [code, problem, onAttempt, started])

  const showHint = () => { if (!hint) { hints.current += 1; setHint(true) } }
  const showSolution = () => { solutionSeen.current = true; setSolution(true) }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void run(); return }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      const el = e.currentTarget
      const { selectionStart: a, selectionEnd: b } = el
      setCode(`${code.slice(0, a)}    ${code.slice(b)}`)
      requestAnimationFrame(() => el.setSelectionRange(a + 4, a + 4))
    }
  }

  if (!problem) {
    return <div className="mirror-landing py-round"><main className="py-main ml-glass py-pad" role="alert">
      <p className="py-lead">This problem is not available.</p>
      <button className="ml-btn" onClick={onClose}>Back</button>
    </main></div>
  }

  const passedCount = res ? res.results.filter(t => t.passed).length : 0
  return <div className="mirror-landing py-round">
    <header className="py-top">
      <div>
        <p className="ml-eyebrow">Python · {problem.topic}</p>
        <h1>{problem.title}</h1>
      </div>
      <button className="ml-btn ml-btn--quiet ml-btn--sm" onClick={onClose}>Back</button>
    </header>

    <main className="py-main">
      <section className="py-side ml-glass" aria-label="Problem">
        <p className="py-prompt">{problem.prompt}</p>
        <p className="py-note">Plain Python only, with no extra packages for now. Use print to see values.</p>
        {hint && <p className="py-hint"><b>Hint.</b> {problem.hint}</p>}
        <div className="py-row">
          <button className="ml-btn ml-btn--quiet ml-btn--sm" onClick={showHint} disabled={hint}>{hint ? 'Hint shown' : 'Show hint'}</button>
          {!solution && <button className="ml-btn ml-btn--quiet ml-btn--sm" onClick={showSolution}>Show solution</button>}
        </div>
        {solution && <div className="py-solution">
          <p className="py-note">One way to do it. Runs after this will not count as solved.</p>
          <pre><code>{problem.solution}</code></pre>
        </div>}
      </section>

      <div className="py-work">
        <section className="py-editor ml-glass" aria-label="Your code">
          <label className="ml-sr" htmlFor="py-code">Your Python code</label>
          <textarea id="py-code" value={code} onChange={e => setCode(e.target.value)} onKeyDown={onKey}
            spellCheck={false} autoCapitalize="off" autoCorrect="off" rows={12} />
          <div className="py-row">
            <button className="ml-btn" onClick={() => void run()} disabled={rt !== 'ready' || running}>{running ? 'Running…' : 'Run'}</button>
            <span className="py-note">Ctrl or Cmd + Enter also runs it.</span>
          </div>
          <div className="py-runtime" role="status">
            {rt === 'downloading' && <p className="py-note">Downloading the Python runtime (about 10 MB). This happens once.</p>}
            {rt === 'failed' && <p className="py-error">The Python runtime could not load. Check your connection.{' '}
              <button className="py-link" onClick={() => setAttempt(n => n + 1)}>Retry</button></p>}
          </div>
        </section>

        <section className="py-results ml-glass" aria-label="Results" aria-live="polite">
          {!res && <p className="py-note">Run your code to see how it does against the tests.</p>}
          {res && <>
            <p className={`py-verdict ${res.ok ? 'is-solved' : 'is-not-yet'}`}>
              {res.ok ? 'All tests passed.' : res.error ? 'Not yet. Your code hit a problem.' : `Not yet. ${passedCount} of ${res.results.length} tests passed.`}
            </p>
            {res.error && <p className="py-error">{res.error}</p>}
            {res.results.length > 0 && <ul className="py-tests">
              {res.results.map(t => <li key={t.name}>
                <span className={t.passed ? 'py-pass' : 'py-fail'}>{t.passed ? 'Passed' : 'Not yet'}</span>
                <span className="py-test-name">{t.name}</span>
                {t.detail && <span className="py-detail">{t.detail}</span>}
              </li>)}
            </ul>}
            {res.stdout && <>
              <p className="py-note">Printed output</p>
              <pre className="py-out"><code>{res.stdout}</code></pre>
            </>}
          </>}
        </section>
      </div>
    </main>
  </div>
}
