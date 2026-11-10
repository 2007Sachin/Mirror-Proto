import { useEffect, useState } from 'react'
import FluidOrb from '../components/FluidOrb'
import HeroOrb from '../components/HeroOrb'
import '../landing.css'

const MOMENTS = [
  'Finished the course',
  'Built the project',
  'Did the internship',
  'Solved the problems',
] as const

const EXAMPLES = [
  'Tell me about a project you worked on.',
  'What was your part?',
  'What would you do differently?',
] as const

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])
  return reduced
}

function useHeroReveal(reduced: boolean) {
  const [shown, setShown] = useState(() => (reduced ? Array(8).fill(true) : Array(8).fill(false)))

  useEffect(() => {
    if (reduced) return
    const delay = 550
    const marks = [
      ...[0, 1, 2, 3].map(index => ({ index, at: delay * index })),
      { index: 4, at: delay * 4.4 },
      ...[0, 1, 2].map(index => ({ index: 5 + index, at: delay * (5 + index) })),
    ]
    const timers = marks.map(({ index, at }) => window.setTimeout(() => {
      setShown(current => {
        if (current[index]) return current
        const next = [...current]
        next[index] = true
        return next
      })
    }, at))
    return () => timers.forEach(timer => window.clearTimeout(timer))
  }, [reduced])

  return shown
}

function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7" stroke="#0d1220" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="3" fill="#1a73f2" />
    </svg>
  )
}

export default function Landing({ onTry }: { onTry: () => void }) {
  const reduced = usePrefersReducedMotion()
  const shown = useHeroReveal(reduced)
  const [orbFailed, setOrbFailed] = useState(false)

  return (
    <div className="mirror-landing">
      <header className="ml-wrap ml-header">
        <div className="ml-brand"><Mark /> MIRROR</div>
        <button type="button" className="ml-btn" onClick={onTry}>Start with one moment</button>
      </header>

      <main>
        <section className="ml-hero ml-wrap" id="start" aria-labelledby="mirror-hero-title">
          <div className="ml-hero-grid">
            <div className="ml-hero-copy">
              <p className="ml-eyebrow">For students and early-career</p>
              <h1 id="mirror-hero-title">You know what you did.<br />Saying it is the hard part.</h1>
              <p className="ml-lede">Someone asks about a project or a decision. You have the details. They just don’t come out cleanly.</p>
              <ul className="ml-done">
                {MOMENTS.map((item, index) => (
                  <li key={item} className={shown[index] ? 'is-on' : undefined}>{item}</li>
                ))}
              </ul>
              <p className={shown[4] ? 'ml-question is-on' : 'ml-question'}>These are the questions that usually trip people up.</p>
              <ul className="ml-examples">
                {EXAMPLES.map((item, index) => (
                  <li key={item} className={shown[5 + index] ? 'is-on' : undefined}>{item}</li>
                ))}
              </ul>
              <a className="ml-btn" href="#what">See how it works</a>
            </div>
            <div className="ml-hero-stage">
              <HeroOrb reduced={reduced} failed={orbFailed} onFail={() => setOrbFailed(true)} />
            </div>
          </div>
        </section>

        <p className="ml-trust">Not another list of sample answers.</p>

        <section className="ml-wrap" id="what" aria-labelledby="what-title">
          <div className="ml-what">
            <div className="ml-what-copy">
              <h2 id="what-title">What this is</h2>
              <p>You bring one real thing you did — a project, an internship task, something from work.</p>
              <p>MIRROR asks you about it. One question at a time. Then it shows you notes that only use the words you actually said.</p>
              <p>You leave knowing what to practise next. No score. Nothing made up.</p>
              <ul className="ml-bring">
                <li>A moment</li>
                <li>The role you want</li>
                <li>Job description</li>
                <li>Your resume</li>
              </ul>
              <p className="ml-wait">Start with whatever you have. The rest can wait.</p>
            </div>
            <div className="ml-orb ml-orb--side">
              <FluidOrb size={180} color="#1A73F2" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="ml-wrap" aria-labelledby="looks-title">
          <div className="ml-looks">
          <h2 id="looks-title">What it looks like</h2>
          <p className="ml-section-lede">Priya had a group project. She knew what she did. She just couldn’t say it cleanly.</p>
          <div className="ml-story">
            <p>She added the role she was applying for and pasted the job description. Then she answered one question.</p>
            <p className="ml-line">What was your part?</p>
            <p className="ml-line">I kept the pilot small so we could see what broke before we changed everything.</p>
            <p className="ml-after">The note used her exact line. It didn’t add anything. She left with one thing to try next time: say what happened in one sentence.</p>
          </div>
          </div>
        </section>

        <section className="ml-wrap" id="how" aria-labelledby="how-title">
          <div className="ml-how">
          <h2 id="how-title">How it goes</h2>
          <ol className="ml-steps">
            <li>
              <span>1</span>
              <h3>Start with something you did</h3>
              <p>A project, an internship, or a decision at work. It doesn’t have to be polished.</p>
            </li>
            <li>
              <span>2</span>
              <h3>Add more if you want</h3>
              <p>The role, the job description, your resume. Helpful, not required.</p>
            </li>
            <li>
              <span>3</span>
              <h3>Answer the questions</h3>
              <p>What happened, what you did, what changed. One at a time.</p>
            </li>
            <li>
              <span>4</span>
              <h3>See the notes</h3>
              <p>They only use what you said. You leave with one thing to practise.</p>
            </li>
          </ol>
          </div>
        </section>

        <section className="ml-wrap ml-get" aria-labelledby="get-title">
          <h2 id="get-title">What you get</h2>
          <div className="ml-expect">
            <article>
              <h3>Something to practise</h3>
              <p>One clear next step. Not a score.</p>
            </article>
            <article>
              <h3>Only your words</h3>
              <p>If there’s a note, your line is right there with it.</p>
            </article>
            <article>
              <h3>It stays private</h3>
              <p>Nothing is shared. Audio isn’t stored.</p>
            </article>
          </div>
        </section>

        <section className="ml-close ml-wrap" aria-labelledby="close-title">
          <div className="ml-orb ml-orb--close">
            <FluidOrb size={110} color="#1A73F2" aria-hidden="true" />
          </div>
          <h2 id="close-title">Want to try it with something you did?</h2>
          <button type="button" className="ml-btn" onClick={onTry}>Start with one moment</button>
        </section>
      </main>

      <footer className="ml-wrap ml-footer">MIRROR</footer>
    </div>
  )
}
