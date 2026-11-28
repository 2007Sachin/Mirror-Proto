import SiteLayout from '../SiteLayout'
import { Reveal } from '../ui'
import { KIND_WORDS, QUOTES } from '../copy/kind-words'
import './KindWords.css'

export default function KindWords() {
  return (
    <SiteLayout title={KIND_WORDS.title} navTheme="dark">
      <section className="ms-dark-hero ms-kw-hero">
        <div className="ms-phero__eyebrow" style={{ color: '#fff' }}><i />{KIND_WORDS.eyebrow}</div>
        <h1 className="ms-h1">{KIND_WORDS.h1[0]}<br />{KIND_WORDS.h1[1]}</h1>
        <p className="ms-phero__sub">{KIND_WORDS.sub}</p>
      </section>
      <section className="ms-dark-band ms-kw-band" aria-label={KIND_WORDS.wallLabel}>
        <div className="ms-wall">
          {QUOTES.map(q => (
            <Reveal key={q.name} className="ms-wcard">
              <div className="ms-wcard__who"><span className="ms-avatar" /><div><b>{q.name}</b>{KIND_WORDS.who}</div></div>
              &ldquo;{q.text}&rdquo;
              <span className="ms-kw-sample">{KIND_WORDS.sampleLabel}</span>
            </Reveal>
          ))}
        </div>
      </section>
    </SiteLayout>
  )
}
