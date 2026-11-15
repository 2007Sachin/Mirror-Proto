import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react'
import { levels, modules, type SqlModule } from './curriculum'
import { scenes } from './scenes'
import { buildQueue, freeSections, loadPlaced, loadTab, minutesLeft, mockPresetId, moduleProgress, noteAttempt, savePlaced, saveTab, solvedSet, summarize, TABS, unsolvedIds, type RunResult, type Tab } from './pathLogic'
import { findItem } from '../tracks'
import { conceptTopics } from './concepts/items'
import { mixedQueue, topicProgress, topicQueue } from './concepts/logic'
import Diagnostic from './plan/Check'
import { buildJourney } from './journey/journeyLogic'
import JourneyMap from './journey/JourneyMap'
import type { JourneyNode } from './journey/types'
import { problems } from './problems'
import { concepts } from './concepts/data'
import type { AttemptReport, DayStat, ItemStat, PracticeItem, TrackModule } from '../types'
import './path.css'

const MockTest = lazy(() => import('./mock/MockTest')) // keeps sql.js out until the learner opens Mock tests

type Mod = SqlModule
interface Run { queue: PracticeItem[]; idx: number; modId?: string; ret?: boolean; deadline?: number; res: Record<string, RunResult> }
type StartRun = (ids: string[], o?: { modId?: string; ret?: boolean; timeBox?: number }) => void

function Ring({ done, total }: { done: number; total: number }) {
  const r = 15, c = 2 * Math.PI * r
  return (
    <span className="sp-ring" aria-hidden="true">
      <svg viewBox="0 0 36 36" width="22" height="22">
        <circle cx="18" cy="18" r={r} className="sp-ring-bg" />
        <circle cx="18" cy="18" r={r} className="sp-ring-fg" strokeDasharray={`${total ? (done / total) * c : 0} ${c}`} transform="rotate(-90 18 18)" />
      </svg>
    </span>
  )
}

export default function Path({ mod, stats, days = [], loaded, onAttempt, renderDrill, onBack }: {
  mod: TrackModule
  stats: ItemStat[]
  days?: DayStat[]
  loaded: boolean
  onAttempt(r: AttemptReport): void
  renderDrill(item: PracticeItem, onAttempt: (r: AttemptReport) => void, onClose: () => void): ReactNode
  onBack(): void
}) {
  const [tab, setTab] = useState<Tab>(loadTab)
  const [openId, setOpenId] = useState<string | null>(null)
  const [run, setRun] = useState<Run | null>(null)
  const [ended, setEnded] = useState<{ ids: string[]; res: Record<string, RunResult> } | null>(null)
  const [now, setNow] = useState(Date.now)
  const [check, setCheck] = useState(false)
  const [placed, setPlaced] = useState(loadPlaced)
  const [preset, setPreset] = useState<string | undefined>()
  const [mockLive, setMockLive] = useState(false)
  const solved = useMemo(() => solvedSet(stats), [stats])
  const byId = useMemo(() => new Map(mod.items.map(i => [i.id, i])), [mod.items])
  const conceptItems = useMemo(() => mod.items.filter(i => (conceptTopics as readonly string[]).includes(i.topic)), [mod.items])
  const shown = modules as Mod[]
  const journey = useMemo(
    () => buildJourney({ modules: shown, problems, concepts, items: stats, days, todayISO: new Date().toISOString().slice(0, 10), placementDone: placed }),
    [shown, stats, days, placed],
  )

  useEffect(() => {
    if (!run?.deadline) return
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [run?.deadline])

  const pick = (t: Tab, p?: string) => { setTab(t); setPreset(p); setOpenId(null); setEnded(null); setCheck(false); saveTab(t) }
  const tabKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex(t => t.id === tab)
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null
    if (n === null) return
    e.preventDefault()
    const next = TABS[(n + TABS.length) % TABS.length].id
    pick(next)
    requestAnimationFrame(() => document.getElementById(`sp-tab-${next}`)?.focus())
  }

  const startRun: StartRun = (ids, o = {}) => {
    const queue = ids.map(id => byId.get(id)).filter((x): x is PracticeItem => !!x)
    if (!queue.length) return
    setEnded(null)
    setRun({ queue, idx: 0, modId: o.modId, ret: o.ret, deadline: o.timeBox ? Date.now() + o.timeBox * 60000 : undefined, res: {} })
  }
  const finish = (r: Run) => {
    if (!r.modId && !r.ret) setEnded({ ids: r.queue.map(i => i.id), res: r.res })
    setRun(null)
  }

  // ---- running a drill ----
  if (run) {
    const item = run.queue[run.idx]
    const last = run.idx >= run.queue.length - 1
    const res = run.res[item.id]
    const left = run.deadline ? minutesLeft(run.deadline, now) : null
    const next = () => (last ? finish(run) : setRun({ ...run, idx: run.idx + 1 }))
    return (
      <>
        <div className="sp-strip" role="status">
          <span className="sp-strip-t">Problem {run.idx + 1} of {run.queue.length}{left !== null && ` · ${left} min left`}</span>
          <span className="sp-strip-actions">
            {res?.solved && <button type="button" className="ml-btn ml-btn--sm" onClick={next}>{last ? 'Finish' : 'Next problem'}</button>}
            {!res?.solved && !last && <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={next}>Skip for now</button>}
            <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={() => finish(run)}>{run.modId ? 'Back to module' : run.ret ? 'Back to the journey' : 'End here'}</button>
          </span>
        </div>
        {renderDrill(item, r => { setRun(p => p && { ...p, res: noteAttempt(p.res, r.itemId, r.correct) }); onAttempt(r) }, () => finish(run))}
      </>
    )
  }

  const m = openId ? shown.find(x => x.id === openId) : undefined
  const onNode = (n: JourneyNode) => {
    if (n.kind === 'module' && n.moduleId) setOpenId(n.moduleId)
    else if (n.kind === 'concepts' && n.conceptTopic) startRun(topicQueue(conceptItems, n.conceptTopic, solved).map(i => i.id), { ret: true })
    else if (n.kind === 'boss' && n.mockPreset) pick('mock', mockPresetId(n.mockPreset))
    else if (n.kind === 'placement') setCheck(true)
  }

  return (
    <div className={`sp${mockLive && tab === 'mock' ? ' sp--exam' : ''}`}>
      <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm pr-back" onClick={m ? () => setOpenId(null) : check ? () => setCheck(false) : onBack}>{m ? 'Back' : check ? 'Back to the journey' : 'All tracks'}</button>

      <div className="sp-tabs" role="tablist" aria-label="SQL practice" onKeyDown={tabKey}>
        {TABS.map(t => (
          <button key={t.id} type="button" role="tab" id={`sp-tab-${t.id}`} aria-selected={tab === t.id} aria-controls="sp-panel" tabIndex={tab === t.id ? 0 : -1}
            className={tab === t.id ? 'is-on' : ''} onClick={() => pick(t.id)}>{t.title}</button>
        ))}
      </div>

      <div id="sp-panel" role="tabpanel" aria-labelledby={`sp-tab-${tab}`} className="sp-panel">
        {m ? <ModuleView m={m} solved={solved} loaded={loaded} startRun={startRun} />
          : tab === 'journey' ? (check ? (
            <Diagnostic
              titles={Object.fromEntries(shown.map(x => [x.id, x.title]))} order={shown.map(x => x.id)} onClose={() => setCheck(false)}
              onDone={() => { savePlaced(); setPlaced(true) }}
              onOpen={id => { setCheck(false); setOpenId(id) }}
            />
          ) : <JourneyMap state={journey} onOpenNode={onNode} onContinue={() => journey.current && onNode(journey.current)} />)
          : tab === 'mock' ? (
            <Suspense fallback={<p className="pr-note" role="status">Getting the mock test ready…</p>}>
              <MockTest problems={problems} concepts={concepts} solved={solved} onAttempt={onAttempt} openModule={setOpenId} onLive={setMockLive} onBack={() => pick('journey')} initialPreset={preset}
                moduleOf={id => { const x = shown.find(y => y.problemIds.includes(id)); return x && { id: x.id, title: x.title } }} />
            </Suspense>
          )
          : <Free mod={mod} mods={shown} solved={solved} loaded={loaded} conceptItems={conceptItems} ended={ended} onAgain={() => setEnded(null)} open={setOpenId} startRun={startRun} />}
      </div>
    </div>
  )
}

function Row({ title, meta, done, total, loaded, onClick, action }: { title: string; meta: string; done: number; total: number; loaded: boolean; onClick?: () => void; action?: ReactNode }) {
  const body = (<><Ring done={loaded ? done : 0} total={total} /><b>{title}</b><span className="sp-meta">{meta}</span></>)
  return (
    <li className="sp-row">
      {onClick ? <button type="button" className="sp-rowbtn" onClick={onClick}>{body}</button> : <div className="sp-rowbtn">{body}</div>}
      {action}
    </li>
  )
}

function Free({ mod, mods, solved, loaded, conceptItems, ended, onAgain, open, startRun }: {
  mod: TrackModule; mods: Mod[]; solved: Set<string>; loaded: boolean; conceptItems: PracticeItem[]
  ended: { ids: string[]; res: Record<string, RunResult> } | null; onAgain(): void; open(id: string): void; startRun: StartRun
}) {
  const { groups, stories } = freeSections(mods, levels.map(l => l.id))
  const modRow = (x: Mod) => {
    const { done, total } = moduleProgress(x, solved)
    return <Row key={x.id} title={x.title} done={done} total={total} loaded={loaded} meta={`${x.minutes} min · ${loaded ? `${done} of ${total}` : `${total} problems`}`} onClick={() => open(x.id)} />
  }
  return (
    <div className="sp-free">
      <section aria-labelledby="sp-h-level"><h2 id="sp-h-level">Pick a level</h2>
        {groups.map((g, i) => (
          <details key={g.level} className="sp-fold" open={i === 0}>
            <summary>{levels.find(l => l.id === g.level)?.title}<span className="sp-meta">{g.mods.length} modules</span></summary>
            <ul className="sp-rows">{g.mods.map(modRow)}</ul>
          </details>
        ))}
      </section>

      <section aria-labelledby="sp-h-set"><h2 id="sp-h-set">Build a set</h2>
        {ended ? <Summary ended={ended} onAgain={onAgain} /> : (
          <details className="sp-fold"><summary>Topics, difficulty, count, time box</summary><Custom mod={mod} solved={solved} startRun={startRun} /></details>
        )}
      </section>

      {stories.length > 0 && (
        <section aria-labelledby="sp-h-sit"><h2 id="sp-h-sit">Situations and case studies</h2>
          <ul className="sp-rows">{stories.map(modRow)}</ul>
        </section>
      )}

      <section aria-labelledby="sp-h-conc"><h2 id="sp-h-conc">Concept questions</h2>
        {!conceptItems.length ? <p className="pr-note" role="status">Concept questions are coming soon.</p> : (
          <ul className="sp-rows">
            {conceptTopics.map(t => {
              const { done, total } = topicProgress(conceptItems, t, solved)
              if (!total) return null
              return <Row key={t} title={t} done={done} total={total} loaded={loaded} meta={loaded ? `${done} of ${total}` : `${total} questions`}
                action={<button type="button" className="ml-btn ml-btn--sm" onClick={() => startRun(topicQueue(conceptItems, t, solved).map(i => i.id))}>{loaded && done === total ? 'Again' : 'Start'}</button>} />
            })}
            <li className="sp-row sp-row--end"><button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={() => startRun(mixedQueue(conceptItems, conceptTopics, solved, 10).map(i => i.id))}>Mixed 10</button></li>
          </ul>
        )}
      </section>
    </div>
  )
}

function ModuleView({ m, solved, loaded, startRun }: { m: Mod; solved: Set<string>; loaded: boolean; startRun: StartRun }) {
  const Scene = m.sceneId ? scenes[m.sceneId] : undefined
  const { done, total } = moduleProgress(m, solved)
  const todo = unsolvedIds(m, solved)
  const story = m.kind === 'situation' || m.kind === 'case'
  const items = m.problemIds.filter(id => findItem(id))
  return (
    <article className="sp-mod">
      <nav aria-label="Breadcrumb" className="sp-crumbs"><span>SQL</span> / <span>{levels.find(l => l.id === m.level)?.title}</span> / <span aria-current="page">{m.title}</span></nav>
      <header><h1>{m.title}</h1><p className="sp-lede">{m.blurb}</p></header>
      {story && m.scenario && <blockquote className="sp-brief"><b>The brief</b><p>{m.scenario}</p></blockquote>}
      {Scene && (
        <div className="ml-glass sp-scene">
          <Suspense fallback={<div className="sp-skel" role="status">Getting the picture ready…</div>}><Scene /></Suspense>
        </div>
      )}
      <div className="sp-cols">
        <section className="sp-side" aria-label="Key ideas">
          <h2>Key ideas</h2>
          {m.points.length > 0 && <ul className="sp-points">{m.points.map(p => <li key={p}>{p}</li>)}</ul>}
        </section>
        <section className="sp-side" aria-label="Problems">
          <h2>Problems</h2>
          {!items.length ? <p className="pr-note">No problems here yet.</p> : (
            <ol className="sp-probs">
              {items.map(id => <ProblemRow key={id} id={id} solved={solved.has(id)} loaded={loaded} start={() => startRun([id, ...items.filter(x => x !== id && !solved.has(x))], { modId: m.id })} />)}
            </ol>
          )}
          {items.length > 0 && (
            <button type="button" className="ml-btn sp-go" onClick={() => startRun(todo.length ? todo : items, { modId: m.id })}>
              {todo.length === 0 ? 'Practise again' : done === 0 ? 'Start the first one' : 'Continue'}
            </button>
          )}
          {loaded && items.length > 0 && <p className="sp-meta">{done} of {total} solved</p>}
        </section>
      </div>
    </article>
  )
}

function ProblemRow({ id, solved, loaded, start }: { id: string; solved: boolean; loaded: boolean; start(): void }) {
  const it = findItem(id)
  if (!it) return null
  return (
    <li><button type="button" className="sp-prob" onClick={start}>
      <span className={`sp-tick${solved ? ' is-done' : ''}`} aria-hidden="true">{solved ? '✓' : ''}</span>
      <span className="sp-prob-title">{it.title}</span>
      <span className="pr-chip sp-lv">Level {it.level}</span>
      <span className="pr-min sp-mn">{it.minutes} min</span>
      <span className="ml-sr">{solved ? 'Solved' : loaded ? 'Not yet' : ''}</span>
    </button></li>
  )
}

function Custom({ mod, solved, startRun }: { mod: TrackModule; solved: Set<string>; startRun: StartRun }) {
  const [topics, setTopics] = useState<string[]>([])
  const [level, setLevel] = useState<0 | 1 | 2 | 3>(0)
  const [count, setCount] = useState(10)
  const [box, setBox] = useState(0)
  const queue = buildQueue(mod.items, { topics, level, count, solved })
  const tog = (t: string) => setTopics(p => (p.includes(t) ? p.filter(x => x !== t) : [...p, t]))
  const radios = <T extends number>(name: string, legend: string, vals: T[], cur: T, set: (v: T) => void, label: (v: T) => string) => (
    <fieldset className="sp-fs"><legend>{legend}</legend>
      <div className="sp-opts">{vals.map(v => (
        <label key={v} className={cur === v ? 'is-on' : ''}><input type="radio" name={name} checked={cur === v} onChange={() => set(v)} /><span>{label(v)}</span></label>
      ))}</div>
    </fieldset>
  )
  return (
    <section className="ml-glass sp-custom">
      <h2>Build your own set</h2>
      <fieldset className="sp-fs"><legend>Topics (none picked means all)</legend>
        <div className="sp-opts">{mod.topics.map(t => (
          <label key={t} className={topics.includes(t) ? 'is-on' : ''}><input type="checkbox" checked={topics.includes(t)} onChange={() => tog(t)} /><span>{t}</span></label>
        ))}</div>
      </fieldset>
      {radios('lv', 'Difficulty', [0, 1, 2, 3] as (0 | 1 | 2 | 3)[], level, setLevel, v => (v ? String(v) : 'Any'))}
      {radios('ct', 'How many', [5, 10, 15], count, setCount, v => String(v))}
      {radios('tb', 'Time box', [0, 10, 20, 30], box, setBox, v => (v ? `${v} min` : 'None'))}
      <p className="sp-meta" role="status">{queue.length ? `${queue.length} problems ready.` : 'No problems match. Loosen a choice.'}</p>
      <button type="button" className="ml-btn sp-go" disabled={!queue.length} onClick={() => startRun(queue.map(p => p.id), { timeBox: box || undefined })}>Start</button>
    </section>
  )
}

function Summary({ ended, onAgain }: { ended: { ids: string[]; res: Record<string, RunResult> }; onAgain(): void }) {
  const s = summarize(ended.ids, ended.res)
  return (
    <section className="ml-glass sp-custom" role="status">
      <h2>That is the set</h2>
      <dl className="sp-sum">
        <div><dt>Solved</dt><dd>{s.solved}</dd></div>
        <div><dt>Solved first try</dt><dd>{s.first}</dd></div>
        <div><dt>Not yet</dt><dd>{s.notYet}</dd></div>
      </dl>
      <button type="button" className="ml-btn sp-go" onClick={onAgain}>Build another set</button>
    </section>
  )
}
