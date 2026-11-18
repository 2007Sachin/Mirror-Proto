import { useState } from 'react'
import { BadgeCheck, Lock, MessageSquare, MicOff, Trash2 } from 'lucide-react'
import '../landing.css'
import './landing/home.css'
import { LiveOrb } from '../components/LiveOrb'
import Reforming from './landing/Reforming'
import { CLAIMS, CLOSE, FAQ, FEATURES, FOOTER, HERO, HOW, NAV, NOT_SCORED, PRIVATE, SAMPLE, SCREENS, STAGE, TRUST, VERSUS } from './landing/content'

const CLAIM_ICONS = [MicOff, BadgeCheck, Lock, Trash2, MessageSquare]
// Which part of each 1440x900 screenshot to show in the cropped step cards.
const CROP: Record<string, string> = { target: '55% 30%', briefing: '60% 40%', room: '50% 50%', session: '55% 25%', stories: '50% 30%', practice: '50% 30%' }

function Shot({ name, lazy = true }: { name: keyof typeof SCREENS; lazy?: boolean }) {
  const s = SCREENS[name]
  return <img src={s.src} alt={s.alt} width={1440} height={900} loading={lazy ? 'lazy' : undefined} decoding="async" />
}

function Frame({ name, lazy }: { name: keyof typeof SCREENS; lazy?: boolean }) {
  return (
    <div className="mh-frame ml-glass">
      <div className="mh-frame-bar" aria-hidden="true"><i /><i /><i /></div>
      <Shot name={name} lazy={lazy} />
    </div>
  )
}

function Sample({ onTry }: { onTry: () => void }) {
  const [pick, setPick] = useState<number | null>(null)
  const [again, setAgain] = useState(false)
  const answer = pick === null ? null : SAMPLE.answers[pick]
  return (
    <section id="sample" tabIndex={-1} className="mh-sec" aria-labelledby="sample-h">
      <div className="ml-wrap">
        <div className="mh-sample ml-glass">
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
              {!again && <button type="button" className="ml-btn" onClick={() => setAgain(true)}>{SAMPLE.againButton}</button>}
            </div>
          )}
          {answer && again && (
            <div className="mh-closing">
              <p className="mh-lede">{SAMPLE.closing}</p>
              <button type="button" className="ml-btn" onClick={onTry}>{SAMPLE.closingCta}</button>
            </div>
          )}
        </div>
      </div>
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
  return (
    <div className="mirror-landing mh">
      <a className="mh-skip" href="#main">Skip to content</a>
      <header className="ml-nav">
        <div className="ml-nav-bar ml-glass mh-nav-bar">
          <a className="ml-logo mh-brand" href="#top">{NAV.brand}</a>
          <nav aria-label="Page" className="ml-links">
            {NAV.links.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
          <button type="button" className="ml-btn ml-btn--sm" onClick={onTry}>{NAV.cta}</button>
        </div>
      </header>
      <main id="main">
        <section id="top" className="ml-wrap mh-hero" aria-labelledby="hero-h">
          <div>
            <p className="ml-eyebrow">{HERO.eyebrow}</p>
            <h1 id="hero-h">{HERO.title.map(t => <span key={t} className="mh-line">{t}</span>)}</h1>
            <p className="ml-sub">{HERO.sub}</p>
            <div className="mh-actions">
              <button type="button" className="ml-btn" onClick={toSample}>{HERO.primary}</button>
              <button type="button" className="ml-btn ml-btn--quiet" onClick={onTry}>{HERO.secondary}</button>
            </div>
            <ul className="mh-chips">{TRUST.map(t => <li key={t} className="ml-chip">{t}</li>)}</ul>
          </div>
          <div className="mh-vis">
            <div className="mh-orb ml-orb" data-state="idle"><LiveOrb state="idle" /></div>
            <Frame name="briefing" lazy={false} />
          </div>
        </section>

        <section id="how" className="mh-sec" aria-labelledby="how-h">
          <div className="ml-wrap">
            <div className="mh-head"><h2 id="how-h">{HOW.title}</h2></div>
            <ol className="mh-steps">
              {HOW.steps.map((s, i) => (
                <li key={s.title} className="mh-step ml-glass">
                  <div className="mh-step-img">
                    <img src={SCREENS[s.screen].src} alt={SCREENS[s.screen].alt} width={1440} height={900} loading="lazy" decoding="async" style={{ objectPosition: CROP[s.screen] }} />
                  </div>
                  <div className="mh-step-body">
                    <span className="ml-num">{i + 1}</span>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="mh-sec" aria-labelledby="features-h">
          <div className="ml-wrap">
            <div className="mh-head"><h2 id="features-h">{FEATURES.title}</h2><p>{FEATURES.intro}</p></div>
            {FEATURES.items.map(f => (
              <article key={f.id} className="mh-feat">
                <Frame name={f.screen} />
                <div>
                  <p className="mh-kicker">{f.kicker}</p>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                  <ul className="mh-bullets">{f.bullets.map(b => <li key={b}>{b}</li>)}</ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <Sample onTry={onTry} />

        <section id="private" className="mh-sec" aria-labelledby="private-h">
          <div className="ml-wrap mh-two">
            <div>
              <h2 id="private-h">{NOT_SCORED.title}</h2>
              <p className="ml-lead">{NOT_SCORED.body}</p>
              <h3 className="mh-sub-h">{PRIVATE.title}</h3>
              <p className="ml-body">{PRIVATE.intro}</p>
            </div>
            <ul className="mh-claims">
              {CLAIMS.map((c, i) => {
                const Icon = CLAIM_ICONS[i]
                return <li key={c} className="ml-glass"><span className="mh-ico"><Icon size={18} aria-hidden="true" /></span><span>{c}</span></li>
              })}
            </ul>
          </div>
        </section>

        <section className="mh-sec" aria-labelledby="vs-h">
          <div className="ml-wrap">
            <div className="mh-head"><h2 id="vs-h">{VERSUS.title}</h2></div>
            <div className="mh-vs ml-glass">
              <div className="mh-vs-head"><h3>{VERSUS.left}</h3><h3>{VERSUS.right}</h3></div>
              {VERSUS.rows.map(([l, r]) => <div key={l} className="mh-vs-row"><p>{l}</p><p>{r}</p></div>)}
            </div>
          </div>
        </section>

        <section className="mh-sec" aria-labelledby="stage-h">
          <div className="ml-wrap">
            <div className="mh-stage ml-glass">
              <h2 id="stage-h">{STAGE.title}</h2>
              {STAGE.body.map(p => <p key={p}>{p}</p>)}
            </div>
          </div>
        </section>

        <section id="faq" className="mh-sec" aria-labelledby="faq-h">
          <div className="ml-wrap">
            <div className="mh-head"><h2 id="faq-h">Questions</h2></div>
            <div className="mh-faqs">
              {FAQ.map(([q, a]) => (
                <details key={q} className="mh-faq ml-glass"><summary>{q}</summary><p>{a}</p></details>
              ))}
            </div>
          </div>
        </section>

        <section className="mh-sec" aria-labelledby="close-h">
          <div className="ml-wrap">
            <div className="mh-close ml-glass">
              <div className="ml-orb" data-state="idle" aria-hidden="true"><LiveOrb compact state="idle" /></div>
              <h2 id="close-h">{CLOSE.title}</h2>
              <p>{CLOSE.body}</p>
              <button type="button" className="ml-btn" onClick={onTry}>{CLOSE.cta}</button>
            </div>
          </div>
        </section>
      </main>
      <footer className="mh-foot">
        <div className="ml-wrap mh-foot-in">
          <a className="ml-logo" href="#top">{NAV.brand}</a>
          <nav aria-label="Footer">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#private">Privacy</a>
            <a href="#faq">FAQ</a>
            <button type="button" className="mh-foot-link" onClick={onTry}>{NAV.cta}</button>
          </nav>
          <p className="mh-foot-line">{FOOTER.line}</p>
        </div>
      </footer>
    </div>
  )
}
