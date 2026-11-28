import SiteLayout from '../SiteLayout'
import { Button, FilterList, Reveal, Section } from '../ui'
import { CAREERS as C } from '../copy/careers'
import './careers.css'

export default function Careers() {
  // TODO(placeholder): sample jobs are not links; make each one a real posting link when openings exist.
  const items = C.jobs.map(j => ({
    id: j.id, tags: [j.team], text: `${j.title} ${j.team} ${j.place}`,
    node: <div className="ms-job"><b>{j.title}</b><span>{j.team}</span><span>{j.place}</span></div>,
  }))
  return (
    <SiteLayout title="Careers">
      <section className="ms-phero">
        <div className="ms-phero__eyebrow"><i />{C.eyebrow}</div>
        <Reveal><h1 className="ms-h1">{C.h1[0]}{" "}<br />{C.h1[1]}</h1></Reveal>
        <Reveal><p className="ms-phero__sub">{C.sub}</p></Reveal>
        <Button size="md" href="#open">{C.cta}</Button>
      </section>
      <section className="ms-sec ms-sec--tight">
        {/* TODO(placeholder): real photos replace these tiles */}
        <div className="ms-mosaic ms-cr-mosaic" role="img" aria-label={C.mosaicLabel}>
          {C.mosaic.map((m, i) => <i key={i} style={{ ['--ms-c1' as string]: m.c1, ['--ms-c2' as string]: m.c2, gridColumn: 'span 2' }} />)}
        </div>
        <p className="ms-fine ms-cr-sample">{C.sampleTag}: {C.mosaicLabel}</p>
      </section>
      <Section tone="dark">
        <div className="ms-sec__head"><h2 className="ms-h2 ms-h2--light">{C.benefitsTitle}<span className="ms-cr-badge">{C.sampleTag}</span></h2></div>
        {/* TODO(placeholder): real benefits */}
        <div className="ms-grid4">
          {C.benefits.map(b => <div key={b.h} className="ms-fcard ms-cr-dark"><h4>{b.h}</h4><p>{b.p}</p></div>)}
        </div>
      </Section>
      <section className="ms-sec" id="open">
        <div className="ms-sec__head"><h2 className="ms-h2-sm">{C.openTitle}<span className="ms-cr-badge">{C.sampleTag}</span></h2><p className="ms-split-head__p">{C.openNote}</p></div>
        <FilterList items={items} filters={C.filters} allLabel={C.allLabel} searchLabel={C.searchLabel} searchPlaceholder={C.searchPlaceholder}
          emptyText={C.emptyText} shownLabel={C.shownLabel} listClassName="ms-jobs" />
      </section>
    </SiteLayout>
  )
}
