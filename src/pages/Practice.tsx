import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import '../landing.css'
import './practice.css'
import { api } from '../lib/api'
import { findItem, moduleFor, tracks } from '../practice/tracks'
import Path from '../practice/sql/Path'
import YourRecord from '../practice/YourRecord'
import type { AttemptReport, ItemStat, PracticeItem, PracticeSummary, Track } from '../practice/types'

const PYTHON_NOTE = 'Plain Python, no pandas yet. The runtime downloads once (about 10 MB).'
const LEVELS = [1, 2, 3] as const
const RETRY_MS = 5000

/** Catches a failed Drill chunk (offline, deploy in between) so the hub never goes blank. */
class DrillBoundary extends Component<{ children: ReactNode; onBack: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="pr-note" role="alert">
        <p>This exercise could not load. Check your connection and try again.</p>
        <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={this.props.onBack}>Back</button>
      </div>
    )
  }
}

const solvedIn = (stats: ItemStat[], id: string) => stats.some(s => s.itemId === id && s.solved)

export default function Practice({ initialItemId = null, onInitialConsumed, onChange }: {
  initialItemId?: string | null
  onInitialConsumed?: () => void
  onChange?: () => void
}) {
  const [summary, setSummary] = useState<PracticeSummary | null>(null)
  const [summaryFailed, setSummaryFailed] = useState(false)
  const [track, setTrack] = useState<Track | null>(() => (initialItemId ? findItem(initialItemId)?.track ?? null : null))
  const [item, setItem] = useState<PracticeItem | null>(() => (initialItemId ? findItem(initialItemId) ?? null : null))
  const [saveFailed, setSaveFailed] = useState(false)
  const alive = useRef(true)

  const loadSummary = useCallback(() => {
    api.practiceSummary()
      .then(s => { if (alive.current) { setSummary(s); setSummaryFailed(false) } })
      .catch(() => { if (alive.current) setSummaryFailed(true) })
  }, [])

  useEffect(() => {
    alive.current = true
    loadSummary()
    return () => { alive.current = false }
  }, [loadSummary])

  // Open the item Today pointed at, once.
  useEffect(() => {
    if (!initialItemId) return
    onInitialConsumed?.() // the item was picked up by the initial state above (Practice mounts when Today opens it)
  }, [initialItemId, onInitialConsumed])

  // Fire and forget. One quiet retry; the UI never waits on it.
  const record = useCallback((report: AttemptReport) => {
    const send = (retry: boolean) => {
      api.recordAttempt(report)
        .then(() => { if (alive.current) { setSaveFailed(false); loadSummary(); onChange?.() } })
        .catch(() => {
          if (retry) setTimeout(() => send(false), RETRY_MS)
          else if (alive.current) setSaveFailed(true)
        })
    }
    send(true)
  }, [loadSummary, onChange])

  const stats = summary?.items ?? []
  const mod = track ? moduleFor(track) : null

  if (item && mod) {
    const Drill = mod.Drill
    return (
      <div className="mirror-landing practice">
        <div className="pr-wrap">
          {saveFailed && <p className="pr-note" role="status">Your last answer could not be saved. It will not count toward Today yet.</p>}
          <DrillBoundary onBack={() => setItem(null)}>
            <Suspense fallback={<p className="pr-note" role="status">{item.track === 'python' ? 'Getting the Python runtime ready…' : 'Opening the exercise…'}</p>}>
              <Drill key={item.id} item={item} onAttempt={report => record(report)} onClose={() => setItem(null)} />
            </Suspense>
          </DrillBoundary>
        </div>
      </div>
    )
  }

  return (
    <div className="mirror-landing practice">
      <div className="pr-wrap">
        <header className="pr-top">
          <p className="ml-eyebrow">Practice</p>
          <h1>{mod ? mod.title : 'Hands-on practice'}</h1>
          <p className="pr-lede">{mod ? mod.blurb : 'Short exercises you run right here. Every answer is saved and feeds your Briefing.'}</p>
        </header>

        {summaryFailed && (
          <p className="pr-note" role="status">
            We could not load your progress, so solved marks may be missing. You can still practise.{' '}
            <button type="button" className="pr-link" onClick={loadSummary}>Try again</button>
          </p>
        )}

        {!mod && (
          <ul className="pr-tracks">
            {tracks.map(t => {
              const solved = t.items.filter(i => solvedIn(stats, i.id)).length
              return (
                <li key={t.track}>
                  <button type="button" className="ml-glass pr-track" onClick={() => setTrack(t.track)}>
                    <b>{t.title}</b>
                    <span className="pr-blurb">{t.blurb}</span>
                    <span className="pr-solved">{summary ? `${solved} solved` : `${t.items.length} exercises`}</span>
                    <span className="pr-ladder">
                      {LEVELS.map(l => {
                        const at = t.items.filter(i => i.level === l)
                        if (!at.length) return null
                        return <span key={l}>Level {l}: {summary ? `${at.filter(i => solvedIn(stats, i.id)).length} solved` : `${at.length} exercises`}</span>
                      })}
                    </span>
                    {t.track === 'python' && <small>{PYTHON_NOTE}</small>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {mod?.track === 'sql' && (
          <Path
            mod={mod} stats={stats} days={summary?.days} loaded={!!summary} onAttempt={record} onBack={() => setTrack(null)}
            renderDrill={(it, onAttempt, onClose) => {
              const Drill = mod.Drill
              return (
                <DrillBoundary onBack={onClose}>
                  <Suspense fallback={<p className="pr-note" role="status">Opening the exercise…</p>}>
                    <Drill key={it.id} item={it} onAttempt={onAttempt} onClose={onClose} />
                  </Suspense>
                </DrillBoundary>
              )
            }}
          />
        )}

        {mod && mod.track !== 'sql' && (
          <>
            <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm pr-back" onClick={() => setTrack(null)}>All tracks</button>
            {mod.track === 'python' && <p className="pr-note">{PYTHON_NOTE}</p>}
            {mod.topics.map(topic => {
              const rows = mod.items.filter(i => i.topic === topic)
              if (!rows.length) return null
              return (
                <section key={topic} className="ml-glass pr-topic" aria-labelledby={`t-${topic}`}>
                  <h2 id={`t-${topic}`}>{topic}</h2>
                  <ul>
                    {rows.map(i => {
                      const done = solvedIn(stats, i.id)
                      return (
                        <li key={i.id}>
                          <button type="button" className="pr-item" onClick={() => setItem(i)}>
                            <span className="pr-item-title">{i.title}</span>
                            <span className="pr-chip">Level {i.level}</span>
                            <span className="pr-min">{i.minutes} min</span>
                            <span className={`pr-state${done ? ' is-done' : ''}`}>{done ? '✓ Solved' : summary ? 'Not yet' : ''}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </>
        )}

        {!mod && summary && <YourRecord summary={summary} tracks={tracks} />}
      </div>
    </div>
  )
}
