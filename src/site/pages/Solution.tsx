import SiteLayout from '../SiteLayout'
import { useSite } from '../SiteContext'
import { MeshGradient } from '../MeshGradient'
import { Button, Faq, Marquee, Reveal } from '../ui'
import { DEFAULT_PERSONA, PERSONAS, SOLUTION_COMMON as C } from '../copy/solution'
import type { SitePageProps } from '../types'
import './solution.css'

export default function Solution({ params }: SitePageProps) {
  const { onTry } = useSite()
  const key = (params.persona ?? '').toLowerCase()
  const p = Object.prototype.hasOwnProperty.call(PERSONAS, key) ? PERSONAS[key] : undefined

  if (!p) {
    return (
      <SiteLayout title="Not found">
        <div className="ms-phero ms-sp-notfound">
          <h1 className="ms-h1--md">{C.notFound.title}</h1>
          <p className="ms-phero__sub">{C.notFound.text}</p>
          <div className="ms-sp-actions">
            <Button href={`/for/${DEFAULT_PERSONA}`}>{C.notFound.back}</Button>
            <Button variant="secondary" href="/">{C.notFound.all}</Button>
          </div>
        </div>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout title={p.navLabel}>
      <section className="ms-phero ms-phero--left ms-sp-hero">
        <div className="ms-sp-grid">
          <div>
            <div className="ms-phero__eyebrow"><i style={{ ['--ms-c1' as string]: '#ffbd7e', ['--ms-c2' as string]: '#dc93c3' }} />{p.eyebrow}</div>
            <Reveal><h1 className="ms-h1">{p.h1[0]}{" "}<br />{p.h1[1]}</h1></Reveal>
            <Reveal><p className="ms-phero__sub">{p.sub}</p></Reveal>
            <Button onClick={onTry}>{C.cta}</Button>
          </div>
          <div className="ms-sp-beam" aria-hidden="true">
            <div className="ms-sp-beam__light"><MeshGradient colors={['#e8400d', '#ffeed8', '#d0b2ff']} ground="#fbfaf9" /></div>
            <svg className="ms-sp-beam__figure" viewBox="0 0 200 260" fill="none" stroke="#222" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="70" cy="60" r="22" /><path d="M70 82v80M70 162l-22 80M70 162l24 78M70 100l-30 30M70 100l40-20" />
              <rect x="108" y="64" width="34" height="24" rx="4" /><circle cx="63" cy="57" r="1.5" fill="#222" /><circle cx="77" cy="57" r="1.5" fill="#222" />
              <path d="M64 68c4 3 8 3 12 0" />
            </svg>
          </div>
        </div>
      </section>
      <section className="ms-logos" aria-label={C.logosLabel}>
        <p>{C.logosNote}</p>
        <Marquee items={C.logos} label={C.logosLabel} />
      </section>
      <section className="ms-sec">
        <div className="ms-sec__head"><h2 className="ms-h2-sm">{p.momentsTitle[0]}{" "}<br />{p.momentsTitle[1]}</h2><p>{p.momentsSub}</p></div>
        <div className="ms-grid2">
          {p.moments.map(m => <Reveal key={m.h} className="ms-scard"><h3 id={m.id}>{m.h}</h3><p className="ms-mock__muted">{m.p}</p></Reveal>)}
        </div>
      </section>
      <div className="ms-frow">
        <Reveal className="ms-frow__text">
          <div className="ms-eyebrow">{p.space.eyebrow}</div>
          <h3>{p.space.title}</h3>
          <p>{p.space.text}</p>
          <Button size="md" href={C.spaceHref}>{p.space.cta}</Button>
        </Reveal>
        <Reveal className="ms-frow__visual">
          <MeshGradient colors={['#ffbd7e', '#ffeed8', '#c8c4ea']} />
          <div className="ms-mock" style={{ width: '80%', position: 'relative', zIndex: 1 }}>
            <div className="ms-mock__head"><span>{p.space.mockHead}</span><span className="ms-sp-sample">{C.sampleTag}</span></div>
            {/* TODO(placeholder): sample chart, replace with real product visual */}
            <div className="ms-bars" role="img" aria-label={C.barsLabel}>{[30, 45, 60, 72, 80].map(h => <i key={h} style={{ ['--ms-h' as string]: `${h}%` }} />)}</div>
          </div>
        </Reveal>
      </div>
      <section className="ms-sec">
        <div className="ms-sec__head"><h2 className="ms-h2-sm">{p.reasonsTitle}<span className="ms-sp-sample">{C.sampleTag}</span></h2><p>{C.reasonsSub}</p></div>
        {/* TODO(placeholder): sample reasons, replace with real ones */}
        <div className="ms-grid3">
          {p.reasons.map(r => <Reveal key={r.h} className="ms-fcard"><h4>{r.h}</h4><p>{r.p}</p></Reveal>)}
        </div>
      </section>
      <section className="ms-sec">
        <div className="ms-sec__head ms-sec__head--center"><h2 className="ms-h2-sm">{C.faqTitle}</h2></div>
        <Faq items={p.faq} />
      </section>
    </SiteLayout>
  )
}
