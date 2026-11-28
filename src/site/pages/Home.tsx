import { useRef, type ReactNode } from 'react'
import SiteLayout from '../SiteLayout'
import { useSite } from '../SiteContext'
import { MeshGradient } from '../MeshGradient'
import { Button, Container, Eyebrow, Faq, Reveal, Section } from '../ui'
import { CLAIMS } from '../../pages/landing/content'
import { FAQ, HERO, PILLARS, PRIVACY, SECTIONS } from '../copy/home'
import { EvaluationPanel, PillarArt, PrepPanel, RoomScene, RoomSteps, SideNav, StoriesPanel } from './HomeParts'
import './home.css'

const lines = (l: string[]) => l.map((t, i) => <span key={i}>{i > 0 && <br />}{t}</span>)

/** The real app piece shown in each feature section. */
const PANELS: Record<string, () => ReactNode> = { prep: PrepPanel, room: RoomSteps, evaluation: EvaluationPanel, stories: StoriesPanel }

export default function Home() {
  const { onTry } = useSite()
  const wrapRef = useRef<HTMLDivElement>(null)
  const faq = [
    ...FAQ.items,
    ...FAQ.privacyItems.map(p => ({ q: p.q, a: CLAIMS[p.claim] as string })),
  ]

  return (
    <SiteLayout title="Practice the interview before the interview">
      {/* HERO: the interview room itself */}
      <Section bare className="ms-hero" aria-labelledby="home-h1">
        <div className="ms-hero__glow" aria-hidden="true"><div className="ms-hero__rays" /><div className="ms-hero__blob ms-hero__blob--a" /><div className="ms-hero__blob ms-hero__blob--b" /></div>
        <Container className="ms-hero__inner">
          <Reveal><h1 id="home-h1" className="ms-h1">{lines(HERO.title)}</h1></Reveal>
          <Reveal><p className="ms-hero__sub">{lines(HERO.sub)}</p></Reveal>
          <Reveal className="ms-hero__cta"><Button onClick={onTry}>{HERO.cta}</Button></Reveal>
          <Reveal><RoomScene /></Reveal>
        </Container>
      </Section>

      {/* OVERVIEW: the four parts of the app */}
      <Section id="how" aria-labelledby="home-how">
        <h2 id="home-how" className="ms-h2-sm ms-center">{lines(PILLARS.title)}</h2>
        <div className="ms-pillars">
          {PILLARS.items.map(p => (
            <Reveal key={p.id} className="ms-pillar-wrap">
              <a className="ms-pillar" href={`#${p.id}`}>
                <div className="ms-pillar__art" aria-hidden="true"><MeshGradient colors={p.colors} /><div className="ms-pillar__ui"><PillarArt id={p.id} /></div></div>
                <h3>{p.name}</h3><p>{p.text}</p>
              </a>
            </Reveal>
          ))}
        </div>
      </Section>

      <div className="ms-pillars-wrapper" ref={wrapRef}>
        <SideNav wrapRef={wrapRef} />
        {SECTIONS.map(s => {
          const Panel = PANELS[s.id]
          return (
            <Section key={s.id} id={s.id} top84 aria-labelledby={`home-${s.id}`}>
              <div className="ms-split-head">
                <div><Eyebrow>{s.eyebrow}</Eyebrow><h2 id={`home-${s.id}`} className="ms-h2">{lines(s.title)}</h2></div>
                <p className="ms-split-head__p">{s.text}</p>
              </div>
              <Reveal className="ms-pillar-card ms-pillar-card--app">
                <MeshGradient colors={s.colors} />
                <Panel />
              </Reveal>
            </Section>
          )
        })}
      </div>

      {/* PRIVACY: bodies are the audited CLAIMS sentences, verbatim */}
      <Section id="privacy" tone="dark" aria-labelledby="home-privacy">
        <Eyebrow light>{PRIVACY.eyebrow}</Eyebrow>
        <h2 id="home-privacy" className="ms-h2 ms-h2--light">{PRIVACY.title}</h2>
        <div className="ms-dark-grid">
          <div className="ms-dk ms-dk--badge"><div className="ms-orbit"><span>{PRIVACY.badges[0]}</span></div></div>
          <div className="ms-dk ms-dk--wide"><h3>{PRIVACY.cards[0].h}</h3><p>{CLAIMS[PRIVACY.cards[0].claim]}</p></div>
          <div className="ms-dk ms-dk--badge"><div className="ms-orbit ms-orbit--slow"><span>{PRIVACY.badges[1]}</span></div></div>
          <div className="ms-dk ms-dk--wide"><h3>{PRIVACY.cards[1].h}</h3><p>{CLAIMS[PRIVACY.cards[1].claim]}</p></div>
          <div className="ms-dk ms-dk--wide"><h3>{PRIVACY.cards[2].h}</h3><p>{CLAIMS[PRIVACY.cards[2].claim]}</p></div>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" noTop aria-labelledby="home-faq">
        <div className="ms-home-faq">
          <h2 id="home-faq" className="ms-h2-sm">{FAQ.title}</h2>
          <Faq items={faq} />
        </div>
      </Section>
    </SiteLayout>
  )
}
