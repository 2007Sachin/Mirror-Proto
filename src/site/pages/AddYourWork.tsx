import SiteLayout from '../SiteLayout'
import { SiteLink } from '../router'
import { FilterList, type FilterItem } from '../ui'
import { ADD_PAGE as C, SOURCES } from '../copy/add-your-work'
import './AddYourWork.css'

const items: FilterItem[] = SOURCES.map(s => ({
  id: s.slug, tags: [s.tag], text: `${s.name} ${s.blurb} ${s.tagLabel}`,
  node: (
    <SiteLink href={`/add-your-work/${s.slug}`} className="ms-ccard">
      <span className="ms-ccard__logo" style={{ background: s.color }} aria-hidden="true">{s.logo}</span>
      <h4>{s.name}</h4><p>{s.blurb}</p><span className="ms-badge-soft">{s.tagLabel}</span>
    </SiteLink>
  ),
}))

export default function AddYourWork() {
  return (
    <SiteLayout title={C.title}>
      <section className="ms-phero">
        <div className="ms-phero__eyebrow"><i />{C.eyebrow}</div>
        <h1 className="ms-h1">{C.h1[0]}<br />{C.h1[1]}</h1>
        <p className="ms-phero__sub">{C.sub}</p>
      </section>
      <section className="ms-sec ms-sec--tight" style={{ maxWidth: 'var(--ms-container)', margin: '0 auto' }}>
        <FilterList items={items} filters={[...C.filters]} searchLabel={C.searchLabel} searchPlaceholder={C.searchPlaceholder}
          emptyText={C.empty} shownLabel={C.shown} listClassName="ms-aw-list" />
      </section>
    </SiteLayout>
  )
}
