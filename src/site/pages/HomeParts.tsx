// Home page pictures, built from the app's own components so the site shows the real product:
// the interview room (LiveOrb + the interviewer's lines), Interview Prep (FolderCard + the bundled interview loops),
// Your evaluation (EvaluationSection) and Stories. Plus the side dot-nav. No libraries.
import { useEffect, useState } from 'react'
import { ArrowRight, Captions, MessageSquare, Mic, MicOff, Pause, Repeat, Square, X } from 'lucide-react'
import { LiveOrb, type OrbState } from '../../components/LiveOrb'
import { splitLead } from '../../lib/lead'
import DotOrb from '../../components/DotOrb'
import FolderCard from '../../components/FolderCard'
import EvaluationSection from '../../features/sessions/EvaluationSection'
import { PREP_ROLES } from '../../prep/roles'
import type { Reflection } from '../../lib/api'
import { PILLARS, ROOM, ROOM_STEPS, SAMPLE_EVALUATION, SAMPLE_LABEL, STORIES_PANEL } from '../copy/home'
import { useInView, useReducedMotion } from '../ui'

const SCRIPT = ROOM.script
const wordsOf = (s: string) => s.split(' ')

/** A window frame around a piece of the app, with a "Sample" tag. */
function AppFrame({ bar, note, className, children }: { bar: string; note?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`ms-app ${className ?? ''}`}>
      <div className="ms-app__bar"><span className="ms-app__dots" aria-hidden="true"><i /><i /><i /></span><span className="ms-app__title">{bar}</span><span className="ms-badge-soft">{note ?? SAMPLE_LABEL}</span></div>
      {children}
    </div>
  )
}

const CONTROL_ICONS = [MicOff, Captions, MessageSquare, Repeat, Pause]
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/** The interview room, laid out like the app's room (timer, progress, orb, lead-in, question, captions, call controls,
 *  chat panel). The interviewer's line reveals word by word (orb speaking), then a sample answer appears in the captions
 *  (orb listening), MIRROR thinks and asks the next question. Under reduced motion: the second exchange, still. */
export function RoomScene() {
  const reduced = useReducedMotion()
  const [viewRef, inView] = useInView<HTMLDivElement>({ threshold: 0.1 })
  const [step, setStep] = useState(reduced ? 3 : 0)
  const [words, setWords] = useState(reduced ? Infinity : 0)
  const [sec, setSec] = useState(14)
  const cur = SCRIPT[step]
  const done = words >= wordsOf(cur.text).length
  const running = inView && !reduced

  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => {
      if (!done) setWords(w => w + 1)
      else { setStep(s => (s + 1) % SCRIPT.length); setWords(0) }
    }, done ? (cur.who === 'you' ? 2200 : 1400) : cur.who === 'mirror' ? 90 : 160)
    return () => clearTimeout(t)
  }, [running, done, cur.who, words, step])
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setSec(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  const state: OrbState = !running ? 'idle' : done ? (cur.who === 'you' ? 'thinking' : 'listening') : cur.who === 'mirror' ? 'speaking' : 'listening'
  const askIdx = cur.who === 'mirror' ? step : step - 1
  const [lead, ask] = splitLead(SCRIPT[askIdx].text)
  const leadN = wordsOf(lead).length
  const revealed = (i: number) => askIdx !== step || i < words
  const answer = cur.who === 'you' ? wordsOf(cur.text).slice(0, words).join(' ') : ''
  const qn = askIdx / 2
  const chat = SCRIPT.slice(0, step + 1).map((s, i) => ({ ...s, text: i === step && s.who === 'you' ? answer : s.text, live: i === step && s.who === 'you' }))

  return (
    <div ref={viewRef} role="group" aria-label={ROOM.label} className="ms-room-wrap">
      <div className="ms-app ms-room" aria-hidden="true">
        <div className="ms-room__stage">
          <header className="ms-room__top">
            <div className="ms-room__top-l"><span className="ms-room__clock">{clock(sec)}</span><span className="ms-room__link"><i />{ROOM.connected}</span><span className="ms-room__brand">{ROOM.brand}</span></div>
            <div className="ms-room__top-r">
              <ol className="ms-room__dots">{Array.from({ length: 5 }, (_, i) => <li key={i} className={i <= qn ? 'ms-is-on' : ''} />)}</ol>
              <span>Question {qn + 1} · {ROOM.focus[qn]}</span><span className="ms-badge-soft">{ROOM.sampleNote}</span>
            </div>
          </header>
          <div className="ms-room__center">
            <div className="ms-room__orb"><LiveOrb state={state} /></div>
            <p className="ms-room__chip" data-state={state}><i />{state === 'idle' ? ROOM.status.listening : ROOM.status[state as keyof typeof ROOM.status]}</p>
            {lead && <p className="ms-room__lead">{wordsOf(lead).map((w, i) => <span key={i} className={revealed(i) ? 'ms-is-in' : ''}>{w} </span>)}</p>}
            <p className="ms-room__q">{wordsOf(ask).map((w, i) => <span key={i} className={revealed(leadN + i) ? 'ms-is-in' : ''}>{w} </span>)}</p>
            <p className={`ms-room__cap${answer ? ' ms-is-on' : ''}`}><b>{ROOM.you}</b>{answer || ' '}</p>
          </div>
          <div className="ms-room__bar">
            <div className="ms-room__ctrls">{ROOM.controls.map((c, i) => { const I = CONTROL_ICONS[i]; return <span key={c} className={`ms-room__cb${i === 1 || i === 2 ? ' ms-is-on' : ''}`}><i><I size={18} /></i>{c}</span> })}</div>
            <div className="ms-room__acts"><span className="ms-room__send">{ROOM.send} <ArrowRight size={15} /></span><span className="ms-room__btn">{ROOM.later} <ArrowRight size={15} /></span><span className="ms-room__btn"><Square size={13} /> {ROOM.end}</span></div>
          </div>
        </div>
        <aside className="ms-room__panel">
          <div className="ms-room__tabs">{ROOM.tabs.map((t, i) => <span key={t} className={i === 0 ? 'ms-is-on' : ''}>{t}</span>)}<X size={16} /></div>
          <div className="ms-room__chat">
            {chat.map((m, i) => <div key={i} className={`ms-room__b ms-room__b--${m.who}`}><span>{m.who === 'mirror' ? ROOM.interviewer : m.live ? `${ROOM.you} · speaking` : ROOM.you}</span><p>{m.text}</p></div>)}
          </div>
          <div className="ms-room__mode">{ROOM.modes.map((m, i) => <span key={m} className={i === 0 ? 'ms-is-on' : ''}>{i === 0 && <Mic size={14} />}{m}</span>)}</div>
          <p className="ms-room__foot">{ROOM.foot}</p>
        </aside>
      </div>
      <ol className="ms-sr">{SCRIPT.map(s => <li key={s.text}>{s.who === 'mirror' ? ROOM.interviewer : ROOM.you}: {s.text}</li>)}</ol>
    </div>
  )
}

/** Interview Prep as the app shows it: the bundled interview loops and "Your target job". */
export function PrepPanel() {
  return (
    <AppFrame bar="Interview Prep · Pick the role you are preparing for" note="From the app" className="ms-app--wide">
      <ul className="ms-app-grid">
        {PREP_ROLES.slice(0, 3).map((r, i) => (
          <li key={r.slug}><FolderCard tint={i} label="Interview loop" title={r.title} name={r.title} pill={`${r.rounds.length} rounds`} lines={r.rounds.slice(0, 3).map(x => x.name)} level="h3" /></li>
        ))}
        <li><FolderCard tint={3} label="Custom prep" title="Your target job" name="Your target job" pill="New" lines={['Paste the job description', 'Matched to your résumé', 'Rounds built for this role']} level="h3" /></li>
      </ul>
    </AppFrame>
  )
}

/** The room's steps beside a quiet orb. */
export function RoomSteps() {
  return (
    <AppFrame bar="Interview room · How a session runs" note="From the app" className="ms-app--wide ms-room-steps">
      <div className="ms-room-steps__orb"><LiveOrb state="idle" /></div>
      <ol className="ms-room-steps__list">
        {ROOM_STEPS.map(([h, t]) => <li key={h}><h3>{h}</h3><p>{t}</p></li>)}
      </ol>
    </AppFrame>
  )
}

const SAMPLE_REFLECTION = { evidence: SAMPLE_EVALUATION.map((e, i) => ({ turnId: `sample-${i}`, ...e })) } as unknown as Reflection

/** Your evaluation, rendered by the same component as the session report, on the sample answers from the room above. */
export function EvaluationPanel() {
  return (
    <AppFrame bar="Sessions · Behavioural round" className="ms-app--wide ms-app--scroll">
      <div className="ms-app__body"><EvaluationSection reflection={SAMPLE_REFLECTION} busy={false} failed={false} onAdd={() => {}} /></div>
    </AppFrame>
  )
}

export function StoriesPanel() {
  const s = STORIES_PANEL
  return (
    <AppFrame bar={`Stories · ${s.head}`} className="ms-app--wide">
      <div className="ms-app__body ms-stories">
        <ul className="ms-stories__themes" aria-label={s.themesLabel}>{s.themes.map(t => <li key={t}>{t}</li>)}</ul>
        {s.items.map(it => (
          <article key={it.title} className="ms-stories__card">
            <span className="ms-stories__theme">{it.theme}</span>
            <h3>{it.title}</h3>
            <blockquote>“{it.line}”</blockquote>
          </article>
        ))}
      </div>
    </AppFrame>
  )
}

/** Small real-UI pictures for the overview cards. Decorative: the card text says the same. */
export function PillarArt({ id }: { id: string }) {
  if (id === 'prep') return <div className="fc fc--2 ms-mini-fc"><span className="fc-folder" data-label="Interview loop" data-title={PREP_ROLES[0]?.title ?? 'Product Manager'} /></div>
  if (id === 'room') return <div className="ms-mini-orb"><DotOrb energy={0.25} /></div>
  if (id === 'evaluation') return (
    <div className="ms-mini-ev">
      {SAMPLE_EVALUATION.slice(0, 3).map(e => <span key={e.competency} className={`ev-item ev-item--${e.level}`}><b>{e.competency}</b><span className="ev-level">{e.level === 'starting' ? 'Just starting' : e.level}</span></span>)}
    </div>
  )
  return <div className="ms-mini-story"><span className="ms-stories__theme">{STORIES_PANEL.items[0].theme}</span><span>“{STORIES_PANEL.items[0].line}”</span></div>
}

/** Fixed left dot-nav: slides in while the feature sections are on screen and highlights the one nearest the viewport middle. */
export function SideNav({ wrapRef }: { wrapRef: React.RefObject<HTMLElement | null> }) {
  const [shown, setShown] = useState(false)
  const [active, setActive] = useState(0)
  useEffect(() => {
    let raf = 0
    const calc = () => {
      raf = 0
      const wrap = wrapRef.current
      if (!wrap) return
      const r = wrap.getBoundingClientRect(), mid = window.innerHeight / 2
      setShown(r.top < mid && r.bottom > mid)
      let best = 0
      PILLARS.items.forEach((p, i) => { const el = document.getElementById(p.id); if (el && el.getBoundingClientRect().top < mid) best = i })
      setActive(best)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(calc) }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    on()
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [wrapRef])
  return (
    <nav className={`ms-side-nav${shown ? ' ms-is-shown' : ''}`} aria-label={PILLARS.sideLabel} inert={!shown}>
      {PILLARS.items.map((p, i) => (
        <a key={p.id} href={`#${p.id}`} className={i === active ? 'ms-is-active' : undefined} aria-current={i === active ? 'location' : undefined}>
          <i style={{ ['--ms-c1' as string]: p.dot[0], ['--ms-c2' as string]: p.dot[1] }} />
          <span>{p.name}</span>
        </a>
      ))}
    </nav>
  )
}
