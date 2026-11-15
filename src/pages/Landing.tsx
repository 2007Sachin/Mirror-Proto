import { useEffect, useState, type ReactNode } from 'react'
import '../landing.css'
import { LiveOrb, type OrbState } from '../components/LiveOrb'
import { useInView, usePrefersReducedMotion } from './landing/motion'
import Session from './landing/Session'
import Notes from './landing/Notes'

const DONE = ['Finished the course', 'Built the project', 'Did the internship', 'Solved the problems']
const TRIP = ['Tell me about a project you worked on.', 'What was your part?', 'What would you do differently?']
const STEPS = [
  ['Bring one real thing', 'A project, an internship task, a decision at work. Rough is fine. One moment is enough.'],
  ['Point it at a role', 'If you want, add the role, the job description or your resume. Helpful, not required.'],
  ['Answer, one at a time', 'Speak or type. The next question comes only after you answer, and follows what you said.'],
  ['Read your notes', 'Every note quotes a line you said. You leave with one thing to practise.'],
]
const NOT = [
  ['A score out of ten', 'Notes on what came through'],
  ['Model answers to copy', 'Your own story, in your own words'],
  ['A “better” rewrite of what you said', 'Your lines, kept and marked'],
  ['Generic strengths and weaknesses', 'Only what you actually said'],
  ['A full profile before you begin', 'One moment is enough to start'],
]
const FAQ = [
  ['Do I need a resume or job description?', 'No. Start with a single moment. Add them later if you’re aiming at a specific role.'],
  ['Can I speak, or do I have to type?', 'Both work. Speak when you want to say it out loud. Type when you’d rather think in writing.'],
  ['Will I get a score?', 'No. You get notes on what came through, and one thing to practise next.'],
  ['What happens to what I say?', 'Raw audio isn’t stored. Typed answers are saved on the practice server so the next question can follow what you said.'],
]
const HERO_PILL: Record<OrbState, string> = {
  idle: 'Ready when you are',
  speaking: 'MIRROR is asking…',
  listening: 'Listening…',
  thinking: 'Thinking…',
}

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.15)
  return <div ref={ref} className={`ml-reveal${inView ? ' is-in' : ''} ${className}`}>{children}</div>
}

function Hero({ onTry }: { onTry: () => void }) {
  const [active, setActive] = useState(0)
  const [orb, setOrb] = useState<OrbState>('idle')
  const [asked, setAsked] = useState(0)

  // A question click plays a short ask → listen → rest cycle on the orb.
  useEffect(() => {
    if (!asked) return
    const timers = [
      window.setTimeout(() => setOrb('listening'), 1800),
      window.setTimeout(() => setOrb('idle'), 4200),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [asked])

  return (
    <section className="ml-wrap ml-hero" id="top" aria-labelledby="hero-title">
      <div className="ml-hero-copy">
        <p className="ml-eyebrow">For students and early-career</p>
        <h1 id="hero-title">You know what you did. <span>Saying it is the hard part.</span></h1>
        <p className="ml-sub">
          Someone asks about a project or a decision. You have the details. They just don’t come out cleanly.
          MIRROR is a calm place to say it out loud first.
        </p>
        <ul className="ml-chips" role="list">
          {DONE.map(item => <li key={item} className="ml-chip">{item}</li>)}
        </ul>
        <div className="ml-ctas">
          <button type="button" className="ml-btn" onClick={onTry}>Start with one moment</button>
          <a className="ml-btn ml-btn--quiet" href="#call">See a sample session</a>
        </div>
      </div>

      <div className="ml-stage">
        <div className="ml-orb ml-orb--hero" data-state={orb} aria-hidden="true"><LiveOrb state={orb} /></div>
        <p className="ml-pill" aria-hidden="true">{HERO_PILL[orb]}</p>
        <div className="ml-glass ml-qcard">
          <p id="trip-title">These are the questions that usually trip people up.</p>
          <ul role="list" aria-labelledby="trip-title">
            {TRIP.map((q, i) => (
              <li key={q}>
                <button
                  type="button"
                  className="ml-q"
                  aria-current={i === active ? 'true' : undefined}
                  onClick={() => { setActive(i); setOrb('speaking'); setAsked(n => n + 1) }}
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default function Landing({ onTry }: { onTry: () => void }) {
  const reduced = usePrefersReducedMotion()

  return (
    <div className="mirror-landing">
      <header className="ml-nav">
        <div className="ml-glass ml-nav-bar">
          <a className="ml-logo" href="#top">MIRROR</a>
          <nav className="ml-links" aria-label="Sections">
            <a href="#call">Sample session</a>
            <a href="#how">How it works</a>
            <a href="#notes">Your notes</a>
            <a href="#different">What sets it apart</a>
            <a href="#privacy">Privacy</a>
          </nav>
          <button type="button" className="ml-btn ml-btn--sm" onClick={onTry}>Start with one moment</button>
        </div>
      </header>

      <main>
        <Hero onTry={onTry} />

        <section className="ml-wrap ml-section" aria-labelledby="problem-title">
          <Reveal>
            <p className="ml-eyebrow">The problem</p>
            <h2 id="problem-title">Knowing it and saying it are different skills.</h2>
            <p className="ml-lead">
              You knew the project. You knew the tools. The details were all there, but the words came out tangled when it counted.
            </p>
            <p className="ml-body">It’s rarely knowledge. It’s rehearsal. And another list of sample answers won’t fix it.</p>
          </Reveal>
        </section>

        <section className="ml-wrap ml-section" id="call" aria-labelledby="call-title">
          <Reveal>
            <p className="ml-eyebrow">A sample session</p>
            <h2 id="call-title">Like a video call with someone who listens.</h2>
            <p className="ml-body">One question at a time. The next one follows what you just said. Press play to watch a short sample.</p>
          </Reveal>
          <Session reduced={reduced} />
        </section>

        <section className="ml-wrap ml-section" id="how" aria-labelledby="how-title">
          <Reveal>
            <p className="ml-eyebrow">How it works</p>
            <h2 id="how-title">Start small. It builds from there.</h2>
          </Reveal>
          <ol className="ml-steps" role="list">
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <Reveal className="ml-glass ml-step">
                  <span className="ml-num" aria-hidden="true">{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        <section className="ml-wrap ml-section ml-two" id="notes" aria-labelledby="notes-title">
          <Reveal>
            <p className="ml-eyebrow">Your notes</p>
            <h2 id="notes-title">The notes only use what you said.</h2>
            <p className="ml-body">
              MIRROR doesn’t polish your story or hand you lines to memorise. It marks what you actually said, so you recognise yourself in the notes.
            </p>
            <p className="ml-legend">
              <span><i className="ml-key ml-key--clear" /> came out clearly</span>
              <span><i className="ml-key ml-key--circled" /> circled</span>
            </p>
          </Reveal>
          <Notes />
        </section>

        <section className="ml-wrap ml-section" id="different" aria-labelledby="different-title">
          <Reveal>
            <p className="ml-eyebrow">What sets it apart</p>
            <h2 id="different-title">Practice, not a performance review.</h2>
            <p className="ml-body">Most prep tools grade you or script you. MIRROR leaves both out.</p>
          </Reveal>
          <table className="ml-glass ml-compare">
            <thead>
              <tr><th scope="col">Usual prep tools</th><th scope="col">MIRROR</th></tr>
            </thead>
            <tbody>
              {NOT.map(([usual, ours]) => (
                <tr key={usual}><td>{usual}</td><td>{ours}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="ml-wrap ml-section ml-two" id="privacy" aria-labelledby="privacy-title">
          <Reveal>
            <p className="ml-eyebrow">Privacy</p>
            <h2 id="privacy-title">Private by design.</h2>
          </Reveal>
          <Reveal className="ml-glass ml-privacy">
            <p className="ml-strong">The session stays with you. Raw audio isn’t stored.</p>
            <p>Typed answers are saved on the practice server so the next question can follow what you said.</p>
          </Reveal>
        </section>

        <section className="ml-wrap ml-section ml-faq" aria-labelledby="faq-title">
          <p className="ml-eyebrow">Questions</p>
          <h2 id="faq-title">Good to know</h2>
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>

        <section className="ml-wrap ml-section" aria-labelledby="close-title">
          <Reveal className="ml-glass ml-close">
            <div className="ml-orb ml-orb--close" aria-hidden="true"><LiveOrb compact /></div>
            <h2 id="close-title">Want to try it with something you did?</h2>
            <button type="button" className="ml-btn" onClick={onTry}>Start with one moment</button>
            <p>Start with whatever you have. The rest can wait.</p>
          </Reveal>
        </section>
      </main>

      <footer className="ml-wrap ml-footer"><b>MIRROR</b> · Interview practice studio</footer>
    </div>
  )
}
