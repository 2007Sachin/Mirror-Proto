import { useMemo, useState } from 'react'
import SiteLayout from '../SiteLayout'
import { GLOSSARY_PAGE as C, TERMS } from '../copy/glossary'
import './Glossary.css'

const letterOf = (t: string) => t.charAt(0).toUpperCase()

export default function Glossary() {
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const groups = useMemo(() => {
    const shown = TERMS.filter(t => !term || `${t.term} ${t.def}`.toLowerCase().includes(term))
      .sort((a, b) => a.term.localeCompare(b.term))
    const map = new Map<string, typeof TERMS>()
    for (const t of shown) map.set(letterOf(t.term), [...(map.get(letterOf(t.term)) ?? []), t])
    return { shown: shown.length, list: [...map.entries()] }
  }, [term])
  return (
    <SiteLayout title={C.title}>
      <section className="ms-phero ms-phero--left" style={{ maxWidth: 'var(--ms-container)', margin: '0 auto', paddingBottom: 24 }}>
        <h1 className="ms-h1--md">{C.h1}</h1>
        <p className="ms-phero__sub">{C.sub}</p>
      </section>
      <section className="ms-wrap gl-wrap">
        <nav className="ms-az" aria-label={C.azLabel}>
          {groups.list.map(([l]) => <a key={l} href={`#g-${l}`}>{l}</a>)}
          <label className="ms-search">
            <span className="ms-sr">{C.searchLabel}</span>
            <input type="search" value={q} placeholder={C.searchPlaceholder} onChange={e => setQ(e.target.value)} />
          </label>
        </nav>
        <p className="ms-sr" role="status">{groups.shown} {C.shown}</p>
        {groups.list.length === 0 && <p className="ms-fine">{C.empty}</p>}
        {groups.list.map(([l, ts]) => (
          <div className="ms-gloss" key={l}>
            <h2 id={`g-${l}`}>{l}</h2>
            <dl className="ms-terms">
              {ts.map(t => <div className="ms-term" key={t.term}><dt><h3>{t.term}</h3></dt><dd><p>{t.def}</p></dd></div>)}
            </dl>
          </div>
        ))}
      </section>
    </SiteLayout>
  )
}
