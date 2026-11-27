// Home page widgets: the hero auto-demo and the side dot-nav. Plain refs + effects with cleanup, no libraries.
// Both honour prefers-reduced-motion (static) and pause when off screen or when the tab is hidden.
import { useEffect, useRef, useState } from 'react'
import { SCENE, PILLARS } from '../copy/home'
import { SiteLink } from '../router'
import { useInView, useReducedMotion } from '../ui'

const ROWS = SCENE.rows
const TARGET = 5 // the row the cursor opens (second from the top once all seven have arrived)

/** The hero scene: session rows arrive, a scripted fake cursor glides to one, opens the reflection, presses "Practice again",
 *  then the scene restarts 3.5s later. Timings follow the blueprint (900ms glide, 140ms press). Under reduced motion it is a still list. */
export function HeroScene() {
  const reduced = useReducedMotion()
  const [viewRef, inView] = useInView<HTMLDivElement>({ threshold: 0.1 })
  const [hidden, setHidden] = useState(false)
  const [shown, setShown] = useState(reduced ? ROWS.length : 0)
  const [detail, setDetail] = useState(false)
  const [sent, setSent] = useState(false)
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState<'row' | 'btn' | null>(null)
  const [cursorIn, setCursorIn] = useState(false)
  const cursorRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])
  const sendRef = useRef<HTMLButtonElement>(null)
  const running = inView && !hidden && !reduced

  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  useEffect(() => {
    if (!running) return
    const scene = viewRef.current
    const cursor = cursorRef.current
    if (!scene || !cursor) return
    let alive = true
    let raf = 0
    const timers = new Set<number>()
    let cx = 0, cy = 0
    const wait = (ms: number) => new Promise<void>(r => { const t = window.setTimeout(() => { timers.delete(t); r() }, ms); timers.add(t) })
    const place = (x: number, y: number) => { cx = x; cy = y; cursor.style.transform = `translate(${x}px,${y}px)` }
    const glide = (el: HTMLElement, fx: number, fy: number) => new Promise<void>(res => {
      const sx = cx, sy = cy, t0 = performance.now()
      const f = (now: number) => {
        if (!alive) return
        const p = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - p, 3)
        const r = el.getBoundingClientRect(), s = scene.getBoundingClientRect()
        place(sx + (r.left - s.left + r.width * fx - sx) * e, sy + (r.top - s.top + r.height * fy - sy) * e)
        if (p < 1) raf = requestAnimationFrame(f); else res()
      }
      raf = requestAnimationFrame(f)
    })
    const pressOn = async (what: 'row' | 'btn') => { setPress(what); await wait(140); setPress(null) }
    const loop = async () => {
      while (alive) {
        setShown(0); setDetail(false); setSent(false); setHover(false); setCursorIn(false)
        place(scene.getBoundingClientRect().width + 24, 260)
        for (let i = 1; i <= ROWS.length; i++) { await wait(i === 1 ? 300 : i <= 3 ? 500 : 900); if (!alive) return; setShown(i) }
        setCursorIn(true); await wait(400)
        if (!rowRefs.current[TARGET]) return
        await glide(rowRefs.current[TARGET]!, 0.3, 0.55); if (!alive) return
        setHover(true); await pressOn('row')
        setDetail(true); await wait(2000); if (!alive || !sendRef.current) return
        await glide(sendRef.current, 0.45, 0.6); if (!alive) return
        await pressOn('btn'); setSent(true)
        await wait(3500)
      }
    }
    void loop()
    return () => { alive = false; cancelAnimationFrame(raf); timers.forEach(t => clearTimeout(t)) }
  }, [running, viewRef])

  // Under reduced motion (or before the loop starts) show a finished list so the scene is never empty.
  const count = reduced ? ROWS.length : shown
  const list = ROWS.slice(0, count).map((r, i) => ({ r, i })).reverse()
  return (
    <div className={`ms-hero-scene${detail ? ' ms-is-detail' : ''}`} ref={viewRef}
      role="group" aria-label={SCENE.label}>
      <div className="ms-hero-scene__screen">
        <div className="ms-hs-head">
          <span className="ms-hs-check" />
          <svg className="ms-hs-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          {SCENE.head} <span className="ms-hs-count">{count}</span>
          <span className="ms-badge-soft ms-home-sample">{SCENE.sampleNote}</span>
        </div>
        <ul className="ms-hs-list">
          {list.map(({ r, i }) => (
            <li key={i} ref={el => { rowRefs.current[i] = el }}
              className={`ms-hs-row${i === TARGET && hover ? ' ms-is-hover' : ''}${i === TARGET && press === 'row' ? ' ms-is-pressed' : ''}`}>
              <span className="ms-hs-av" style={{ ['--ms-c1' as string]: r[3], ['--ms-c2' as string]: r[4] }} />
              <div><b>{r[0]}</b><small>{r[1]}</small></div>
              <span className="ms-hs-tag">{r[2]}</span>
            </li>
          ))}
        </ul>
        <div className="ms-hs-detail" inert={!detail}>
          <div className="ms-hs-detail__title">{SCENE.detailTitle}</div>
          {SCENE.lines.map(l => <p key={l[0]} className="ms-hs-detail__line"><b>{l[0]}</b>{l[1]}</p>)}
          <div className={`ms-hs-actions${sent ? ' ms-is-sent' : ''}`}>
            <button type="button" className="ms-hs-btn ms-hs-btn--ghost" tabIndex={-1}>{SCENE.later}</button>
            <button type="button" ref={sendRef} tabIndex={-1} className={`ms-hs-btn ms-hs-btn--send${press === 'btn' ? ' ms-is-pressed' : ''}`}>{sent ? SCENE.saved : SCENE.again}</button>
          </div>
        </div>
      </div>
      <div ref={cursorRef} className={`ms-hero-cursor${cursorIn ? ' ms-is-in' : ''}${press ? ' ms-is-pressed' : ''}`} aria-hidden="true">
        <svg width="18" height="24" viewBox="0 0 18 24"><path d="M0 0v24l6.6-6.4h10.7z" fill="#fff" /><path d="M1.5 3.5v16.7l4.5-4.3 7.6 0z" fill="#111" /></svg>
      </div>
      <SiteLink href={SCENE.card.href} className="ms-hero-card">
        <span className="ms-badge">{SCENE.card.badge}</span>
        <div className="ms-hero-card__art" />
        <div className="ms-hero-card__title">{SCENE.card.title}</div>
        <span className="ms-hero-card__link">{SCENE.card.link}
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
      </SiteLink>
    </div>
  )
}

/** Fixed left dot-nav: slides in while the pillar sections are on screen and highlights the one nearest the viewport middle. */
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
