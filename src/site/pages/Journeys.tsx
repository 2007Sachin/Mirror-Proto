import SiteLayout from '../SiteLayout'
import { Reveal, Button } from '../ui'
import JourneyCard from './JourneyCard'
import { JOURNEYS_PAGE as C, STORIES } from '../copy/journeys'
import { QUOTES } from '../copy/kind-words'
import './Journeys.css'

export default function Journeys() {
  const [a, b, ...rest] = STORIES
  return (
    <SiteLayout title={C.title}>
      <section className="ms-phero">
        <div className="ms-phero__eyebrow"><i />{C.eyebrow}</div>
        <h1 className="ms-h1">{C.h1[0]}<br />{C.h1[1]}</h1>
        <p className="ms-phero__sub">{C.sub}</p>
      </section>
      <section className="ms-sec ms-sec--tight">
        <p className="ms-jr-notice"><b>{C.noticeLabel}.</b> {C.notice}</p>
        <div className="ms-story-feature"><JourneyCard story={a} /><JourneyCard story={b} /></div>
        <div className="ms-grid3" style={{ marginTop: 12 }}>{rest.map(s => <JourneyCard key={s.slug} story={s} />)}</div>
      </section>
      <section className="ms-dark-band">
        <div className="ms-sec__head"><h2 className="ms-h2 ms-h2--light">{C.kindWords.h2}</h2><Button variant="light" size="md" href={C.kindWords.href}>{C.kindWords.cta}</Button></div>
        <div className="ms-wall">
          {QUOTES.slice(0, 6).map(q => (
            <Reveal key={q.name} className="ms-wcard">
              <div className="ms-wcard__who"><span className="ms-avatar" /><div><b>{C.kindWho[0]}</b>{C.kindWho[1]}</div></div>
              &ldquo;{C.kindSample}&rdquo; <span className="ms-kw-sample">{C.sampleLabel}</span>
            </Reveal>
          ))}
        </div>
      </section>
    </SiteLayout>
  )
}
