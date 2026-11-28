/* eslint-disable react-refresh/only-export-components */
// Shared building blocks for every marketing page. Styles live in site.css (all classes are `ms-` prefixed).
// Every behaviour here uses refs + effects with cleanup, honours prefers-reduced-motion and works from the keyboard.
import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
  type ButtonHTMLAttributes, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject,
} from 'react'
import { SiteLink } from './router'
import { MeshGradient } from './MeshGradient'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ------------------------------------------------------------------ hooks */

/** True when the visitor asked for reduced motion. Live-updates. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const m = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return reduced
}

/** Tracks whether an element is on screen (IntersectionObserver). `once` stops after the first hit. Treated as visible without IO. */
export function useInView<T extends Element>(opts: { threshold?: number | number[]; rootMargin?: string; once?: boolean } = {}): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')
  const { threshold, rootMargin, once } = opts
  const thresholdKey = Array.isArray(threshold) ? threshold.join(',') : threshold
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => {
      const last = entries[entries.length - 1]
      const hit = once ? entries.some(e => e.isIntersecting) : (threshold === undefined ? last.isIntersecting : last.intersectionRatio >= (Array.isArray(threshold) ? threshold[threshold.length - 1] : threshold))
      if (once) { if (hit) { setInView(true); io.disconnect() } } else setInView(hit)
    }, { threshold, rootMargin })
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thresholdKey, rootMargin, once])
  return [ref, inView]
}

/** The id (from `ids`) of the section that is currently under the reading line. `line` is the viewport fraction (default 0.3). */
export function useScrollSpy(ids: string[], line = 0.3): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join('|')
  useEffect(() => {
    const list = key ? key.split('|') : []
    if (!list.length) return
    let raf = 0
    const calc = () => {
      raf = 0
      const y = window.innerHeight * line
      let cur = list[0]
      for (const id of list) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < y) cur = id }
      setActive(cur)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(calc) }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    on()
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [key, line])
  return active
}

/** Roving-tabindex arrow-key handling for a tablist. */
function tabKeys(e: KeyboardEvent, count: number, current: number, select: (i: number) => void, focusTab: (i: number) => void) {
  let next = -1
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (current + 1) % count
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (current - 1 + count) % count
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = count - 1
  if (next < 0) return
  e.preventDefault(); select(next); focusTab(next)
}

function focusVisibleWithin(e: { target: EventTarget }): boolean {
  try { return (e.target as Element).matches(':focus-visible') } catch { return false }
}

/* ------------------------------------------------------------------ layout */

const WIDTHS = { wide: '83rem', md: '69rem', narrow: '55rem', xs: '41rem' } as const

/** Centred max-width wrapper. `size`: wide 83rem (default), md 69rem, narrow 55rem, xs 41rem. */
export function Container({ size = 'wide', className, children }: { size?: keyof typeof WIDTHS; className?: string; children: ReactNode }) {
  return <div className={cx('ms-container', className)} style={{ maxWidth: WIDTHS[size] }}>{children}</div>
}

/** A page section with the standard vertical rhythm. `tone="dark"` gives the warm dark band; `bare` skips the inner Container. */
export function Section({ id, tone = 'light', top84, noTop, bare, size, className, children, ...aria }: {
  id?: string; tone?: 'light' | 'dark'; top84?: boolean; noTop?: boolean; bare?: boolean; size?: keyof typeof WIDTHS
  className?: string; children: ReactNode; 'aria-labelledby'?: string; 'aria-label'?: string
}) {
  return (
    <section id={id} className={cx('ms-section', tone === 'dark' && 'ms-dark', top84 && 'ms-section--top84', noTop && 'ms-section--no-top', className)} {...aria}>
      {bare ? children : <Container size={size}>{children}</Container>}
    </section>
  )
}

/** Small uppercase label above a heading. `light` for dark backgrounds. */
export function Eyebrow({ light, className, children }: { light?: boolean; className?: string; children: ReactNode }) {
  return <p className={cx('ms-eyebrow', light && 'ms-eyebrow--light', className)}>{children}</p>
}

/** Button or link. With `href` it renders an anchor (internal paths use SiteLink); otherwise a `<button type="button">`. */
export function Button({ variant = 'primary', size, href, className, children, ...rest }: {
  variant?: 'primary' | 'secondary' | 'light'; size?: 'md' | 'sm'; href?: string; className?: string; children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>) {
  const cls = cx('ms-btn', `ms-btn--${variant}`, size && `ms-btn--${size}`, className)
  if (href) {
    if (href.startsWith('/')) return <SiteLink href={href} className={cls}>{children}</SiteLink>
    return <a href={href} className={cls} rel="noopener noreferrer">{children}</a>
  }
  return <button type="button" className={cls} {...rest}>{children}</button>
}

/** Rounded surface. `variant`: bento (default, grey panel), feature (padded feature card), stat (coloured number card, set `tone`). */
export function Card({ variant = 'bento', tone, as: Tag = 'div', className, style, children }: {
  variant?: 'bento' | 'feature' | 'stat'; tone?: 'violet' | 'green' | 'amber' | 'cyan' | 'yellow'
  as?: 'div' | 'article' | 'li' | 'section'; className?: string; style?: CSSProperties; children: ReactNode
}) {
  const base = variant === 'feature' ? 'ms-fcard' : variant === 'stat' ? cx('ms-stat', tone && `ms-stat--${tone}`) : 'ms-card'
  return <Tag className={cx(base, className)} style={style}>{children}</Tag>
}

/* ------------------------------------------------------------------ reveal, count-up, marquee */

/** Fades and lifts its children in once, when they scroll into view. Static under reduced motion. `delay` in ms. */
export function Reveal({ as: Tag = 'div', delay = 0, className, children }: { as?: 'div' | 'section' | 'li' | 'article'; delay?: number; className?: string; children: ReactNode }) {
  const [ref, seen] = useInView<HTMLElement>({ rootMargin: '0px 0px -10% 0px', once: true })
  const reduced = useReducedMotion()
  const Any = Tag as 'div'
  return (
    <Any ref={ref as RefObject<HTMLDivElement>} className={cx('ms-reveal', (seen || reduced) && 'ms-is-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</Any>
  )
}

/** A number that counts up to `to` when it scrolls into view (instant under reduced motion). Screen readers get the final value. */
export function CountUp({ to, suffix = '', durationMs = 1200, className }: { to: number; suffix?: string; durationMs?: number; className?: string }) {
  const reduced = useReducedMotion()
  const [ref, visible] = useInView<HTMLSpanElement>({ threshold: 0.6, once: true })
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!visible || reduced) return
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs)
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [visible, reduced, to, durationMs])
  const shown = reduced ? to : value
  return (
    <span ref={ref} className={className}>
      <span className="ms-sr">{to}{suffix}</span>
      <span aria-hidden="true">{shown}{suffix}</span>
    </span>
  )
}

/** A slow marquee. Items are doubled for the loop (the copy is aria-hidden). It pauses on hover/focus and becomes a wrapped static list under reduced motion. */
export function Marquee({ items, variant = 'logos', direction = 'left', label }: {
  items: ReactNode[]; variant?: 'logos' | 'chips' | 'icons'; direction?: 'left' | 'right'; label?: string
}) {
  const wrap = variant === 'logos' ? 'ms-logos__viewport' : variant === 'chips' ? 'ms-chip-rows' : 'ms-icon-marquee'
  const track = variant === 'logos' ? 'ms-logos__track' : variant === 'chips' ? `ms-chips ms-chips--${direction}` : `ms-icons ms-icons--${direction}`
  const Item = variant === 'logos' ? 'span' : variant === 'chips' ? 'span' : 'i'
  const cls = variant === 'chips' ? 'ms-chip' : undefined
  return (
    <div className={cx('ms-marquee', wrap)} role="group" aria-label={label}>
      <div className={track} style={direction === 'right' && variant === 'logos' ? { animationDirection: 'reverse' } : undefined}>
        {items.map((n, i) => <Item key={`a${i}`} className={cls}>{n}</Item>)}
        {items.map((n, i) => <Item key={`b${i}`} className={cx(cls, 'ms-dup')} aria-hidden="true">{n}</Item>)}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ tabs */

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  /** Label of the call to action while this tab is current. */
  cta?: string
  panel: ReactNode
  /** Dwell override in ms. */
  durationMs?: number
}

/** The icon-tab block with a progress ring (the home "duo" pattern). Autoplays only while on screen, with the page visible and
 *  no keyboard focus inside; the first choice stops autoplay for good. No autoplay under reduced motion. Arrow keys move between tabs. */
export function Tabs({ items, dwellMs = 10000, autoplay = true, ctaHref, ctaDefault, gradient, label }: {
  items: TabItem[]; dwellMs?: number; autoplay?: boolean; ctaHref?: string; ctaDefault?: string
  gradient?: { colors: [string, string, string]; ground?: string }; label: string
}) {
  const uid = useId()
  const [cur, setCur] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [focused, setFocused] = useState(false)
  const reduced = useReducedMotion()
  const [rootRef, visible] = useInView<HTMLDivElement>({ threshold: [0, 0.2] })
  const tabEls = useRef<(HTMLButtonElement | null)[]>([])
  const elapsed = useRef(0)
  const auto = autoplay && !reduced && !stopped && items.length > 1

  useEffect(() => {
    elapsed.current = 0
    tabEls.current.forEach(t => t?.style.removeProperty('--ms-p'))
  }, [cur])

  useEffect(() => {
    if (!auto || !visible || focused) return
    const el = tabEls.current[cur]
    if (el) { const w = el.offsetWidth, h = el.offsetHeight; el.style.setProperty('--ms-o', (-(w + h + w / 2) / (2 * (w + h)) * 100).toFixed(2)) }
    const dwell = items[cur]?.durationMs ?? dwellMs
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      elapsed.current += Math.min(Math.max(now - last, 0), 100)
      last = now
      el?.style.setProperty('--ms-p', (Math.min(elapsed.current / dwell, 1) * 100).toFixed(2))
      if (elapsed.current >= dwell) { setCur(c => (c + 1) % items.length); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [auto, visible, focused, cur, items, dwellMs])

  const choose = (i: number) => { setStopped(true); setCur(i) }
  const cta = items[cur]?.cta ?? ctaDefault
  return (
    <div ref={rootRef} className={cx('ms-tabs', auto && 'ms-is-autoplay', stopped && 'ms-is-stopped')}
      onFocus={e => { if (focusVisibleWithin(e)) setFocused(true) }} onBlur={() => setFocused(false)}>
      <div className="ms-tabs__bar">
        <div className="ms-tabs__menu" role="tablist" aria-label={label}
          onKeyDown={e => tabKeys(e, items.length, cur, choose, i => tabEls.current[i]?.focus())}>
          {items.map((t, i) => (
            <button key={t.id} ref={el => { tabEls.current[i] = el }} type="button" role="tab" id={`${uid}-t-${t.id}`}
              aria-selected={i === cur} aria-controls={`${uid}-p-${t.id}`} tabIndex={i === cur ? 0 : -1}
              className={cx('ms-tab', i === cur && 'ms-is-current')} onClick={() => choose(i)}>
              <span className="ms-tab__icon" aria-hidden="true">{t.icon}</span>
              <span className="ms-tab__label">{t.label}</span>
              <svg className="ms-tab__ring" aria-hidden="true"><rect pathLength={100} /></svg>
            </button>
          ))}
        </div>
        {ctaHref && cta && <Button size="md" href={ctaHref} className="ms-tabs__cta"><span>{cta}</span></Button>}
      </div>
      <div className="ms-tabs__card">
        {gradient && <MeshGradient colors={gradient.colors} ground={gradient.ground} />}
        {items.map((t, i) => (
          <div key={t.id} id={`${uid}-p-${t.id}`} role="tabpanel" aria-labelledby={`${uid}-t-${t.id}`}
            className={cx('ms-pane', i === cur && 'ms-is-active')} inert={i !== cur}>{t.panel}</div>
        ))}
      </div>
    </div>
  )
}

export interface AutoTabItem { id: string; title: string; desc?: string; panel: ReactNode }

/** Vertical use-case tabs for dark bands; each tab dwells `dwellMs` with a thin progress bar, then the next one opens.
 *  Pauses when off screen, when the page is hidden or while a tab has keyboard focus; the first choice stops it for good; off under reduced motion. */
export function AutoTabs({ items, dwellMs = 6000, label, className }: { items: AutoTabItem[]; dwellMs?: number; label: string; className?: string }) {
  const uid = useId()
  const [cur, setCur] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const reduced = useReducedMotion()
  const [rootRef, visible] = useInView<HTMLDivElement>({ threshold: 0.2 })
  const tabEls = useRef<(HTMLButtonElement | null)[]>([])
  const running = !reduced && !stopped && items.length > 1 && visible && !hidden && !focused

  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => setCur(c => (c + 1) % items.length), dwellMs)
    return () => window.clearTimeout(t)
  }, [running, cur, dwellMs, items.length])

  const choose = (i: number) => { setStopped(true); setCur(i) }
  return (
    <div ref={rootRef} className={cx('ms-vtabs', stopped && 'ms-is-stopped', className)} style={{ ['--ms-dwell' as string]: `${dwellMs}ms` }}
      onFocus={e => { if (focusVisibleWithin(e)) setFocused(true) }} onBlur={() => setFocused(false)}>
      <div className="ms-vtabs__list" role="tablist" aria-label={label} aria-orientation="vertical"
        onKeyDown={e => tabKeys(e, items.length, cur, choose, i => tabEls.current[i]?.focus())}>
        {items.map((t, i) => (
          <button key={t.id} ref={el => { tabEls.current[i] = el }} type="button" role="tab" id={`${uid}-t-${t.id}`}
            aria-selected={i === cur} aria-controls={`${uid}-p-${t.id}`} tabIndex={i === cur ? 0 : -1}
            className={cx('ms-vtab', i === cur && 'ms-is-current', i === cur && running && 'ms-is-run')} onClick={() => choose(i)}>
            <b>{t.title}</b>{t.desc && <span>{t.desc}</span>}
          </button>
        ))}
      </div>
      <div className="ms-vscreen">
        {items.map((t, i) => (
          <div key={t.id} id={`${uid}-p-${t.id}`} role="tabpanel" aria-labelledby={`${uid}-t-${t.id}`}
            className={cx(i === cur && 'ms-is-active')} inert={i !== cur}>{t.panel}</div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ FAQ, TOC, filters, billing */

/** Numbered accordion, one open at a time. Closed answers are inert (not focusable, hidden from screen readers). */
export function Faq({ items, className }: { items: { q: string; a: ReactNode }[]; className?: string }) {
  const uid = useId()
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className={cx('ms-faq', className)}>
      {items.map((it, i) => {
        const isOpen = open === i
        return (
          <div key={i} className={cx('ms-faq__item', isOpen && 'ms-is-open')}>
            <h3>
              <button type="button" className="ms-faq__q" id={`${uid}-q${i}`} aria-expanded={isOpen} aria-controls={`${uid}-a${i}`}
                onClick={() => setOpen(isOpen ? null : i)}>
                <span className="ms-faq__n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <span>{it.q}</span>
                <span className="ms-faq__plus" aria-hidden="true" />
              </button>
            </h3>
            <div className="ms-faq__a" id={`${uid}-a${i}`} role="region" aria-labelledby={`${uid}-q${i}`} inert={!isOpen}>
              <div><p>{it.a}</p></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** "On this page" list built from the h2s inside `target` (a CSS selector such as "#article"), with a scroll spy and optional reading-progress bar.
 *  Hidden below 992px by the stylesheet. Give the h2s `scroll-margin-top` (the .ms-prose class does). */
export function Toc({ target, label = 'On this page', progress }: { target: string; label?: string; progress?: boolean }) {
  const [heads, setHeads] = useState<{ id: string; text: string }[]>([])
  const reduced = useReducedMotion()
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const src = document.querySelector(target)
    if (!src) return
    const hs = [...src.querySelectorAll('h2')]
    // eslint-disable-next-line react-hooks/set-state-in-effect -- headings are read from the DOM after mount
    setHeads(hs.map((h, i) => { h.id = h.id || `s${i}`; return { id: h.id, text: h.textContent ?? '' } }))
  }, [target])
  const active = useScrollSpy(useMemo(() => heads.map(h => h.id), [heads]))
  useEffect(() => {
    if (!progress) return
    const src = document.querySelector(target)
    const bar = barRef.current
    if (!src || !bar) return
    let raf = 0
    const calc = () => {
      raf = 0
      const r = src.getBoundingClientRect()
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)))})`
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(calc) }
    window.addEventListener('scroll', on, { passive: true })
    on()
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [target, progress])
  const go = useCallback((e: MouseEvent, id: string) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    window.history.replaceState(window.history.state, '', `#${id}`)
  }, [reduced])
  return (
    <nav className="ms-toc" aria-label={label}>
      <div className="ms-toc__label">{label}</div>
      {heads.map(h => <a key={h.id} href={`#${h.id}`} aria-current={active === h.id ? 'location' : undefined}
        className={cx(active === h.id && 'ms-is-active')} onClick={e => go(e, h.id)}>{h.text}</a>)}
      {progress && <div className="ms-toc__progress" ref={barRef} aria-hidden="true" />}
    </nav>
  )
}

export interface FilterItem {
  id: string
  /** Filter ids this item belongs to. */
  tags: string[]
  /** Text the search box matches against. */
  text: string
  node: ReactNode
}

/** Filter chips + search over a list. State lives in React. Items render in a `<ul>` whose class is `listClassName` (for example "ms-grid3").
 *  Announces the shown count politely. The "all" chip is added for you. */
export function FilterList({ items, filters, allLabel = 'All', searchLabel = 'Search', searchPlaceholder, emptyText, shownLabel = 'shown', listClassName, className }: {
  items: FilterItem[]; filters: { id: string; label: string }[]; allLabel?: string; searchLabel?: string
  searchPlaceholder?: string; emptyText: string; shownLabel?: string; listClassName?: string; className?: string
}) {
  const [cur, setCur] = useState('all')
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const shown = items.filter(it => (cur === 'all' || it.tags.includes(cur)) && (!term || it.text.toLowerCase().includes(term)))
  const chips = [{ id: 'all', label: allLabel }, ...filters]
  return (
    <div className={className}>
      <div className="ms-chips-bar">
        {chips.map(c => (
          <button key={c.id} type="button" className={cx('ms-fchip', cur === c.id && 'ms-is-active')} aria-pressed={cur === c.id} onClick={() => setCur(c.id)}>{c.label}</button>
        ))}
        <label className="ms-search">
          <span className="ms-sr">{searchLabel}</span>
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="search" value={q} placeholder={searchPlaceholder} onChange={e => setQ(e.target.value)} />
        </label>
      </div>
      <p className="ms-sr" role="status">{shown.length} {shownLabel}</p>
      {shown.length > 0
        ? <ul className={cx('ms-list', listClassName)} style={{ listStyle: 'none', padding: 0, margin: '24px 0 0' }}>{shown.map(it => <li key={it.id}>{it.node}</li>)}</ul>
        : <p className="ms-fine" style={{ marginTop: 24 }}>{emptyText}</p>}
    </div>
  )
}

/** Monthly / yearly switch (controlled). Pair it with <PriceSwap value=...> for the animated price text. */
export function BillingToggle({ value, onChange, monthlyLabel = 'Monthly', yearlyLabel = 'Yearly', label = 'Bill yearly' }: {
  value: 'monthly' | 'yearly'; onChange: (v: 'monthly' | 'yearly') => void; monthlyLabel?: string; yearlyLabel?: string; label?: string
}) {
  return (
    <button type="button" className="ms-toggle" aria-pressed={value === 'yearly'} aria-label={label}
      onClick={() => onChange(value === 'yearly' ? 'monthly' : 'yearly')}>
      {monthlyLabel} <span className="ms-toggle__sw" aria-hidden="true" /> {yearlyLabel}
    </button>
  )
}

/** Price text that swaps with a quick vertical slide when `value` changes. */
export function PriceSwap({ value, monthly, yearly }: { value: 'monthly' | 'yearly'; monthly: ReactNode; yearly: ReactNode }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (value === shown) return
    const t = window.setTimeout(() => setShown(value), 150)
    return () => window.clearTimeout(t)
  }, [value, shown])
  return <span className={cx('ms-swap', value !== shown && 'ms-is-swap')}>{shown === 'yearly' ? yearly : monthly}</span>
}
