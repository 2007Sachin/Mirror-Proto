import SiteLayout from '../SiteLayout'
import { SiteLink } from '../router'
import { FilterList, type FilterItem } from '../ui'
import { FEATURED, NOTES, NOTES_PAGE as C } from '../copy/notes'
import './Notes.css'

const items: FilterItem[] = NOTES.filter(n => n !== FEATURED).map(n => ({
  id: n.slug, tags: [n.tag], text: `${n.title} ${n.summary} ${n.tagLabel}`,
  node: (
    <SiteLink href={`/notes/${n.slug}`} className="ms-acard">
      <div className="ms-acard__thumb" style={{ background: n.gradient }} />
      <div className="ms-acard__meta">{n.tagLabel} · {n.date} · <span className="ms-nt-sample">{C.sampleLabel}</span></div>
      <h3>{n.title}</h3>
    </SiteLink>
  ),
}))

export default function Notes() {
  const f = FEATURED
  return (
    <SiteLayout title={C.title}>
      <section className="ms-phero ms-phero--left" style={{ maxWidth: 'var(--ms-container)', margin: '0 auto', paddingBottom: 32 }}>
        <h1 className="ms-h1--md">{C.h1}</h1>
        <p className="ms-phero__sub" style={{ marginBottom: 0 }}>{C.sub}</p>
      </section>
      <section className="ms-sec ms-sec--tight">
        <SiteLink href={`/notes/${f.slug}`} className="ms-feature-post ms-nt-feature">
          <div className="ms-acard__thumb" style={{ background: f.gradient }} />
          <div>
            <div className="ms-acard__meta">{f.tagLabel} · {f.date} · {f.mins} min read · <span className="ms-nt-sample">{C.sampleLabel}</span></div>
            <h2>{f.title}</h2>
            <p className="ms-mock__muted">{f.summary}</p>
            <span className="ms-link">{C.read}</span>
          </div>
        </SiteLink>
        <div className="ms-nt-body">
          <FilterList items={items} filters={[...C.filters]} searchLabel={C.searchLabel} searchPlaceholder={C.searchPlaceholder}
            emptyText={C.empty} shownLabel={C.shown} listClassName="ms-nt-list" />
        </div>
      </section>
    </SiteLayout>
  )
}
