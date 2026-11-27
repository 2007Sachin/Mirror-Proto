import { SiteLink } from '../router'
import { Reveal } from '../ui'
import { JOURNEYS_PAGE as C, type Story } from '../copy/journeys'

/** One journey card (sample). Used by the index and the "more journeys" row. */
export default function JourneyCard({ story }: { story: Story }) {
  return (
    <Reveal>
      <SiteLink href={`/journeys/${story.slug}`} className="ms-scard ms-jr-card" style={{ background: story.tone }}>
        <span className="ms-badge-soft ms-jr-sample">{C.sampleLabel}</span>
        <h3>{story.title}</h3>
        <div className="ms-scard__stats">{story.stats.slice(0, 2).map(s => <div key={s.label}><b>{s.n}</b><span>{s.label}</span></div>)}</div>
        <div className="ms-scard__who"><span className="ms-avatar" />{story.who}</div>
      </SiteLink>
    </Reveal>
  )
}
