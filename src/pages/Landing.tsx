import { useEffect, useId, useState, type FormEvent } from 'react'
import { FluidOrb } from '../components/FluidOrb'
import '../landing.css'

const EXAMPLE_ANSWER = 'I kept the pilot to one team so we could see what broke before we scaled it.'

const steps = [
  {
    index: '01',
    title: 'Bring a real moment',
    summary: 'A college project, an internship task, or a decision from work. Rough is fine.',
    detail: 'Name the moment in a sentence. You do not need the polished version. MIRROR starts from what you actually bring.',
  },
  {
    index: '02',
    title: 'Answer in order',
    summary: 'What happened, what you did, what changed, and what you would do next.',
    detail: 'The next question comes only after you answer. Follow-ups stay with what you actually said.',
  },
  {
    index: '03',
    title: 'See what you said',
    summary: 'The notes stay tied to your exact words. One concrete thing to practise next.',
    detail: 'The note quotes the line you typed or spoke. Nothing is added that you did not say.',
  },
] as const

function quoteClip(text: string, max = 140) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const last = cut.lastIndexOf(' ')
  const base = (last > 48 ? cut.slice(0, last) : cut).trim()
  return `${base}…`
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])
  return reduced
}

function scrollToId(id: string) {
  const node = document.getElementById(id)
  if (!node) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

function HeroDemo() {
  const fieldId = useId()
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const listening = note === null
  const energy = note ? 1 : Math.min(draft.trim().length / 90, 0.4)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) {
      setHint('Write a line first. The note can only use your words.')
      setNote(null)
      return
    }
    setHint('')
    setNote(quoteClip(text))
  }

  const reset = () => {
    setNote(null)
    setHint('')
  }

  return (
    <div className="ml-panel">
      <div className="ml-panel-top">
        <span>One of four</span>
        <p className="ml-stage" role="status">
          <i className={listening ? 'is-live' : ''} />
          {listening ? 'Listening' : 'Looking at your words'}
        </p>
      </div>
      <FluidOrb className="ml-hero-orb" focus={energy} label={listening ? 'MIRROR orb, listening' : 'MIRROR orb, looking at your words'} />
      <form onSubmit={submit}>
        <label htmlFor={fieldId}>What part of that decision was yours?</label>
        <textarea
          id={fieldId}
          value={draft}
          onChange={event => {
            setDraft(event.target.value)
            if (hint) setHint('')
          }}
          rows={3}
          placeholder="A rough line is enough."
          onKeyDown={event => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
        {hint && <p className="ml-hint" role="status">{hint}</p>}
        <div className="ml-panel-actions">
          <p>Type or speak · Rough is fine</p>
          <button type="submit" className="ml-button">See the note</button>
        </div>
      </form>
      {note && (
        <figure className="ml-note">
          <figcaption>From what you said</figcaption>
          <blockquote>“{note}”</blockquote>
          <button type="button" className="ml-text" onClick={reset}>Write another line</button>
        </figure>
      )}
    </div>
  )
}

function SeePass({ reduced }: { reduced: boolean }) {
  const [phase, setPhase] = useState(reduced ? 2 : 0)
  const [count, setCount] = useState(reduced ? EXAMPLE_ANSWER.length : 0)
  const [paused, setPaused] = useState(reduced)
  const shown = phase === 0 ? '' : EXAMPLE_ANSWER.slice(0, phase === 2 || reduced ? EXAMPLE_ANSWER.length : count)
  const showNote = phase === 2 || reduced

  useEffect(() => {
    if (reduced || paused) return
    if (phase === 0) {
      const timer = window.setTimeout(() => setPhase(1), 1500)
      return () => window.clearTimeout(timer)
    }
    if (phase === 1) {
      if (count >= EXAMPLE_ANSWER.length) {
        const timer = window.setTimeout(() => setPhase(2), 650)
        return () => window.clearTimeout(timer)
      }
      const timer = window.setTimeout(() => setCount(value => value + 1), 24)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => {
      setCount(0)
      setPhase(0)
    }, 3400)
    return () => window.clearTimeout(timer)
  }, [phase, count, paused, reduced])

  const jump = (next: number) => {
    setPaused(true)
    setPhase(next)
    setCount(next === 0 ? 0 : EXAMPLE_ANSWER.length)
  }

  const labels = ['Question', 'Answer', 'Notes'] as const

  return (
    <div className="ml-pass">
      <div className="ml-pass-orb">
        <FluidOrb focus={phase === 2 ? 1 : phase === 1 ? 0.45 : 0.1} label="MIRROR orb during an example pass" />
      </div>
      <div className="ml-pass-copy">
        <div className="ml-pass-kicker">
          <span>Example pass</span>
          <p role="status">{labels[phase]}</p>
        </div>
        <div className="ml-meter" aria-hidden="true"><i style={{ width: `${((phase + 1) / 3) * 100}%` }} /></div>
        <p className="ml-pass-q">What part of that decision was yours?</p>
        <p className={`ml-pass-a ${shown ? 'is-on' : ''}`} aria-hidden={shown ? undefined : true}>
          {shown}
          {phase === 1 && !paused && !reduced && <span className="ml-caret" />}
        </p>
        {showNote && (
          <figure className="ml-note ml-note--pass">
            <figcaption>From what you said</figcaption>
            <blockquote>“{EXAMPLE_ANSWER}”</blockquote>
          </figure>
        )}
        <div className="ml-pass-controls">
          {labels.map((label, index) => (
            <button
              key={label}
              type="button"
              className={phase === index ? 'is-on' : ''}
              aria-pressed={phase === index}
              onClick={() => jump(index)}
            >
              {label}
            </button>
          ))}
          {!reduced && (
            <button type="button" className="ml-text" onClick={() => setPaused(value => !value)} aria-pressed={paused}>
              {paused ? 'Play' : 'Pause'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Landing({ onTry }: { onTry: () => void }) {
  const reduced = usePrefersReducedMotion()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="mirror-landing" id="top">
      <header className="ml-header">
        <a
          className="ml-brand"
          href="#top"
          onClick={event => {
            event.preventDefault()
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
          }}
        >
          <span className="ml-mark" aria-hidden="true"><i /><i /></span>
          MIRROR
        </a>
        <nav aria-label="Page">
          <a href="#how" onClick={event => { event.preventDefault(); scrollToId('how') }}>How it works</a>
          <a href="#see" onClick={event => { event.preventDefault(); scrollToId('see') }}>See a pass</a>
        </nav>
        <button type="button" className="ml-button ml-button--header" onClick={onTry}>Try MIRROR</button>
      </header>

      <main>
        <section className="ml-hero" aria-labelledby="mirror-hero-title">
          <div className="ml-hero-copy">
            <p className="ml-kicker">Four ordered questions</p>
            <h1 id="mirror-hero-title">You already have the moment. <span>Find the answer.</span></h1>
            <p className="ml-lede">MIRROR asks four questions about a college project, internship, or work decision. The feedback stays with the exact words you said.</p>
            <button type="button" className="ml-button ml-button--primary" onClick={onTry}>Start with one moment</button>
            <p className="ml-aside">Type or speak · Rough is fine</p>
          </div>
          <HeroDemo />
        </section>

        <p className="ml-trust">Not another list of sample answers. A clearer way to understand your own experience.</p>

        <section className="ml-see" id="see" aria-labelledby="see-title">
          <div className="ml-section-head">
            <h2 id="see-title">A question, your line, then the note.</h2>
            <p>The pass below is an example. In the panel above, the note uses only what you type.</p>
          </div>
          <SeePass reduced={reduced} />
        </section>

        <section className="ml-how" id="how" aria-labelledby="how-title">
          <div className="ml-section-head">
            <h2 id="how-title">Four questions. Then the notes on your words.</h2>
            <p>You start with one real moment. The next question comes only after you answer. The feedback cites the line you typed or spoke.</p>
          </div>
          <div className="ml-steps">
            {steps.map((step, index) => {
              const expanded = open === index
              const panelId = `mirror-step-${step.index}`
              return (
                <article key={step.index} className={`ml-step ${expanded ? 'is-open' : ''}`}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      id={`${panelId}-button`}
                      onClick={() => setOpen(expanded ? null : index)}
                    >
                      <span className="ml-step-index">{step.index}</span>
                      <span className="ml-step-copy">
                        <strong>{step.title}</strong>
                        <span>{step.summary}</span>
                      </span>
                      <span className="ml-chevron" aria-hidden="true" />
                    </button>
                  </h3>
                  <div
                    className="ml-step-panel"
                    id={panelId}
                    role="region"
                    aria-labelledby={`${panelId}-button`}
                    aria-hidden={!expanded}
                  >
                    <div><p>{step.detail}</p></div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="ml-close" id="close" aria-labelledby="close-title">
          <FluidOrb className="ml-close-orb" focus={0.2} label="MIRROR orb" />
          <div>
            <h2 id="close-title">What could your experience sound like, clearly told?</h2>
            <button type="button" className="ml-button ml-button--primary" onClick={onTry}>Start with one moment</button>
            <p className="ml-aside">Type or speak · Rough is fine</p>
          </div>
        </section>
      </main>

      <footer className="ml-footer">
        <p>MIRROR · Four ordered answers · Feedback tied to your words</p>
      </footer>
    </div>
  )
}
