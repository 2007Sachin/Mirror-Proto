import SiteLayout from '../SiteLayout'
import { Reveal } from '../ui'
import { ABOUT as A } from '../copy/about'
import './about.css'

export default function About() {
  return (
    <SiteLayout title="About">
      <section className="ms-phero">
        <div className="ms-phero__eyebrow"><i />{A.eyebrow}</div>
        <Reveal><h1 className="ms-h1">{A.h1[0]}{" "}<br />{A.h1[1]}</h1></Reveal>
        <Reveal><p className="ms-phero__sub">{A.sub}</p></Reveal>
      </section>
      <section className="ms-sec ms-sec--tight">
        {/* TODO(placeholder): real team photos replace these tiles */}
        <div className="ms-mosaic" role="img" aria-label={A.mosaicLabel}>
          {A.mosaic.map((m, i) => (
            <i key={i} style={{ ['--ms-c1' as string]: m.c1, ['--ms-c2' as string]: m.c2, gridColumn: `span ${m.col}`, gridRow: `span ${m.row}` }} />
          ))}
        </div>
        <p className="ms-fine ms-ab-sample">{A.sampleTag}: {A.mosaicLabel}</p>
      </section>
      <section className="ms-statement"><Reveal><h2 className="ms-h2">{A.statement[0]}{" "}<br /><span style={{ color: 'var(--ms-n-300)' }}>{A.statement[1]}</span></h2></Reveal></section>
      <section className="ms-sec ms-sec--tight">
        <div className="ms-values">
          {A.values.map(v => <Reveal key={v.n} className="ms-value"><b>{v.n}</b><div><h4>{v.h}</h4><p>{v.p}</p></div></Reveal>)}
        </div>
      </section>
      <section className="ms-sec">
        <div className="ms-sec__head"><h2 className="ms-h2-sm">{A.storyTitle}<span className="ms-ab-badge">{A.sampleTag}</span></h2></div>
        {/* TODO(placeholder): real milestones */}
        <div className="ms-timeline">
          {A.story.map(s => <Reveal key={s.when} className="ms-tl"><b>{s.when}</b><span>{s.what}</span></Reveal>)}
        </div>
      </section>
    </SiteLayout>
  )
}
