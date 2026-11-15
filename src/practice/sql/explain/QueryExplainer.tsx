// "See your query run on real rows": the stages of one SELECT as objects (row tokens) that glide between boxes.
// Callers: Drill.tsx (lazy via ./index). Motion is CSS transform/opacity only; prefers-reduced-motion jumps without tweening.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useStepper } from '../visual/shared'
import Token from './Token'
import { layout } from './scene'
import { buildStages, runStages, type Stage } from './stages'
import { getDb } from './useDb'
import './explain.css'

export interface QueryExplainerProps { sql: string; title?: string; compact?: boolean; autoPlay?: boolean }

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type Load = { status: 'load' } | { status: 'err' } | { status: 'ok'; sql: string; stages: Stage[] }

function SceneView({ stage, width, compact }: { stage: Stage; width: number; compact: boolean }) {
  const [settled, setSettled] = useState(reduced)
  useEffect(() => {
    if (settled) return
    const t = setTimeout(() => setSettled(true), 380)
    return () => clearTimeout(t)
  }, [settled])
  const sc = useMemo(() => layout(stage, width, compact), [stage, width, compact])
  return (
    <div className={`qx-scene ${settled ? 'is-settled' : ''}`} style={{ height: sc.height }}>
      {sc.boxes.map((b, i) => (
        <div key={i} className={`qx-box ${b.kind} ${b.dropped ? 'is-drop' : ''}`} style={{ left: b.x, top: b.y, width: b.w, height: b.h }}>
          <div className="qx-bh">
            <span className="qx-bt">{b.title}</span>
            {b.sub && <span className="qx-bs">{b.sub}</span>}
            {b.chip && <span className="qx-chip">{b.chip}</span>}
          </div>
          {b.badge && <div className="qx-badge">{b.badge}</div>}
          {b.foot && <div className="qx-bf">{b.foot}</div>}
        </div>
      ))}
      {sc.links.length > 0 && (
        <svg className="qx-links" width={width} height={sc.height} aria-hidden="true">
          {sc.links.map((l, i) => <line key={i} className={l.dup ? 'dup' : ''} x1={l.x0} y1={l.y0} x2={l.x1} y2={l.y1} />)}
        </svg>
      )}
      {sc.toks.map(t => (
        <Token key={t.id} row={t.row} cols={t.cols} cls={`${t.cls} qx-abs`} mini={t.mini} focus={t.focus} fields={compact ? 1 : 2}
          style={{ width: t.w, height: t.h, opacity: settled ? t.o1 : t.o0, transform: `translate(${settled ? t.x1 : t.x0}px, ${settled ? t.y1 : t.y0}px)`, transitionDelay: settled ? `${t.delay}ms` : '0ms' }} />
      ))}
    </div>
  )
}

export default function QueryExplainer({ sql, title, compact = false, autoPlay = false }: QueryExplainerProps) {
  const [load, setLoad] = useState<Load>({ status: 'load' })
  const [width, setWidth] = useState(560)
  const stageBox = useRef<HTMLDivElement>(null)
  const stages = load.status === 'ok' && load.sql === sql ? load.stages : []
  const st = useStepper(stages.length || 1, 2600)

  useEffect(() => {
    let live = true
    getDb().then(db => { if (live) setLoad({ status: 'ok', sql, stages: runStages(db, buildStages(sql)) }) }).catch(() => { if (live) setLoad({ status: 'err' }) })
    return () => { live = false }
  }, [sql])

  const ready = stages.length > 0
  const { replay } = st
  useEffect(() => { if (autoPlay && ready && !reduced()) replay() }, [autoPlay, ready, replay])

  useEffect(() => {
    const el = stageBox.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(160, Math.floor(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ready])

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const t = e.target as HTMLElement
    if (t.tagName === 'SELECT' || (t.tagName === 'INPUT' && (t as HTMLInputElement).type === 'range')) return
    if (e.key === ' ' && t.tagName !== 'BUTTON') { e.preventDefault(); st.toggle() }
    else if (e.key === 'ArrowRight') { e.preventDefault(); st.next() }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); st.prev() }
  }

  if (load.status === 'err' || (load.status === 'ok' && load.sql === sql && !ready)) return <section className="qx"><p className="qx-note">This query cannot be shown step by step here.</p></section>
  if (!ready) return <section className="qx"><p className="qx-note" aria-live="polite">Loading the sample data...</p></section>

  const s = stages[st.i]
  const j = s.join
  return (
    <section className={`qx ${compact ? 'compact' : ''}`} aria-label={title ?? 'Query run on real rows'} tabIndex={0} onKeyDown={onKeyDown}>
      <header className="qx-head">
        <h3>{title ?? 'See your query run'}</h3>
        <ol className="qx-rail" aria-label="Stages">
          {stages.map((x, i) => (
            <li key={x.id}><button type="button" className={`qx-step ${i === st.i ? 'on' : ''} ${i < st.i ? 'past' : ''}`} aria-current={i === st.i ? 'step' : undefined} onClick={() => st.seek(i)}>{x.chip}</button></li>
          ))}
        </ol>
      </header>

      <div className="qx-title"><b>{s.title}</b>{s.clause && !compact && <code>{s.clause}</code>}</div>

      {s.picks && !compact && (
        <ul className="qx-picks" aria-label="Output columns">
          {s.picks.map((p, i) => <li key={i} className={p.window ? 'win' : ''}><code>{p.expr}</code>{p.expr !== p.name && <span> as {p.name}</span>}{p.window && <em> every row</em>}</li>)}
        </ul>
      )}
      {j && (
        <p className="qx-stats">
          <span>{j.matched} matched</span><span className={j.unmatched ? 'warn' : ''}>{j.unmatched} {j.unmatched === 1 ? 'has' : 'have'} no match</span><span className={j.duplicated ? 'warn' : ''}>{j.duplicated} split in {j.duplicated === 1 ? 'two or more' : 'more'}</span>
        </p>
      )}

      <div className="qx-stage" ref={stageBox}>
        <SceneView key={`${s.id}`} stage={s} width={width} compact={compact} />
      </div>

      <p className="qx-caption" aria-live="polite">{s.caption}</p>

      <div className="qx-controls">
        <div className="qx-btns" role="group" aria-label="Playback">
          <button type="button" className="qx-btn" onClick={st.prev} disabled={st.i === 0}>Back</button>
          <button type="button" className="qx-btn primary" onClick={st.toggle}>{st.running ? 'Pause' : 'Play'}</button>
          <button type="button" className="qx-btn" onClick={st.next} disabled={st.i >= st.last}>Next</button>
          <button type="button" className="qx-btn" aria-pressed={st.speed === 2} onClick={() => st.setSpeed(st.speed === 1 ? 2 : 1)} aria-label="Speed">{st.speed}x</button>
        </div>
        <label className="qx-scrub">
          <span>Step {st.i + 1} of {st.count}</span>
          <input type="range" min={0} max={st.last} value={st.i} onChange={e => st.seek(Number(e.target.value))} aria-label="Jump to step" />
        </label>
      </div>
    </section>
  )
}
