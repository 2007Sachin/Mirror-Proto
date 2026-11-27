import SiteLayout from '../SiteLayout'
import { SiteLink } from '../router'
import { useSite } from '../SiteContext'
import { Button } from '../ui'
import SlugNotFound from './SlugNotFound'
import { ADD_DETAIL as C, SOURCES } from '../copy/add-your-work'
import type { SitePageProps } from '../types'
import './AddYourWork.css'

export default function AddYourWorkDetail({ params }: SitePageProps) {
  const { onTry } = useSite()
  const s = SOURCES.find(x => x.slug === params.slug)
  if (!s) return <SlugNotFound backHref="/add-your-work" backLabel={C.notFoundBack} />
  const related = SOURCES.filter(x => x !== s)
  return (
    <SiteLayout title={s.name}>
      <section className="ms-phero ms-phero--left" style={{ maxWidth: 'var(--ms-container)', margin: '0 auto' }}>
        <SiteLink className="ms-link" href="/add-your-work">{C.back}</SiteLink>
        <div className="ms-aw-top">
          <div>
            <span className="ms-ccard__logo" style={{ background: s.color }} aria-hidden="true">{s.logo}</span>
            <h1 className="ms-h1--md">{s.title}</h1>
            <p className="ms-phero__sub">{s.sub}</p>
            <Button size="md" onClick={onTry}>{s.cta}</Button>
          </div>
          <aside className="ms-facts">{s.facts.map(f => <div key={f.k}><span>{f.k}</span><b>{f.v}</b></div>)}</aside>
        </div>
      </section>
      <div className="ms-aw-body ms-prose">
        <h2>{C.overviewH}</h2><p>{s.overview}</p>
        <h2>{C.howH}</h2>
        <ol>{s.how.map(h => <li key={h}>{h}</li>)}</ol>
      </div>
      <section className="ms-sec ms-sec--tight">
        <div className="ms-sec__head"><h2 className="ms-h2-sm">{C.related}</h2></div>
        <div className="ms-cgrid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          {related.map(r => (
            <SiteLink key={r.slug} href={`/add-your-work/${r.slug}`} className="ms-ccard">
              <span className="ms-ccard__logo" style={{ background: r.color }} aria-hidden="true">{r.logo}</span><h4>{r.name}</h4><p>{r.blurb}</p>
            </SiteLink>
          ))}
        </div>
      </section>
    </SiteLayout>
  )
}
