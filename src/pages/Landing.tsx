import { useState } from 'react'
import './landing/home.css'
import Reforming from './landing/Reforming'
import { CLAIMS, CLOSE, FAQ, FOOTER, HERO, MOMENT, NAV, NOT_SCORED, PRIVATE, SAMPLE, SESSION, STAGE, STEPS, VERSUS } from './landing/content'

function Sample({ onTry }: { onTry: () => void }) {
  const [pick, setPick] = useState<number | null>(null)
  const [again, setAgain] = useState(false)
  const answer = pick === null ? null : SAMPLE.answers[pick]
  return (
    <section id="sample" tabIndex={-1} className="mh-sec mh-sample" aria-labelledby="sample-h">
      <p className="mh-tag"><span>{SAMPLE.tag}</span> {SAMPLE.label}</p>
      <h2 id="sample-h">{SAMPLE.title}</h2>
      <p className="mh-lede">{SAMPLE.intro}</p>
      <blockquote className="mh-q">{SAMPLE.question}</blockquote>
      <div role="group" aria-label={SAMPLE.chooseLabel} className="mh-picks">
        {SAMPLE.answers.map((a, i) => (
          <button key={a.id} type="button" aria-pressed={pick === i} className="mh-pick"
            onClick={() => { setPick(i); setAgain(false) }}>
            {a.first}
          </button>
        ))}
      </div>
      {answer && (
        <div className="mh-reform">
          <Reforming key={`${answer.id}-${again}`} pairs={[answer]} run={again} showChanged changedLabel={SAMPLE.changedLabel} />
          {!again && <button type="button" className="mh-btn" onClick={() => setAgain(true)}>{SAMPLE.againButton}</button>}
        </div>
      )}
      {answer && again && (
        <div className="mh-closing">
          <p className="mh-lede">{SAMPLE.closing}</p>
          <button type="button" className="mh-btn" onClick={onTry}>{SAMPLE.closingCta}</button>
        </div>
      )}
    </section>
  )
}

export default function Landing({ onTry }: { onTry: () => void }) {
  const toSample = () => {
    const el = document.getElementById('sample')
    if (!el) return
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    el.focus({ preventScroll: true })
  }
  const heroPairs = [SAMPLE.answers[0], SAMPLE.answers[1]]
  return (
    <div className="mh">
      <a className="mh-skip" href="#main">Skip to content</a>
      <header className="mh-nav">
        <div className="mh-nav-in">
          <a className="mh-brand" href="#top">{NAV.brand}</a>
          <nav aria-label="Page" className="mh-links">
            {NAV.links.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
          <button type="button" className="mh-btn mh-btn-sm" onClick={onTry}>{NAV.cta}</button>
        </div>
      </header>
      <main id="main">
        <section id="top" className="mh-sec mh-hero" aria-labelledby="hero-h">
          <div className="mh-hero-copy">
            <p className="mh-eyebrow">{HERO.eyebrow}</p>
            <h1 id="hero-h">{HERO.title.map(t => <span key={t} className="mh-line">{t}</span>)}</h1>
            <p className="mh-lede">{HERO.sub}</p>
            <div className="mh-actions">
              <button type="button" className="mh-btn" onClick={toSample}>{HERO.primary}</button>
              <button type="button" className="mh-btn mh-btn-ghost" onClick={onTry}>{HERO.secondary}</button>
            </div>
          </div>
          <div className="mh-hero-vis" aria-label="A sample sentence being said again">
            <Reforming pairs={heroPairs} loop showChanged={false} changedLabel={SAMPLE.changedLabel} />
          </div>
        </section>

        <section className="mh-sec" aria-labelledby="moment-h">
          <h2 id="moment-h">{MOMENT.title}</h2>
          {MOMENT.body.map(p => <p key={p} className="mh-lede">{p}</p>)}
        </section>

        <section id="how" className="mh-sec" aria-labelledby="how-h">
          <h2 id="how-h">How it works</h2>
          <ol className="mh-steps">
            {STEPS.map(s => <li key={s.title}><h3>{s.title}</h3><p>{s.body}</p></li>)}
          </ol>
        </section>

        <section className="mh-sec" aria-labelledby="session-h">
          <h2 id="session-h">{SESSION.title}</h2>
          <p className="mh-lede">{SESSION.intro}</p>
          <div className="mh-view">
            <p className="mh-target">{SESSION.target}</p>
            {SESSION.groups.map(g => (
              <div key={g.label} className="mh-group">
                <h3>{g.label}</h3>
                <ul className="mh-chips">
                  {g.skills.map(s => <li key={s} className={`mh-chip mh-chip-${g.tone}`}>{s}</li>)}
                </ul>
              </div>
            ))}
            <div className="mh-probe">
              <h3>{SESSION.probeLabel}</h3>
              <p>{SESSION.probe}</p>
            </div>
          </div>
          <p className="mh-note">{SESSION.note}</p>
        </section>

        <Sample onTry={onTry} />

        <section className="mh-sec" aria-labelledby="ns-h">
          <h2 id="ns-h">{NOT_SCORED.title}</h2>
          <p className="mh-lede">{NOT_SCORED.body}</p>
        </section>

        <section id="private" className="mh-sec" aria-labelledby="private-h">
          <h2 id="private-h">{PRIVATE.title}</h2>
          <p className="mh-lede">{PRIVATE.intro}</p>
          <ul className="mh-claims">{CLAIMS.map(c => <li key={c}>{c}</li>)}</ul>
        </section>

        <section className="mh-sec" aria-labelledby="vs-h">
          <h2 id="vs-h">{VERSUS.title}</h2>
          <div className="mh-vs">
            <h3>{VERSUS.left}</h3>
            <h3>{VERSUS.right}</h3>
            {VERSUS.rows.map(([l, r]) => (
              <div key={l} className="mh-vs-row"><p>{l}</p><p>{r}</p></div>
            ))}
          </div>
        </section>

        <section className="mh-sec" aria-labelledby="stage-h">
          <h2 id="stage-h">{STAGE.title}</h2>
          {STAGE.body.map(p => <p key={p} className="mh-lede">{p}</p>)}
        </section>

        <section className="mh-sec" aria-labelledby="faq-h">
          <h2 id="faq-h">Questions</h2>
          {FAQ.map(([q, a]) => (
            <details key={q} className="mh-faq">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>

        <section className="mh-sec mh-close" aria-labelledby="close-h">
          <h2 id="close-h">{CLOSE.title}</h2>
          <p className="mh-lede">{CLOSE.body}</p>
          <button type="button" className="mh-btn" onClick={onTry}>{CLOSE.cta}</button>
        </section>
      </main>
      <footer className="mh-foot"><p>{FOOTER.line}</p></footer>
    </div>
  )
}
