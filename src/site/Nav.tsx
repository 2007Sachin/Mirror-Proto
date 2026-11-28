import { useEffect, useId, useRef, useState } from 'react'
import { SiteLink } from './router'
import { useSite } from './SiteContext'
import { Button } from './ui'
import { BRAND, NAV_CTA, NAV_GROUPS, NAV_LINKS } from './copy/shared'

const canHover = () => typeof matchMedia === 'function' && matchMedia('(hover: hover)').matches
const Chevron = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
const Mark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M12 3c-4 0-6.5 3.2-6.5 7.2S8 17.5 12 17.5s6.5-3.3 6.5-7.3S16 3 12 3Zm0 14.5V21m-3.5 0h7" /><circle cx="9.7" cy="9.8" r="1" fill="currentColor" /><circle cx="14.3" cy="9.8" r="1" fill="currentColor" /></svg>
)

/** Site header. At the top of the page it is a full-width bar; after 40px of scroll it becomes a floating pill (BLUEPRINT 2.3).
 *  Dropdowns open on hover (pointer) or Enter/Space/click (keyboard), close on Escape, outside click or when focus leaves.
 *  Below 992px a menu button opens a full menu (Escape closes it and returns focus to the button; page scroll is locked while open). */
export default function Nav() {
  const { onTry } = useSite()
  const uid = useId()
  const [minified, setMinified] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [menu, setMenu] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const burgerRef = useRef<HTMLButtonElement>(null)
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  useEffect(() => {
    const on = () => setMinified(window.scrollY > 40)
    window.addEventListener('scroll', on, { passive: true })
    on()
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    if (open === null && !menu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (menu) { setMenu(false); burgerRef.current?.focus() }
      else if (open !== null) { btnRefs.current[open]?.focus(); setOpen(null) }
    }
    const onDown = (e: MouseEvent) => { if (!headerRef.current?.contains(e.target as Node)) setOpen(null) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open, menu])

  useEffect(() => {
    if (!menu) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (typeof matchMedia !== 'function') return () => { document.body.style.overflow = prev }
    const mq = matchMedia('(min-width: 992px)')
    const close = () => { if (mq.matches) setMenu(false) }
    mq.addEventListener('change', close)
    return () => { document.body.style.overflow = prev; mq.removeEventListener('change', close) }
  }, [menu])

  const closeAll = () => { setOpen(null); setMenu(false) }
  const current = (href: string) => (path === href ? 'page' as const : undefined)

  return (
    <header ref={headerRef} className={`ms-nav${minified ? ' ms-is-minified' : ''}${menu ? ' ms-is-menu-open' : ''}`}>
      <div className="ms-nav__content">
        <SiteLink className="ms-nav__logo" href="/" aria-label={NAV_CTA.homeLabel} onClick={closeAll}><Mark /><span>{BRAND}</span></SiteLink>
        <nav className="ms-nav__links" aria-label={NAV_CTA.mainLabel}>
          {NAV_GROUPS.map((g, i) => (
            <div key={g.label} className={`ms-dd${open === i ? ' ms-is-open' : ''}`}
              onMouseEnter={() => { if (canHover()) setOpen(i) }}
              onMouseLeave={() => setOpen(o => (o === i ? null : o))}
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(o => (o === i ? null : o)) }}>
              <button ref={el => { btnRefs.current[i] = el }} type="button" className="ms-nav__link" aria-expanded={open === i}
                aria-controls={`${uid}-dd${i}`} onClick={() => setOpen(open === i ? null : i)}>{g.label} <Chevron /></button>
              <div className="ms-dd__panel" id={`${uid}-dd${i}`}>
                {g.items.map(it => (
                  <SiteLink key={it.href} href={it.href} aria-current={current(it.href)} onClick={closeAll}><b>{it.label}</b><span>{it.desc}</span></SiteLink>
                ))}
              </div>
            </div>
          ))}
          {NAV_LINKS.map(l => <SiteLink key={l.href} className="ms-nav__link" href={l.href} aria-current={current(l.href)} onClick={closeAll}>{l.label}</SiteLink>)}
        </nav>
        <div className="ms-nav__ctas">
          <Button variant="secondary" onClick={onTry}>{NAV_CTA.signIn}</Button>
          <Button variant="primary" onClick={onTry}>{NAV_CTA.primary}</Button>
          <button ref={burgerRef} type="button" className="ms-nav__burger" aria-label={menu ? NAV_CTA.closeLabel : NAV_CTA.menuLabel}
            aria-expanded={menu} aria-controls={`${uid}-menu`} onClick={() => { setOpen(null); setMenu(m => !m) }}><i /><i /></button>
        </div>
      </div>
      <div className="ms-mmenu" id={`${uid}-menu`}>
        {NAV_GROUPS.map(g => (
          <div key={g.label} role="group" aria-label={g.label}>
            <p className="ms-eyebrow" style={{ margin: '12px 12px 4px' }}>{g.label}</p>
            {g.items.map(it => <SiteLink key={it.href} href={it.href} aria-current={current(it.href)} onClick={closeAll}>{it.label}</SiteLink>)}
          </div>
        ))}
        {NAV_LINKS.map(l => <SiteLink key={l.href} href={l.href} aria-current={current(l.href)} onClick={closeAll}>{l.label}</SiteLink>)}
        <Button variant="secondary" onClick={() => { closeAll(); onTry() }}>{NAV_CTA.signIn}</Button>
        <Button variant="primary" onClick={() => { closeAll(); onTry() }}>{NAV_CTA.primary}</Button>
      </div>
    </header>
  )
}
