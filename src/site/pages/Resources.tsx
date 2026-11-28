import SiteLayout from '../SiteLayout'
import { FilterList, type FilterItem } from '../ui'
import { RESOURCES, RESOURCES_PAGE as C } from '../copy/resources'
import './Resources.css'

// TODO(placeholder): the cards are sample listings (no file behind them yet), so they are not links.
const items: FilterItem[] = RESOURCES.map(r => ({
  id: r.id, tags: [r.kind], text: `${r.title} ${r.kindLabel}`,
  node: (
    <article className="ms-acard">
      <div className="ms-acard__thumb" style={{ background: r.gradient }} />
      <div className="ms-acard__meta">{r.kindLabel} · {C.sampleLabel}</div>
      <h3>{r.title}</h3>
      <p className="ms-fine">{C.soon}</p>
    </article>
  ),
}))

export default function Resources() {
  return (
    <SiteLayout title={C.title}>
      <section className="ms-phero ms-phero--left" style={{ maxWidth: 'var(--ms-container)', margin: '0 auto', paddingBottom: 32 }}>
        <h1 className="ms-h1--md">{C.h1}</h1>
        <p className="ms-phero__sub">{C.sub}</p>
      </section>
      <section className="ms-rs-wrap">
        <FilterList items={items} filters={[...C.filters]} searchLabel={C.searchLabel} searchPlaceholder={C.searchPlaceholder}
          emptyText={C.empty} shownLabel={C.shown} listClassName="ms-rs-list" />
      </section>
    </SiteLayout>
  )
}
