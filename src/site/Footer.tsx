import { SiteLink } from './router'
import { useSite } from './SiteContext'
import { BRAND, FOOTER } from './copy/shared'

/** Site footer: brand line, four link columns, small legal row. The "Sign in" entry runs the app's sign-in path. */
export default function Footer() {
  const { onTry } = useSite()
  return (
    <footer className="ms-site-footer">
      <div className="ms-footer">
        <div className="ms-footer__top">
          <SiteLink className="ms-nav__logo ms-nav__logo--light" href="/"><span>{BRAND}</span></SiteLink>
          <span className="ms-light-60">{FOOTER.byline}</span>
        </div>
        <div className="ms-footer__cols">
          {FOOTER.columns.map(col => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="ms-footer__h">{col.title}</h2>
              {col.links.map(l => 'href' in l
                ? <SiteLink key={l.label} href={l.href}>{l.label}</SiteLink>
                : <a key={l.label} href="/workspace" onClick={e => { e.preventDefault(); onTry() }}>{l.label}</a>)}
            </nav>
          ))}
        </div>
        <div className="ms-footer__legal"><span>{FOOTER.line}</span></div>
      </div>
    </footer>
  )
}
