import SiteLayout from '../SiteLayout'
import { Button, Toc } from '../ui'
import SlugNotFound from './SlugNotFound'
import { LEGAL_DOCS, LEGAL_PAGE as C } from '../copy/legal'
import type { SitePageProps } from '../types'
import './Legal.css'

export default function Legal({ params }: SitePageProps) {
  const doc = Object.prototype.hasOwnProperty.call(LEGAL_DOCS, params.doc) ? LEGAL_DOCS[params.doc] : undefined
  if (!doc) return <SlugNotFound backHref="/" backLabel={C.notFoundBack} />
  return (
    <SiteLayout title={doc.title}>
      <section className="ms-phero ms-phero--left" style={{ maxWidth: 'var(--ms-container)', margin: '0 auto', paddingBottom: 40 }}>
        <p className="lg-banner" role="note">{C.banner}</p>
        <div className="ms-acard__meta">{C.updatedLabel} · {C.updated}</div>
        <h1 className="ms-h1--md">{doc.title}</h1>
        <p className="ms-phero__sub">{doc.sub}</p>
      </section>
      <div className="lg-band">
        <div className="ms-article" style={{ paddingTop: 40 }}>
          <Toc target="#legal-body" label={C.tocLabel} />
          <article className="ms-prose" id="legal-body">
            {doc.sections.map(s => <div key={s.h}><h2>{s.h}</h2><p>{s.p}</p></div>)}
          </article>
          <div />
        </div>
      </div>
      <section className="ms-sec" style={{ textAlign: 'center' }}>
        <h2 className="ms-h2-sm">{C.contactH}</h2>
        <p className="ms-mock__muted">{C.contactP}</p>
        <Button href={C.contactHref} size="md">{C.contactCta}</Button>
      </section>
    </SiteLayout>
  )
}
