import { useState } from 'react'
import { BookMarked, Target, Terminal } from 'lucide-react'
import { LiveOrb } from '../../components/LiveOrb'
import { api } from '../../lib/api'
import type { ComingUp as ComingUpModel, Replays, Setup, Since, SinceItem, StoriesCard as StoriesModel, TodayAction, TodayLink, TodayModel } from './types'

export type Run = (action: TodayAction) => void

const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString(undefined, o)
const isoToDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
const isoToday = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}` }

function LinkBtn({ link, run, className = '' }: { link: TodayLink; run: Run; className?: string }) {
  return <button type="button" className={`today-link ${className}`} onClick={() => run(link.action)}>{link.label}</button>
}

/** A loading card: same footprint as the section, one muted line. */
export function Skeleton({ id, title, line, nested = false }: { id: string; title: string; line: string; nested?: boolean }) {
  const H = nested ? 'h3' : 'h2'
  const body = (<><H id={id} className="today-h">{title}</H><p className="today-muted">{line}</p></>)
  return nested
    ? <div role="group" className="ml-glass today-card today-skel" aria-labelledby={id} aria-busy="true">{body}</div>
    : <section className="ml-glass today-card today-skel" aria-labelledby={id} aria-busy="true">{body}</section>
}

/** One quiet line inside the section; the rest of Today keeps working. */
export function SectionError({ id, title, what, nested = false }: { id: string; title: string; what: string; nested?: boolean }) {
  const H = nested ? 'h3' : 'h2'
  const body = (<><H id={id} className="today-h">{title}</H><p className="today-muted" role="status">Couldn’t load {what} just now. The rest of Today still works.</p></>)
  return nested
    ? <div role="group" className="ml-glass today-card" aria-labelledby={id}>{body}</div>
    : <section className="ml-glass today-card" aria-labelledby={id}>{body}</section>
}

export function Header({ model, now }: { model: TodayModel; now: Date }) {
  return (
    <header className="today-head">
      <p className="ml-eyebrow">Today · {fmt(now, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1>{model.greeting}</h1>
      <p className="today-status">{model.status}</p>
    </header>
  )
}

export function HeroLoading() {
  return (
    <section className="ml-glass today-hero today-skel" aria-labelledby="today-hero-h" aria-busy="true">
      <p className="today-kicker"><span className="today-dot" aria-hidden="true" />Your next step</p>
      <h2 id="today-hero-h" className="is-loading">Choosing your next step…</h2>
    </section>
  )
}

/** The only filled button on the page is the primary one here. */
export function Hero({ model, busy, run }: { model: TodayModel; busy: boolean; run: Run }) {
  const h = model.hero
  return (
    <section className="ml-glass today-hero" aria-labelledby="today-hero-h">
      <p className="today-kicker"><span className="today-dot" aria-hidden="true" />Your next step · {h.kindLabel} · about {h.minutes} {h.minutes === 1 ? 'minute' : 'minutes'}</p>
      <div className="ml-orb today-orb" aria-hidden="true"><LiveOrb compact state="idle" /></div>
      <h2 id="today-hero-h">{h.title}</h2>
      <p className="today-why">{h.why}</p>
      <div className="today-go">
        {/* busy only ignores a second press (App guards it too); the button is never disabled */}
        <button type="button" className="ml-btn" aria-busy={busy || undefined} onClick={() => { if (!busy) run(h.primary.action) }}>{h.primary.label}</button>
        {h.secondary && <button type="button" className="ml-btn ml-btn--quiet" onClick={() => run(h.secondary!.action)}>{h.secondary.label}</button>}
      </div>
      {model.alternates.length > 0 && (
        <p className="today-also"><span>Or instead:</span>{model.alternates.map(a => <LinkBtn key={a.label} link={a} run={run} />)}</p>
      )}
    </section>
  )
}

function Chips({ label, names, kind }: { label: string; names: string[]; kind: 'cov' | 'part' | 'gap' }) {
  if (!names.length) return null
  return (
    <li className="today-cover">
      <span className="today-cover-lab"><i className={`today-k today-k--${kind}`} aria-hidden="true" />{label}</span>
      <ul className="today-chips">{names.map(n => <li key={n} className={`today-chip${kind === 'gap' ? ' is-gap' : ''}`}>{n}</li>)}</ul>
    </li>
  )
}

function DateEditor({ c, onSaved, onCancel }: { c: ComingUpModel; onSaved: () => void; onCancel: () => void }) {
  const [value, setValue] = useState(c.interviewDate ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'failed'>('idle')
  const save = async () => {
    if (!value || state === 'saving') return
    setState('saving')
    try { await api.updateTarget(c.targetId, value); onSaved() } catch { setState('failed') }
  }
  return (
    <form className="today-date" onSubmit={e => { e.preventDefault(); void save() }}>
      <label htmlFor="today-date-input">Interview date</label>
      <input id="today-date-input" type="date" min={isoToday()} value={value} onChange={e => setValue(e.target.value)} />
      <div className="today-date-go">
        <button type="submit" className="ml-btn ml-btn--quiet ml-btn--sm">Save the date</button>
        <button type="button" className="today-link" onClick={onCancel}>Cancel</button>
      </div>
      {state === 'failed' && <p className="today-muted" role="status">Couldn’t save the date just now. Try again in a moment.</p>}
    </form>
  )
}

export function ComingUp({ c, busy, run, onChanged }: { c: ComingUpModel; busy: boolean; run: Run; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const date = c.interviewDate ? fmt(isoToDate(c.interviewDate), { weekday: 'long', day: 'numeric', month: 'long' }) : null
  return (
    <section className="ml-glass today-card" aria-labelledby="today-up-h">
      <div className="today-up-head">
        <div>
          <h2 id="today-up-h" className="today-h">Coming up</h2>
          <p className="today-big">{c.role} at {c.company}</p>
          {c.readOn && <p className="today-muted">From the job description Scout read on {fmt(new Date(c.readOn), { day: 'numeric', month: 'long' })}.</p>}
        </div>
        <div className="today-when">
          {c.countdown ? <p className="today-big">{c.countdown[0].toUpperCase() + c.countdown.slice(1)}</p> : <p className="today-big">No date yet</p>}
          {date && <p className="today-muted">{date}</p>}
          {!editing && <button type="button" className="today-link" onClick={() => setEditing(true)}>{c.interviewDate ? 'Change date' : 'Add the date'}</button>}
        </div>
      </div>
      {editing && <DateEditor c={c} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged() }} />}
      {c.hasResume === false ? (
        <p className="today-muted">Add your résumé to see which of these skills it backs. <button type="button" className="today-link" onClick={() => run({ type: 'openTarget', targetId: c.targetId })}>Open {c.company}</button></p>
      ) : (
        <ul className="today-covers">
          <Chips label="Your résumé backs" names={c.covered} kind="cov" />
          <Chips label="Partly" names={c.partial} kind="part" />
          <Chips label="Not shown yet" names={c.gap} kind="gap" />
        </ul>
      )}
      <div className="today-actions">
        {c.topGap && <button type="button" className="today-link" aria-busy={busy || undefined} onClick={() => { if (!busy) run({ type: 'startQuestion', question: c.topGap!.question, speak: true }) }}>Practise the {c.topGap.skill} question</button>}
        <button type="button" className="today-link" onClick={() => run({ type: 'openTarget', targetId: c.targetId })}>Open the full match</button>
      </div>
    </section>
  )
}

function SinceList({ title, items, run, tone }: { title: string; items: SinceItem[]; run: Run; tone: 'up' | 'again' }) {
  if (!items.length) return null
  return (
    <div>
      <h3 className={`today-col-h today-col-h--${tone}`}>{title}</h3>
      <ul className="today-list">
        {items.map(i => (
          <li key={i.headline}>
            <span>{i.headline}</span>
            <span className="today-muted">{i.detail}</span>
            {i.link && <LinkBtn link={i.link} run={run} />}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SinceLastWeek({ s, run }: { s: Since; run: Run }) {
  return (
    <section className="ml-glass today-card" aria-labelledby="today-since-h">
      <h2 id="today-since-h" className="today-h">Since last week</h2>
      <div className="today-cols">
        <SinceList title="Getting stronger" items={s.stronger} run={run} tone="up" />
        <SinceList title="Worth another look" items={s.another} run={run} tone="again" />
      </div>
    </section>
  )
}

export function ReplaysCard({ r, run }: { r: Replays; run: Run }) {
  const first = r.due[0]
  return (
    <div role="group" className="ml-glass today-card" aria-labelledby="today-rep-h">
      <h3 id="today-rep-h" className="today-h">Replays</h3>
      {(r.due.length > 0 || r.upcoming.length > 0) && (
        <ul className="today-list">
          {[...r.due, ...r.upcoming].map(x => <li key={x.itemId}><span>{x.title}</span><span className="today-muted">{x.label}</span></li>)}
        </ul>
      )}
      {r.nothingDueLine && <p className="today-muted">{r.nothingDueLine}</p>}
      {r.compressedLine && <p className="today-muted">{r.compressedLine}</p>}
      {first && <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={() => run({ type: 'openReplays', itemId: first.itemId })}>Start today’s replays</button>}
    </div>
  )
}

export function StoriesCard({ s, run }: { s: StoriesModel; run: Run }) {
  return (
    <div role="group" className="ml-glass today-card" aria-labelledby="today-stories-h">
      <h3 id="today-stories-h" className="today-h">Your stories</h3>
      {s.have.length > 0 && (
        <div className="today-stack-sm">
          <p className="today-muted">You have stories for</p>
          <ul className="today-chips">{s.have.map(t => <li key={t.id} className="today-chip is-has">{t.label}</li>)}</ul>
        </div>
      )}
      {s.missing.length > 0 && (
        <div className="today-stack-sm">
          <p className="today-muted">No story yet for</p>
          <ul className="today-chips">{s.missing.map(t => <li key={t.id} className="today-chip is-gap">{t.label}</li>)}</ul>
        </div>
      )}
      <p className="today-sentence">{s.sentence}</p>
      {s.suggest && <button type="button" className="today-link" onClick={() => run({ type: 'addStory', theme: s.suggest!.id })}>Add a {s.suggest.label} story</button>}
    </div>
  )
}

const SETUP_ICONS = { target: Target, story: BookMarked, sql: Terminal }
export function SetupCard({ s, run }: { s: Setup; run: Run }) {
  return (
    <section className="ml-glass today-card today-setup" aria-labelledby="today-setup-h">
      <h2 id="today-setup-h" className="today-big">{s.heading}</h2>
      <ul>
        {s.rows.map(r => {
          const Icon = SETUP_ICONS[r.id]
          return (
            <li key={r.id}>
              <span className="today-ic" aria-hidden="true"><Icon size={16} /></span>
              <div><b>{r.title}</b><p className="today-muted">{r.body}</p></div>
              <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={() => run(r.button.action)}>{r.button.label}</button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function Footer() {
  return <p className="today-footer">Your practice is private to your account. Nothing here is a score.</p>
}
