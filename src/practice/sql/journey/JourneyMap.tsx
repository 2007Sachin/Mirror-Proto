import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Award, BookOpen, Braces, Check, Compass, Database, GitMerge, Layers, Lightbulb, MapPin, Repeat, Sigma, Sparkles, Split, Star, Table2, Target, Trophy, X, type LucideIcon } from 'lucide-react'
import { LiveOrb } from '../../../components/LiveOrb'
import { NARROW_W, ringDash, ROW_H, nodeX, nodeY, segmentD, TRACK_W } from './layout'
import type { JourneyNode, JourneyState } from './types'
import './journey.css'

const R = 28
// Topic family -> icon for module nodes (matched on the module id); unknown ids fall back to the book.
const TOPIC_ICON: [RegExp, LucideIcon][] = [
  [/table/, Table2], [/select|where/, Database], [/null/, Split], [/group|agg|stat|trend/, Sigma], [/join|set-ops|division/, GitMerge],
  [/case|text|date/, Braces], [/subquer/, Layers], [/cte|recursive/, Repeat], [/window|dedup|topn/, Layers],
]
const KIND_ICON = { placement: Compass, module: BookOpen, concepts: Lightbulb, boss: Trophy }
const iconFor = (n: JourneyNode): LucideIcon => (n.kind === 'module' && TOPIC_ICON.find(([re]) => re.test(n.moduleId ?? n.id))?.[1]) || KIND_ICON[n.kind]

function actionLabel(n: JourneyNode) {
  if (n.kind === 'boss') return 'Take the mock'
  if (n.kind === 'placement') return 'Find my level'
  return n.status === 'done' ? 'Review' : n.solved > 0 ? 'Continue' : 'Start'
}
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
const nodeLabel = (n: JourneyNode) =>
  [n.title, n.total ? `${n.solved} of ${n.total} solved` : null, plural(n.stars, 'star'), n.status === 'current' ? 'recommended next' : n.status === 'done' ? 'done' : null].filter(Boolean).join(', ')
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function Medal({ title, earned }: { title: string; earned: boolean }) {
  return <span className={`jm-medal${earned ? ' is-earned' : ''}`} title={title} role="img" aria-label={`${title} badge, ${earned ? 'earned' : 'not yet earned'}`}><Award size={15} aria-hidden="true" /></span>
}

export default function JourneyMap({ state, onOpenNode, onContinue }: { state: JourneyState; onOpenNode(node: JourneyNode): void; onContinue(): void }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [seen, setSeen] = useState<{ id: string | null; xp: number }>({ id: state.current?.id ?? null, xp: state.xp })
  const [burst, setBurst] = useState<{ id: string; key: number; text: string } | null>(null)
  const [offscreen, setOffscreen] = useState(false)
  const [trackW, setTrackW] = useState(() => (typeof innerWidth === 'number' && innerWidth < 640 ? NARROW_W : TRACK_W))
  useEffect(() => {
    const on = () => setTrackW(innerWidth < 640 ? NARROW_W : TRACK_W)
    addEventListener('resize', on)
    return () => removeEventListener('resize', on)
  }, [])
  const nodeEls = useRef(new Map<string, HTMLButtonElement>())
  const curId = state.current?.id ?? null
  const all = state.worlds.flatMap(w => w.nodes)

  // A node was just finished: the old current node is now done. Adjust state during render (no effect needed).
  if (seen.id !== curId || seen.xp !== state.xp) {
    const finished = seen.id !== curId ? all.find(n => n.id === seen.id && n.status === 'done') : undefined
    setSeen({ id: curId, xp: state.xp })
    if (finished) setBurst({ id: finished.id, key: (burst?.key ?? 0) + 1, text: `${finished.title} complete: ${plural(finished.stars, 'star')}. +${Math.max(0, state.xp - seen.xp)} XP.` })
  }
  useEffect(() => {
    if (!burst) return
    const t = window.setTimeout(() => setBurst(null), 900)
    return () => window.clearTimeout(t)
  }, [burst])

  useEffect(() => {
    const el = curId ? nodeEls.current.get(curId) : undefined
    if (!el) return
    if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' })
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setOffscreen(!e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [curId])

  const close = () => { const id = openId; setOpenId(null); if (id) nodeEls.current.get(id)?.focus() }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && openId) { e.stopPropagation(); close(); return }
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    const i = all.findIndex(n => nodeEls.current.get(n.id) === document.activeElement)
    if (!dir || i < 0) return
    e.preventDefault()
    const next = all[i + dir]
    if (next) nodeEls.current.get(next.id)?.focus()
  }

  const openNode = all.find(n => n.id === openId)
  const { level, guide, quest } = state
  const toGo = Math.max(0, level.xpForNext - level.xpIntoLevel)
  return (
    <div className="jm" onKeyDown={onKey}>
      <div className="jm-sr" role="status" aria-live="polite">{burst?.text ?? ''}</div>
      <header className="jm-top">
        <div className="jm-coach">
          <div className="jm-orb"><LiveOrb compact state={guide.mood === 'welcome' ? 'speaking' : 'idle'} label="MIRROR guide" /></div>
          <p className="jm-bubble">{guide.mood === 'cheer' && <Sparkles size={13} aria-hidden="true" className="jm-spark" />}{guide.text}</p>
          {guide.cta && <button type="button" className="jm-cta" onClick={onContinue}>{guide.cta.label}</button>}
        </div>
        <div className="jm-player">
          <div className="jm-level">
            <strong>Level {level.n} · {level.title}</strong>
            <div className="jm-bar" role="progressbar" aria-label="Progress to next level" aria-valuemin={0} aria-valuemax={level.xpForNext} aria-valuenow={level.xpIntoLevel} aria-valuetext={`${toGo} XP to go`}>
              <i style={{ width: `${level.xpForNext ? Math.min(100, (level.xpIntoLevel / level.xpForNext) * 100) : 0}%` }} />
            </div>
            <small>{toGo} XP to next level</small>
          </div>
          <span className={`jm-quest${quest.done ? ' is-done' : ''}`}>{quest.done ? <Check size={13} aria-hidden="true" /> : <Target size={13} aria-hidden="true" />}<span>{quest.text}</span><b>{quest.progress}</b></span>
          <div className="jm-medals">{state.badges.slice(0, 6).map(b => <Medal key={b.id} title={b.title} earned={b.earned} />)}</div>
        </div>
      </header>

      <main className="jm-map">
        {state.worlds.map(w => {
          const done = w.nodes.filter(n => n.status === 'done').length
          return (
            <section key={w.id} className={`jm-world${w.done ? ' is-done' : ''}`} aria-labelledby={`jw-${w.id}`}>
              <div className="jm-banner" style={{ width: `min(100%, ${trackW}px)` }}>
                <div><h2 id={`jw-${w.id}`}>{w.title}</h2><p>{w.subtitle}</p></div>
                <div className="jm-count"><Medal title={w.badge} earned={w.done} /><span>{done} of {w.nodes.length} done</span></div>
              </div>
              <ol className="jm-path" style={{ height: w.nodes.length * ROW_H, width: trackW }}>
                <svg className="jm-line" width={trackW} height={w.nodes.length * ROW_H} aria-hidden="true">
                  {w.nodes.slice(0, -1).map((n, i) => <path key={n.id} d={segmentD(i, trackW)} className={n.status === 'done' ? 'is-done' : ''} />)}
                </svg>
                {w.nodes.map((n, i) => {
                  const Icon = iconFor(n)
                  const x = nodeX(i, trackW), big = n.kind === 'boss', size = big ? 76 : 60
                  const ring = ringDash(n.solved, n.total, R)
                  const open = openId === n.id
                  const left = x > trackW / 2 + 1
                  return (
                    <li key={n.id} className={`jm-node is-${n.status}${big ? ' is-boss' : ''}${open ? ' is-open' : ''}`} style={{ top: nodeY(i) - ROW_H / 2 + 8, height: ROW_H }}>
                      <div className="jm-hit" style={{ left: x - size / 2, width: size, height: size }}>
                        {n.status === 'current' && <span className="jm-pin"><MapPin size={12} aria-hidden="true" /> You are here</span>}
                        <button type="button" className="jm-btn" aria-label={nodeLabel(n)} aria-expanded={open} aria-controls={open ? 'jm-sheet' : undefined}
                          ref={el => { if (el) nodeEls.current.set(n.id, el); else nodeEls.current.delete(n.id) }}
                          onClick={() => setOpenId(open ? null : n.id)}>
                          <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r={R} className="jm-ring-bg" />
                            {n.total > 0 && <circle cx="32" cy="32" r={R} className="jm-ring" strokeDasharray={`${ring.dash} ${ring.c}`} transform="rotate(-90 32 32)" />}</svg>
                          <span className="jm-ico">{n.status === 'done' ? <Check size={big ? 32 : 26} strokeWidth={3} aria-hidden="true" /> : <Icon size={big ? 32 : 26} strokeWidth={2.25} aria-hidden="true" />}</span>
                        </button>
                        <span className="jm-stars" aria-hidden="true">{[1, 2, 3].map(s => <Star key={s} size={14} className={s <= n.stars ? 'on' : ''} />)}</span>
                        {burst?.id === n.id && <span key={burst.key} className="jm-burst" aria-hidden="true">{Array.from({ length: 10 }, (_, k) => <i key={k} style={{ ['--a' as string]: `${k * 36}deg` }} />)}</span>}
                      </div>
                      <div className={`jm-title${left ? ' is-left' : ''}`} style={left ? { right: trackW - x + size / 2 + 8 } : { left: x + size / 2 + 8 }}>
                        <b>{n.title}</b>
                        <small>{n.total ? `${n.solved} of ${n.total} · ` : ''}{n.minutes} min{n.status === 'current' ? ' · Start here' : ''}</small>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}
      </main>
      {openNode && (
                        <div className="jm-sheet" id="jm-sheet" role="dialog" aria-label={openNode.title}>
                          <button type="button" className="jm-x" aria-label="Close" onClick={close}><X size={16} aria-hidden="true" /></button>
                          <h3>{openNode.title}</h3>
                          <p>{openNode.blurb}</p>
                          <dl>
                            <div><dt>Time</dt><dd>{openNode.minutes} min</dd></div>
                            <div><dt>Stars</dt><dd>{openNode.stars} of 3</dd></div>
                            <div><dt>On offer</dt><dd>+{openNode.xp} XP</dd></div>
                            {openNode.total > 0 && <div><dt>Progress</dt><dd>{openNode.solved} of {openNode.total}</dd></div>}
                          </dl>
                          <button type="button" className="jm-cta" autoFocus onClick={() => onOpenNode(openNode)}>{actionLabel(openNode)}</button>
                        </div>
      )}
      {offscreen && curId && <button type="button" className="jm-jump" onClick={() => nodeEls.current.get(curId)?.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' })}><MapPin size={14} aria-hidden="true" /> Jump to current</button>}
    </div>
  )
}
