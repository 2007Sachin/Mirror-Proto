import type { ComponentType } from 'react'

/** The four practice tracks. Each track is a self-contained folder: src/practice/<track>/. */
export type Track = 'sql' | 'python' | 'stats' | 'case'

/** 1 = recognise and apply one idea, 2 = combine ideas or handle edge cases, 3 = ambiguous, multi-step, interview style. */
export type Level = 1 | 2 | 3

export interface PracticeItem {
  id: string          // stable and unique across tracks, e.g. "sql-window-rank-1"
  track: Track
  topic: string       // one of the track's `topics` (exact string)
  level: Level
  title: string       // short, plain: "Top customer in each country"
  minutes: number     // honest estimate of time to do it
}

/** Sent once per submitted answer. `correct` is the track's own check (tests passed, query matched, right option). */
export interface AttemptReport {
  itemId: string
  track: Track
  topic: string
  level: Level
  correct: boolean
  seconds: number     // time since the item was opened, capped at 3600
  hintsUsed: number
}

export interface DrillProps {
  item: PracticeItem
  /** Call after every submitted answer (right or wrong). The hub records it; the drill never touches the network. */
  onAttempt(attempt: AttemptReport): void
  onClose(): void
}

/** What a track folder exports from its index.ts as `trackModule`. */
export interface TrackModule {
  track: Track
  title: string       // "SQL"
  blurb: string       // one plain sentence on what it practises
  topics: string[]    // ordered; the coverage denominator
  items: PracticeItem[]
  /** React.lazy(() => import('./Drill')), so heavy engines (sql.js, Pyodide) never load on Today. */
  Drill: ComponentType<DrillProps>
}

/** One item's attempt history, as returned by GET /practice/summary. */
export interface ItemStat {
  itemId: string
  track: Track
  topic: string
  level: Level
  attempts: number
  firstTryCorrect: boolean // was the first ever attempt correct
  solved: boolean          // any attempt correct
  seconds: number          // total time across attempts
  lastAt: string           // ISO
  solvedAt: string | null  // ISO of the first correct attempt
}

export interface DayStat { date: string; attempts: number; seconds: number } // date = YYYY-MM-DD (UTC)

export interface PracticeSummary { items: ItemStat[]; days: DayStat[] } // days: last 84 days with activity only
