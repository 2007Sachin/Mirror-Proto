import { useState } from 'react'
import SiteLayout from '../SiteLayout'
import { SiteLink } from '../router'
import { Toc } from '../ui'
import SlugNotFound from './SlugNotFound'
import { NOTES, POST_PAGE as C } from '../copy/notes'
import type { SitePageProps } from '../types'
import './Notes.css'

export default function NotePost({ params }: SitePageProps) {
  const [copied, setCopied] = useState(false)
  const n = NOTES.find(x => x.slug === params.slug)
  if (!n) return <SlugNotFound backHref="/notes" backLabel={C.notFoundBack} />
  const more = NOTES.filter(x => x !== n && x.tag === n.tag).concat(NOTES.filter(x => x !== n && x.tag !== n.tag)).slice(0, 3)
  const copy = () => {
    // No network: only the clipboard. Fails quietly where the clipboard is unavailable.
    Promise.resolve(navigator.clipboard?.writeText(window.location.href)).then(() => setCopied(true), () => {})
  }
  return (
    <SiteLayout title={n.title}>
      <div className="ms-post-hero">
        <SiteLink className="ms-link" href="/notes">{C.back}</SiteLink>
        <div className="ms-acard__meta" style={{ marginTop: 16 }}>{n.tagLabel} · {n.mins} {C.minRead}</div>
        <h1 className="ms-h1 ms-nt-post-hero">{n.title}</h1>
        <div className="ms-post-hero__meta"><span className="ms-avatar" /><span>{C.byline}</span><span>{n.date}</span></div>
        <p className="ms-fine">{C.sampleNote}</p>
      </div>
      <div className="ms-nt-hero-img"><div className="ms-acard__thumb" style={{ background: n.gradient }} /></div>
      <div className="ms-article">
        <Toc target="#post-body" label={C.tocLabel} progress />
        <article className="ms-prose ms-nt-prose" id="post-body">
          <p>Placeholder article. {n.summary}</p>
          {n.sections.map(s => (
            <div key={s.h}>
              <h2>{s.h}</h2>
              <p>{s.p}</p>
              {s.callout && <div className="ms-callout">{s.callout}</div>}
              {s.quote && <blockquote>&ldquo;{s.quote}&rdquo;</blockquote>}
            </div>
          ))}
        </article>
        <div className="ms-share ms-nt-share">
          <span>{C.share}</span>
          <button type="button" onClick={copy} aria-label={C.copyLink}>&#x29C9;</button>
          <span role="status" className="ms-sr">{copied ? C.copied : ''}</span>
        </div>
      </div>
      <section className="ms-sec ms-sec--tight">
        <div className="ms-sec__head"><h2 className="ms-h2-sm">{C.keepReading}</h2></div>
        <ul className="ms-grid3" style={{ listStyle: 'none', padding: 0 }}>
          {more.map(m => (
            <li key={m.slug}>
              <SiteLink href={`/notes/${m.slug}`} className="ms-acard">
                <div className="ms-acard__thumb" style={{ background: m.gradient }} />
                <div className="ms-acard__meta">{m.tagLabel} · {m.date}</div>
                <h3>{m.title}</h3>
              </SiteLink>
            </li>
          ))}
        </ul>
      </section>
    </SiteLayout>
  )
}
