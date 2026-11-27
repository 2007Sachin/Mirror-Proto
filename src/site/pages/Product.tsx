import SiteLayout from '../SiteLayout'
import { useSite } from '../SiteContext'
import { MeshGradient } from '../MeshGradient'
import { AutoTabs, Button, Card, CountUp, Eyebrow, Faq, Marquee, Reveal, Section } from '../ui'
import { DEFAULT_PRODUCT, PRODUCT_COMMON as C, PRODUCT_PAGES, type ProductFeature } from '../copy/product'
import type { SitePageProps } from '../types'
import './product.css'

function Feature({ f, flip, gradient }: { f: ProductFeature; flip?: boolean; gradient: [string, string, string] }) {
  return (
    <div className={`ms-frow${flip ? ' ms-frow--flip' : ''}`} id={f.id}>
      <Reveal className="ms-frow__text">
        <div className="ms-eyebrow">{f.eyebrow}</div>
        <h3>{f.title}</h3>
        <p>{f.text}</p>
        {f.checks && <ul className="ms-checks">{f.checks.map(c => <li key={c}>{c}</li>)}</ul>}
        {f.link && <Button variant="secondary" size="md" href={f.link.href}>{f.link.label}</Button>}
        {f.cta && <Button size="md" href={f.cta.href}>{f.cta.label}</Button>}
      </Reveal>
      <Reveal className="ms-frow__visual">
        <MeshGradient colors={gradient} />
        <div className="ms-mock" style={{ width: '80%', position: 'relative', zIndex: 1 }}>
          <div className="ms-mock__head"><span>{f.mockHead}</span></div>
          <ul className="ms-rows">
            {f.rows.map(r => (
              <li key={r.text}>
                {r.tone ? <span className={`ms-pill ms-pill--${r.tone === 'strong' ? 'strong' : r.tone === 'mostly' ? 'mostly' : 'revisit'}`}>{r.tag}</span>
                  : <span className="ms-pp-dot" style={{ ['--d' as string]: r.dot }} />}
                {r.text}
                {!r.tone && <em>{r.tag}</em>}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}

export default function Product({ params }: SitePageProps) {
  const { onTry } = useSite()
  const slug = (params.slug ?? DEFAULT_PRODUCT).toLowerCase()
  const p = Object.prototype.hasOwnProperty.call(PRODUCT_PAGES, slug) ? PRODUCT_PAGES[slug] : undefined

  if (!p) {
    return (
      <SiteLayout title="Not found">
        <div className="ms-phero ms-pp-notfound">
          <h1 className="ms-h1--md">{C.notFound.title}</h1>
          <p className="ms-phero__sub">{C.notFound.text}</p>
          <div className="ms-pp-actions">
            <Button href={`/product/${DEFAULT_PRODUCT}`}>{C.notFound.back}</Button>
            <Button variant="secondary" href="/">{C.notFound.all}</Button>
          </div>
        </div>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout title={p.navLabel}>
      <section className="ms-phero">
        <div className="ms-phero__eyebrow"><i />{p.eyebrow}</div>
        <Reveal><h1 className="ms-h1">{p.h1[0]}{" "}<br />{p.h1[1]}</h1></Reveal>
        <Reveal><p className="ms-phero__sub">{p.sub}</p></Reveal>
        <Button onClick={onTry}>{p.cta}</Button>
        <div className="ms-phero__rating">{C.ratingSample}</div>
        {/* TODO(placeholder): real rating line and source needed */}
      </section>
      <div className="ms-container">
        <div className="ms-pframe">
          <MeshGradient colors={['#79e7dc', '#ffe4ff', '#c8c4ea']} />
          <div className="ms-mock ms-mock--wide ms-pp-mockwide" style={{ position: 'relative', zIndex: 1 }}>
            <div className="ms-mock__head"><span>{p.mockHead[0]}</span><span className="ms-mock__muted">{p.mockHead[1]}</span></div>
            <div className="ms-chat">
              {p.chat.map(m => <div key={m.text} className={`ms-bubble ms-bubble--${m.who}`}>{m.text}</div>)}
              <div className="ms-wave" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</div>
            </div>
          </div>
        </div>
      </div>
      <section className="ms-logos" aria-label={C.logosLabel}>
        <p>{C.logosNote}</p>
        <Marquee items={C.logos} label={C.logosLabel} />
      </section>
      <section className="ms-statement"><Reveal><h2 className="ms-h2">{p.statement[0]}{" "}<br /><span style={{ color: 'var(--ms-n-300)' }}>{p.statement[1]}</span></h2></Reveal></section>
      <Feature f={p.features[0]} gradient={['#f0c0ff', '#ffeed8', '#c8c4ea']} />
      <Feature f={p.features[1]} flip gradient={['#b7efb2', '#ffeed8', '#79e7dc']} />
      <section className="ms-sec">
        <div className="ms-sec__head"><h2 className="ms-h2-sm">{p.cardsTitle[0]}{" "}<br />{p.cardsTitle[1]}</h2><p>{p.cardsSub}</p></div>
        <div className="ms-grid3">
          {p.cards.map(c => <Reveal key={c.h} className="ms-fcard"><h4>{c.h}</h4><p>{c.p}</p></Reveal>)}
        </div>
      </section>
      <section className="ms-sec ms-sec--tight">
        <div className="ms-sec__head"><h2 className="ms-h2-sm">{C.statsTitle}<span className="ms-pp-sample">{C.sampleTag}</span></h2><p>{C.statsSub}</p></div>
        {/* TODO(placeholder): sample numbers for layout only */}
        <div className="ms-pp-stats">
          {C.stats.map(s => <Card key={s.label} variant="stat" tone={s.tone}><b><CountUp to={s.to} suffix={s.suffix} /></b><span>{s.label}</span></Card>)}
        </div>
      </section>
      <Section tone="dark">
        <div className="ms-sec__head"><h2 className="ms-h2 ms-h2--light">{C.tabsTitle}</h2><p>{C.tabsSub}</p></div>
        <AutoTabs label={C.tabsLabel} items={p.tabs.map(t => ({
          id: t.id, title: t.title, desc: t.desc,
          panel: <><div className="ms-vscreen__mock"><b>{t.panelTitle}</b><p className="ms-mock__muted">{t.panelMuted}</p></div><span className="ms-play">{t.play}</span></>,
        }))} />
      </Section>
      <section className="ms-sec">
        <div className="ms-sec__head ms-sec__head--center"><Eyebrow>{p.eyebrow}</Eyebrow><h2 className="ms-h2-sm">{C.faqTitle}</h2></div>
        <Faq items={p.faq} />
      </section>
    </SiteLayout>
  )
}
