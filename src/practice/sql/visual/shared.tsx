/* eslint-disable react-refresh/only-export-components -- small shared primitives + a hook live together on purpose */
// Shared primitives for the SQL scenes: stepper hook, controls, caption, animated table. Callers: every scene in this folder.
import { useState, useEffect, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import type { TRow } from './logic'
import './visual.css'

export const ROW_H = 36
export const HEAD_H = 34
const TINTS = ['0%', '10%', '20%', '32%', '46%']

export function useStepper(count: number, baseMs = 1600) {
  const [raw, setRaw] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<1 | 2>(1)
  const last = Math.max(0, count - 1)
  const i = Math.min(raw, last)
  const running = playing && i < last
  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => setRaw(i + 1), baseMs / speed)
    return () => clearTimeout(t)
  }, [running, i, speed, baseMs])
  const seek = (n: number) => { setPlaying(false); setRaw(Math.max(0, Math.min(last, n))) }
  return {
    i, last, count, running, speed, setSpeed, seek,
    next: () => seek(i + 1), prev: () => seek(i - 1), reset: () => seek(0),
    replay: () => { setRaw(0); setPlaying(true) },
    toggle: () => { if (running) setPlaying(false); else if (i >= last) { setRaw(0); setPlaying(true) } else setPlaying(true) },
  }
}
export type Stepper = ReturnType<typeof useStepper>

export function SceneFrame({ title, lead, st, children }: { title: string; lead: string; st: Stepper; children: ReactNode }) {
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const t = e.target as HTMLElement
    if (t.tagName === 'SELECT' || (t.tagName === 'INPUT' && (t as HTMLInputElement).type === 'range')) return
    if (e.key === ' ' && t.tagName !== 'BUTTON') { e.preventDefault(); st.toggle() }
    else if (e.key === 'ArrowRight') { e.preventDefault(); st.next() }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); st.prev() }
  }
  return (
    <section className="vz" aria-label={title} tabIndex={0} onKeyDown={onKeyDown}>
      <header className="vz-head"><h3>{title}</h3><p>{lead}</p></header>
      <Controls st={st} />
      {children}
    </section>
  )
}

export function Controls({ st }: { st: Stepper }) {
  return (
    <div className="vz-controls">
      <div className="vz-btns" role="group" aria-label="Playback">
        <button type="button" className="vz-btn" onClick={st.replay} aria-label="Replay">Replay</button>
        <button type="button" className="vz-btn" onClick={st.prev} disabled={st.i === 0} aria-label="Step back">Back</button>
        <button type="button" className="vz-btn vz-primary" onClick={st.toggle} aria-label={st.running ? 'Pause' : 'Play'}>{st.running ? 'Pause' : 'Play'}</button>
        <button type="button" className="vz-btn" onClick={st.next} disabled={st.i >= st.last} aria-label="Step forward">Next</button>
        <button type="button" className="vz-btn" aria-pressed={st.speed === 2} onClick={() => st.setSpeed(st.speed === 1 ? 2 : 1)} aria-label="Speed">{st.speed}x</button>
      </div>
      <label className="vz-scrub">
        <span>Step {st.i + 1} of {st.count}</span>
        <input type="range" min={0} max={st.last} value={st.i} onChange={e => st.seek(Number(e.target.value))} aria-label="Jump to step" />
      </label>
    </div>
  )
}

export const Caption = ({ children }: { children: ReactNode }) => <p className="vz-caption" aria-live="polite">{children}</p>

export function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="vz-seg" role="group" aria-label={label}>
      <span className="vz-seg-l">{label}</span>
      {options.map(([v, text]) => <button key={v} type="button" className="vz-opt" aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>)}
    </div>
  )
}

export const cellText = (c: string | number | null) => (c === null ? <i>NULL</i> : c)

/** Rows are absolutely positioned by index, so a change of order slides them (a FLIP-style move via CSS transition). */
export function AnimTable({ cols, rows, maxRows, hlCol, children }: { cols: string[]; rows: TRow[]; maxRows: number; hlCol?: number; children?: ReactNode }) {
  const tpl: CSSProperties = { gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }
  return (
    <div className="vz-at" role="table" style={{ height: HEAD_H + maxRows * ROW_H }}>
      <div className="vz-at-head" role="row" style={tpl}>{cols.map((c, j) => <span role="columnheader" key={j}>{c}</span>)}</div>
      {rows.map((r, i) => (
        <div key={r.key} role="row" className={`vz-at-row ${r.tone ?? ''}`} style={{ ...tpl, transform: `translateY(${HEAD_H + i * ROW_H}px)`, '--t': TINTS[r.tint ?? 0] } as CSSProperties}>
          {r.cells.map((c, j) => <span role="cell" key={j} className={j === hlCol ? 'hl' : ''}>{cellText(c)}</span>)}
        </div>
      ))}
      {children}
    </div>
  )
}
