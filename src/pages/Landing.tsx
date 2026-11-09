import { useEffect, useState } from 'react'
import FluidOrb from '../components/FluidOrb'
import '../landing.css'

const MOMENTS = [
  'Finished the course',
  'Built the project',
  'Did the internship',
  'Solved the problems',
] as const

const QUESTIONS = [
  'Tell me about a project you worked on.',
  'What was your part?',
  'What would you do differently?',
] as const

const STEPS = [
  'Start with something you did — A project, an internship, or a decision at work. It doesn’t have to be polished.',
  'Add more if you want — The role, the job description, your resume. Helpful, not required.',
  'Answer the questions — What happened, what you did, what changed. One at a time.',
  'See the notes — They only use what you said. You leave with one thing to practise.',
] as const

const GAINS = [
  'Something to practise — One clear next step. Not a score.',
  'Only your words — If there’s a note, your line is right there with it.',
  'It stays private — Nothing is shared. Audio isn’t stored.',
] as const

const EXTRAS = ['A moment', 'The role you want', 'Job description', 'Your resume'] as const

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

function useOrbSize(desktop: number, mobile: number) {
  const [size, setSize] = useState(desktop)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const apply = () => setSize(media.matches ? mobile : desktop)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [desktop, mobile])
  return size
}

function scrollToHow() {
  const node = document.getElementById('how')
  if (!node) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

function HeroSequence({ reduced }: { reduced: boolean }) {
  const total = MOMENTS.length + 1 + QUESTIONS.length
  const [count, setCount] = useState(0)
  const shown = reduced ? total : count

  useEffect(() => {
    if (reduced) return
    let current = 0
    const id = window.setInterval(() => {
      current += 1
      setCount(current)
      if (current >= total) window.clearInterval(id)
    }, 340)
    return () => window.clearInterval(id)
  }, [reduced, total])

  return (
    <>
      <ul className="ml-pills">
        {MOMENTS.map((item, index) => (
          <li key={item} className={shown > index ? 'is-on' : undefined}>{item}</li>
        ))}
      </ul>
      <p className={shown > MOMENTS.length ? 'ml-trip is-on' : 'ml-trip'}>
        These are the questions that usually trip people up.
      </p>
      <ul className="ml-questions">
        {QUESTIONS.map((item, index) => (
          <li key={item} className={shown > MOMENTS.length + 1 + index ? 'is-on' : undefined}>{item}</li>
        ))}
      </ul>
    </>
  )
}

export default function Landing({ onTry }: { onTry: () => void }) {
  const reduced = usePrefersReducedMotion()
  const heroSize = useOrbSize(240, 168)
  const sideSize = useOrbSize(200, 160)
  const closeSize = useOrbSize(220, 168)

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
          MIRROR
        </a>
        <button type="button" className="ml-button" onClick={onTry}>Start with one moment</button>
      </header>

      <main>
        <section className="ml-hero" aria-labelledby="mirror-hero-title">
          <div className="ml-hero-copy">
            <p className="ml-eyebrow">For students and early-career</p>
            <h1 id="mirror-hero-title">You know what you did.<br />Saying it is the hard part.</h1>
            <p className="ml-lede">Someone asks about a project or a decision. You have the details. They just don’t come out cleanly.</p>
            <HeroSequence reduced={reduced} />
            <button type="button" className="ml-button" onClick={scrollToHow}>See how it works</button>
          </div>
          <FluidOrb size={heroSize} aria-hidden="true" />
        </section>

        <p className="ml-trust">Not another list of sample answers.</p>

        <section className="ml-split" aria-labelledby="what-title">
          <div>
            <h2 id="what-title">What this is</h2>
            <p>You bring one real thing you did — a project, an internship task, something from work.</p>
            <p>MIRROR asks you about it. One question at a time. Then it shows you notes that only use the words you actually said.</p>
            <p>You leave knowing what to practise next. No score. Nothing made up.</p>
            <ul className="ml-pills ml-pills--still">
              {EXTRAS.map(item => <li key={item} className="is-on">{item}</li>)}
            </ul>
            <p className="ml-wait">Start with whatever you have. The rest can wait.</p>
          </div>
          <FluidOrb size={sideSize} aria-hidden="true" />
        </section>

        <section className="ml-block" aria-labelledby="looks-title">
          <h2 id="looks-title">What it looks like</h2>
          <div className="ml-story">
            <p>Priya had a group project. She knew what she did. She just couldn’t say it cleanly.</p>
            <p>She added the role she was applying for and pasted the job description. Then she answered one question.</p>
            <div className="ml-exchange">
              <p className="ml-asked">What was your part?</p>
              <p>I kept the pilot small so we could see what broke before we changed everything.</p>
            </div>
            <p>The note used her exact line. It didn’t add anything. She left with one thing to try next time: say what happened in one sentence.</p>
          </div>
        </section>

        <section className="ml-block" id="how" aria-labelledby="how-title">
          <h2 id="how-title">How it goes</h2>
          <ol className="ml-steps">
            {STEPS.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="ml-block" aria-labelledby="get-title">
          <h2 id="get-title">What you get</h2>
          <ul className="ml-gains">
            {GAINS.map(item => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="ml-close" aria-labelledby="close-title">
          <FluidOrb size={closeSize} aria-hidden="true" />
          <h2 id="close-title">Want to try it with something you did?</h2>
          <button type="button" className="ml-button" onClick={onTry}>Start with one moment</button>
        </section>
      </main>

      <footer className="ml-footer">
        <p>MIRROR</p>
      </footer>
    </div>
  )
}
