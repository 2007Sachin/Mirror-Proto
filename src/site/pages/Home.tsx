import { useRef, type CSSProperties, type ReactNode } from 'react'
import SiteLayout from '../SiteLayout'
import { useSite } from '../SiteContext'
import { MeshGradient } from '../MeshGradient'
import { SiteLink } from '../router'
import { Button, Card, Container, Eyebrow, Faq, Marquee, Reveal, Section, Tabs } from '../ui'
import { CLAIMS } from '../../pages/landing/content'
import {
  BENTO, FAQ, FIRST, GROW, HERO, PILLARS, PRACTICE, PRIVACY, REFLECT, SAMPLE_LABEL, SECTIONS, STORIES, VOICE, WORK,
} from '../copy/home'
import { HeroScene, SideNav } from './HomeParts'
import './home.css'

const tok = (name: string) => `var(--ms-${name.slice(2)})`
const dotStyle = (name: string) => ({ ['--ms-d' as string]: tok(name) }) as CSSProperties
const lines = (l: string[]) => l.map((t, i) => <span key={i}>{i > 0 && <br />}{t}</span>)
const Sample = ({ className }: { className?: string }) => <span className={`ms-badge-soft ${className ?? ''}`}>{SAMPLE_LABEL}</span>

/** Small 24px line icon with a pair of "eyes" that glance on hover (tab icons). */
const Ico = ({ d, eyes }: { d: string; eyes: [number, number][] }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    {eyes.map(([x, y]) => <circle key={x} className="ms-eye" cx={x} cy={y} r="1" fill="currentColor" />)}
  </svg>
)
const ICONS = [
  <Ico key="v" d="M4 4h16v16H4z" eyes={[[9.5, 10.5], [14.5, 10.5]]} />,
  <Ico key="q" d="M5 5h14v10h-6l-4 4v-4H5z" eyes={[[9.5, 9.7], [14.5, 9.7]]} />,
  <Ico key="g" d="M12 3 4 20h16z" eyes={[[10.3, 13.5], [13.7, 13.5]]} />,
  <Ico key="l" d="M4 8l8-4 8 4v9l-8 4-8-4z" eyes={[[9.7, 11.5], [14.3, 11.5]]} />,
  <Ico key="s" d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" eyes={[[9.5, 10.5], [14.5, 10.5]]} />,
]

function Rows({ children }: { children: ReactNode }) { return <ul className="ms-rows">{children}</ul> }

function VoicePanels() {
  const v = VOICE
  const panels: ReactNode[] = [
    <div key="0" className="ms-mock ms-mock--chat">
      <div className="ms-mock__head"><span>{v.chat.head}</span><span className="ms-mock__muted">{v.chat.muted}</span></div>
      <div className="ms-chat">
        <div className="ms-bubble ms-bubble--mirror">{v.chat.mirror1}</div>
        <div className="ms-bubble ms-bubble--you">{v.chat.you}</div>
        <div className="ms-bubble ms-bubble--mirror">{v.chat.mirror2}</div>
        <div className="ms-wave" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
      </div>
    </div>,
    <>
      <div className="ms-mock">
        <div className="ms-mock__head"><span>{v.deeper.head}</span><span className="ms-mock__muted">{v.deeper.muted}</span></div>
        <Rows>{v.deeper.rows.map(([t, s, c, busy]) => (
          <li key={t}><span className="ms-dot" style={dotStyle(c)} />{t}<em className={busy ? 'ms-busy' : undefined}>{s}</em></li>
        ))}</Rows>
      </div>
      <div className="ms-toast">{v.deeper.toast[0]}<b>{v.deeper.toast[1]}</b>{v.deeper.toast[2]}</div>
    </>,
    <div key="2" className="ms-mock">
      <div className="ms-mock__head"><span>{v.guide.head}</span><span className="ms-mock__muted">{v.guide.muted}</span></div>
      <Rows>{v.guide.rows.map(([k, label, t]) => <li key={t}><span className={`ms-pill ms-pill--${k}`}>{label}</span>{t}</li>)}</Rows>
    </div>,
    <div key="3" className="ms-mock ms-mock--grid">
      <div className="ms-mock__head"><span>{v.library.head}</span><span className="ms-mock__muted">{v.library.muted}</span></div>
      <div className="ms-tiles">
        {v.library.tiles.map(t => <div key={t} className="ms-tile">{t}</div>)}
        <div className="ms-tile ms-tile--add">{v.library.add}</div>
      </div>
    </div>,
    <div key="4" className="ms-mock ms-mock--summary">
      <div className="ms-mock__head"><span>{v.summary.head}</span><span className="ms-mock__muted">{v.summary.muted}</span></div>
      <p>{v.summary.p1}</p>
      <p className="ms-mock__muted">{v.summary.p2}</p>
      <Button size="md" tabIndex={-1}>{v.summary.button}</Button>
    </div>,
  ]
  return panels
}

export default function Home() {
  const { onTry } = useSite()
  const wrapRef = useRef<HTMLDivElement>(null)
  const panels = VoicePanels()
  const items = VOICE.tabs.map((t, i) => ({
    ...t, icon: ICONS[i],
    panel: <>{panels[i]}<p className="ms-home-pane-note">{VOICE.sampleNote}</p></>,
  }))
  const faq = [
    ...FAQ.items,
    ...FAQ.privacyItems.map(p => ({ q: p.q, a: CLAIMS[p.claim] as string })),
  ]

  return (
    <SiteLayout title="Practice your story out loud">
      {/* HERO */}
      <Section bare className="ms-hero" aria-labelledby="home-h1">
        <div className="ms-hero__glow" aria-hidden="true"><div className="ms-hero__rays" /><div className="ms-hero__blob ms-hero__blob--a" /><div className="ms-hero__blob ms-hero__blob--b" /></div>
        <Container className="ms-hero__inner">
          <Reveal><h1 id="home-h1" className="ms-h1">{lines(HERO.title)}</h1></Reveal>
          <Reveal><p className="ms-hero__sub">{lines(HERO.sub)}</p></Reveal>
          <Reveal className="ms-hero__cta"><Button onClick={onTry}>{HERO.cta}</Button></Reveal>
          <Reveal><HeroScene /></Reveal>
        </Container>
      </Section>

      {/* STORIES (sample content) */}
      <Section id="stories" noTop aria-labelledby="home-stories">
        <div className="ms-row-head">
          <h2 id="home-stories" className="ms-h2-sm">{lines(STORIES.title)}</h2>
          <Button variant="secondary" size="md" href={STORIES.href}>{STORIES.cta}</Button>
        </div>
        {/* TODO(placeholder): real quotes, names, photo and numbers (shared with permission) */}
        <div className="ms-bento-quotes">
          <Reveal as="article" className="ms-q ms-q--portrait">
            <Sample /><div className="ms-q__photo" aria-hidden="true" />
            <div className="ms-q__who">{STORIES.portrait.who}</div><p className="ms-q__text">{STORIES.portrait.text}</p>
          </Reveal>
          <Reveal as="article" className="ms-q ms-q--pink"><b>{STORIES.pink.big}</b><span>{STORIES.pink.small}</span><Sample /></Reveal>
          <Reveal as="article" className="ms-q ms-q--green"><b>{STORIES.green.big}</b><span>{STORIES.green.small}</span><Sample /></Reveal>
          <Reveal as="article" className="ms-q ms-q--wide">
            <Sample /><p className="ms-q__big">{STORIES.wide.text}</p><div className="ms-q__who">{STORIES.wide.who}</div>
          </Reveal>
        </div>
        {/* TODO(placeholder): invented partner wordmarks */}
        <Reveal className="ms-logo-grid">
          <span className="ms-sr">{SAMPLE_LABEL}: {STORIES.logosLabel}</span>
          {STORIES.logos.map(l => <span key={l} aria-hidden="true">{l}</span>)}
        </Reveal>
        <p className="ms-home-sample-note">{SAMPLE_LABEL}: {STORIES.logosLabel}</p>
      </Section>

      {/* PILLARS OVERVIEW */}
      <Section id="how" aria-labelledby="home-how">
        <h2 id="home-how" className="ms-h2-sm ms-center">{lines(PILLARS.title)}</h2>
        <div className="ms-pillars">
          {PILLARS.items.map(p => (
            <Reveal key={p.id} className="ms-pillar-wrap">
              <a className="ms-pillar" href={`#${p.id}`}>
                <div className="ms-pillar__art" aria-hidden="true"><MeshGradient colors={p.colors} /></div>
                <h3>{p.name}</h3><p>{p.text}</p>
              </a>
            </Reveal>
          ))}
        </div>
      </Section>

      <div className="ms-pillars-wrapper" ref={wrapRef}>
        <SideNav wrapRef={wrapRef} />

        {/* MIRROR VOICE: the tabs block */}
        <Section id="mirror" top84 aria-labelledby="home-voice">
          <div className="ms-split-head">
            <div>
              <Eyebrow>{VOICE.eyebrow}</Eyebrow>
              <h2 id="home-voice" className="ms-h2">{VOICE.title[0]}<br />{VOICE.title[1]}<span className="ms-grad-text">{VOICE.titleAccent}</span></h2>
            </div>
            <p className="ms-split-head__p">{VOICE.text}</p>
          </div>
          {/* TODO(placeholder): the panels hold illustrative sample data, labelled "Sample conversation" inside each panel */}
          <Tabs items={items} label={VOICE.tabsLabel} dwellMs={10000} ctaHref={VOICE.ctaHref} ctaDefault={VOICE.tabs[0].cta}
            gradient={{ colors: ['#79e7dc', '#ffe4ff', '#c8c4ea'] }} />

          <div className="ms-bento2">
            <div className="ms-col">
              <Reveal as="article" className="ms-card">
                <h3 className="ms-h3">{lines(BENTO.listens.title)}</h3>
                <div className="ms-card__marquee">
                  <Marquee variant="chips" label={BENTO.listens.title.join(' ')} items={BENTO.listens.chips.map((c, i) => <><i style={dotStyle(BENTO.listens.dots[i])} />{c}</>)} />
                  <div className="ms-buddy" aria-hidden="true"><div className="ms-buddy__blob ms-buddy__blob--a" /><div className="ms-buddy__blob ms-buddy__blob--b" /><div className="ms-buddy__face"><i /><i /></div></div>
                </div>
              </Reveal>
              <Reveal as="article" className="ms-card ms-card--tall">
                <h3 className="ms-h3">{lines(BENTO.pace.title)}</h3>
                <div className="ms-pace"><div className="ms-pace__ring" aria-hidden="true" /><span>{BENTO.pace.note}</span></div>
              </Reveal>
            </div>
            <div className="ms-col">
              <Reveal as="article" className="ms-card ms-card--tall">
                <h3 className="ms-h3">{lines(BENTO.through.title)}</h3>
                {/* TODO(placeholder): sample rows */}
                <div className="ms-mini-table">
                  <div className="ms-mini-table__filter">{BENTO.through.filter}</div>
                  {BENTO.through.rows.map(([a, b]) => <div key={a} className="ms-mt-row"><b>{a}</b><span className="ms-tag">{b}</span></div>)}
                </div>
              </Reveal>
              <Reveal as="article" className="ms-card">
                <h3 className="ms-h3">{lines(BENTO.roles.title)}</h3>
                <div className="ms-hub-c"><span className="ms-hub__icon" aria-hidden="true">{ICONS[2]}</span></div>
                <Marquee variant="chips" label={BENTO.roles.label} items={BENTO.roles.rowA} />
                <Marquee variant="chips" direction="right" label={BENTO.roles.label} items={BENTO.roles.rowB} />
              </Reveal>
            </div>
          </div>
        </Section>

        {/* PRACTICE / REFLECTION / GROWTH */}
        {SECTIONS.map((s, n) => (
          <Section key={s.id} id={s.id} top84 aria-labelledby={`home-${s.id}`}>
            <div className="ms-split-head">
              <div><Eyebrow>{s.eyebrow}</Eyebrow><h2 id={`home-${s.id}`} className="ms-h2">{lines(s.title)}</h2></div>
              <Reveal className="ms-stats">{s.stats.map(([b, t]) => <div key={b}><b>{b}</b><span>{t}</span></div>)}</Reveal>
            </div>
            <Reveal className="ms-pillar-card">
              <MeshGradient colors={s.colors} />
              {/* TODO(placeholder): sample mock data */}
              <Sample className="ms-home-sample" />
              {n === 0 && (
                <div className="ms-mock ms-mock--wide">
                  <div className="ms-mock__head"><span>{PRACTICE.head}</span><span className="ms-mock__muted">{PRACTICE.muted}</span></div>
                  <Rows>{PRACTICE.rows.map(([t, c]) => <li key={t}><span className="ms-dot" style={dotStyle(c)} />{t}<em>{PRACTICE.ready}</em></li>)}</Rows>
                </div>
              )}
              {n === 1 && (
                <div className="ms-mock ms-mock--wide">
                  <div className="ms-mock__head"><span>{REFLECT.head}</span><span className="ms-mock__muted">{REFLECT.muted}</span></div>
                  <Rows>{REFLECT.rows.map(([k, l, t]) => <li key={t}><span className={`ms-pill ms-pill--${k}`}>{l}</span>{t}</li>)}</Rows>
                </div>
              )}
              {n === 2 && (
                <div className="ms-mock ms-mock--wide">
                  <div className="ms-mock__head"><span>{GROW.head}</span><span className="ms-mock__muted">{GROW.muted}</span></div>
                  <div className="ms-bars" role="img" aria-label={GROW.barsLabel}>{GROW.bars.map(h => <i key={h} style={{ ['--ms-h' as string]: `${h}%` }} />)}</div>
                </div>
              )}
            </Reveal>
            {n === 0 && (
              <div className="ms-sub-cards">
                {PRACTICE.sub.map(c => (
                  <Card key={c.title} as="article" className="ms-card--row">
                    <div><h3>{c.title}</h3><p>{c.text}</p>
                      <SiteLink href={c.href} className="ms-link">{PRACTICE.learn}
                        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></SiteLink></div>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        ))}
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

      {/* WORK + FIRST SESSION */}
      <Section aria-label={WORK.title}>
        <div className="ms-two-up">
          <Reveal as="article" className="ms-card ms-card--feature">
            <Eyebrow>{WORK.eyebrow}</Eyebrow><h2 className="ms-h3-left">{WORK.title}</h2><p>{WORK.text}</p>
            <Button size="md" href={WORK.href}>{WORK.cta}</Button>
            {/* TODO(placeholder): decorative tool initials */}
            <div className="ms-home-stack" style={{ marginTop: 28 }}>
              <Marquee variant="icons" direction="right" label={WORK.iconsLabel} items={WORK.iconsA} />
              <Marquee variant="icons" label={WORK.iconsLabel} items={WORK.iconsB} />
            </div>
          </Reveal>
          <Reveal as="article" className="ms-card ms-card--feature ms-card--video">
            <Eyebrow light>{FIRST.eyebrow}</Eyebrow><h2 className="ms-h3-left ms-h3--light">{FIRST.title}</h2><p className="ms-light-60">{FIRST.text}</p>
            <Button variant="light" size="md" href={FIRST.href}>{FIRST.cta}</Button>
            {/* TODO(placeholder): no walkthrough video yet */}
            <div className="ms-video-ph"><span aria-hidden="true">▶</span><small>{SAMPLE_LABEL}: {FIRST.videoNote}</small></div>
          </Reveal>
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
