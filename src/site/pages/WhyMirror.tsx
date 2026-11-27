import SiteLayout from '../SiteLayout'
import { useSite } from '../SiteContext'
import { Button, Card, Faq, Reveal, Section } from '../ui'
import { WHY as W } from '../copy/why-mirror'
import './why-mirror.css'

const mark = (v: boolean | string) => typeof v === 'string' ? v
  : v ? <span className="ms-yes" role="img" aria-label={W.yes}>✓</span> : <span className="ms-no" role="img" aria-label={W.no}>—</span>

export default function WhyMirror() {
  const { onTry } = useSite()
  return (
    <SiteLayout title="Why Mirror">
      <section className="ms-phero">
        <div className="ms-phero__eyebrow"><i />{W.eyebrow}</div>
        <Reveal><h1 className="ms-h1--md">{W.h1[0]}{" "}<br />{W.h1[1]}</h1></Reveal>
        <Reveal><p className="ms-phero__sub">{W.sub}</p></Reveal>
        <Button onClick={onTry}>{W.cta}</Button>
      </section>
      <section className="ms-sec ms-sec--tight">
        <div className="ms-wm-grid">
          {W.highlights.map(h => <Reveal key={h.big}><Card variant="stat" tone={h.tone}><b>{h.big}</b><span>{h.small}</span></Card></Reveal>)}
        </div>
      </section>
      <section className="ms-sec">
        <div className="ms-sec__head ms-sec__head--center"><h2 className="ms-h2-sm">{W.sideTitle}</h2></div>
        <div className="ms-vs" role="table" aria-label={W.tableLabel}>
          <div className="ms-vs__row ms-vs__row--head" role="row">
            {W.columns.map((c, i) => <span key={i} role="columnheader">{c}</span>)}
          </div>
          {W.rows.map(r => (
            <div key={r.label} className="ms-vs__row" role="row">
              <span role="rowheader">{r.label}</span>
              <span role="cell">{mark(r.mirror)}</span>
              <span role="cell">{mark(r.alone)}</span>
            </div>
          ))}
        </div>
      </section>
      <Section tone="dark">
        <div className="ms-sec__head"><h2 className="ms-h2 ms-h2--light">{W.waysTitle}</h2></div>
        <div className="ms-grid4">
          {W.ways.map(w => <div key={w.h} className="ms-fcard ms-wm-dark"><h4>{w.h}</h4><p>{w.p}</p></div>)}
        </div>
      </Section>
      <section className="ms-sec">
        <div className="ms-sec__head ms-sec__head--center"><h2 className="ms-h2-sm">{W.faqTitle}</h2></div>
        <Faq items={W.faq} />
      </section>
    </SiteLayout>
  )
}
