import { useEffect, type ReactNode } from 'react'
import './site.css'
import Nav from './Nav'
import Cta from './Cta'
import Footer from './Footer'
import { SKIP_LINK } from './copy/shared'

/** Page shell for every marketing page: `.ms` root (scopes all site styles), skip link, Nav, `<main>`, closing CTA band and Footer.
 *  `title` sets document.title to "<title> — MIRROR" (restored on leave). `cta` / `footer` (default true) drop those parts,
 *  for example on the get-started page. `navTheme="dark"` is for dark heroes; `split` is for the get-started split layout. */
export default function SiteLayout({ children, title, cta = true, footer = true, navTheme, split }: {
  children: ReactNode; title?: string; cta?: boolean; footer?: boolean; navTheme?: 'dark'; split?: boolean
}) {
  useEffect(() => {
    if (!title) return
    const prev = document.title
    document.title = `${title} — MIRROR`
    return () => { document.title = prev }
  }, [title])
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView?.())
  }, [])
  return (
    <div className={`ms${split ? ' ms-page-split' : ''}`} data-nav-theme={navTheme}>
      <a className="ms-skip" href="#ms-main" onClick={e => { e.preventDefault(); document.getElementById('ms-main')?.focus() }}>{SKIP_LINK}</a>
      <Nav />
      <main id="ms-main" tabIndex={-1}>{children}</main>
      {cta && <Cta />}
      {footer && <Footer />}
    </div>
  )
}
