import SiteLayout from '../SiteLayout'
import { SiteLink } from '../router'
import { Button, CountUp, Toc } from '../ui'
import JourneyCard from './JourneyCard'
import SlugNotFound from './SlugNotFound'
import { JOURNEYS_PAGE, STORIES, STORY_PAGE as C } from '../copy/journeys'
import { useSite } from '../SiteContext'
import type { SitePageProps } from '../types'
import './Journeys.css'

export default function JourneyDetail({ params }: SitePageProps) {
  const { onTry } = useSite()
  const story = STORIES.find(s => s.slug === params.slug)
  if (!story) return <SlugNotFound backHref="/journeys" backLabel={C.notFoundBack} />
  const more = STORIES.filter(s => s !== story).slice(0, 3)
  return (
    <SiteLayout title={story.title}>
      <section className="ms-case-hero">
        <SiteLink className="ms-link" href="/journeys">{C.back}</SiteLink>
        <div className="ms-case-hero__card" style={{ marginTop: 16, background: `linear-gradient(135deg, ${story.tone}, var(--ms-violet-100))` }}>
          <div>
            <p className="ms-eyebrow ms-jr-hero-eyebrow">{C.eyebrow}</p>
            <h1 className="ms-h1--md">{story.title}</h1>
            <p className="ms-fine">{JOURNEYS_PAGE.sampleLabel}. {C.tocNote}</p>
          </div>
          <div className="ms-case-hero__stats">
            {story.stats.map(s => <div key={s.label}><b><CountUp to={s.n} suffix={s.suffix} /></b><span className="ms-mock__muted">{s.label}</span></div>)}
          </div>
        </div>
      </section>
      <div className="ms-case">
        <div>
          <article className="ms-prose" id="journey-body">
            {story.sections.map((s, i) => (
              <div key={s.h}>
                <h2>{s.h}</h2>
                <p>{s.p}</p>
                {i === 0 && <blockquote className="ms-jr-quote">&ldquo;{story.quote}&rdquo; <span className="ms-fine">{JOURNEYS_PAGE.sampleLabel}</span></blockquote>}
              </div>
            ))}
          </article>
        </div>
        <aside>
          <Toc target="#journey-body" />
          <div className="ms-facts">{story.facts.map(f => <div key={f.k}><span>{f.k}</span><b>{f.v}</b></div>)}</div>
          <Button size="md" onClick={onTry}>{C.cta}</Button>
        </aside>
      </div>
      <section className="ms-sec ms-sec--tight">
        <div className="ms-sec__head"><h2 className="ms-h2-sm">{C.more}</h2></div>
        <div className="ms-grid3">{more.map(s => <JourneyCard key={s.slug} story={s} />)}</div>
      </section>
    </SiteLayout>
  )
}
