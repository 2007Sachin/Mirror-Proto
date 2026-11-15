import type { PracticeAttemptRow } from '../repo/types.js'

// Same shapes as ItemStat / DayStat / PracticeSummary in src/practice/types.ts.
export interface ItemStat {
  itemId: string
  track: PracticeAttemptRow['track']
  topic: string
  level: PracticeAttemptRow['level']
  attempts: number
  firstTryCorrect: boolean
  solved: boolean
  seconds: number
  lastAt: string
  solvedAt: string | null
}
export interface DayStat { date: string; attempts: number; seconds: number }
export interface PracticeSummary { items: ItemStat[]; days: DayStat[] }

const DAY = 86_400_000
const WINDOW_DAYS = 84

export function summarise(attempts: PracticeAttemptRow[], now: Date = new Date()): PracticeSummary {
  const sorted = [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const items = new Map<string, ItemStat>()
  const days = new Map<string, DayStat>()
  const cutoff = now.getTime() - WINDOW_DAYS * DAY

  for (const a of sorted) {
    const s = items.get(a.itemId)
    if (!s) {
      items.set(a.itemId, {
        itemId: a.itemId, track: a.track, topic: a.topic, level: a.level, attempts: 1,
        firstTryCorrect: a.correct, solved: a.correct, seconds: a.seconds, lastAt: a.createdAt,
        solvedAt: a.correct ? a.createdAt : null,
      })
    } else {
      s.attempts++
      s.seconds += a.seconds
      s.lastAt = a.createdAt
      s.track = a.track // metadata follows the latest attempt
      s.topic = a.topic
      s.level = a.level
      if (a.correct && !s.solved) {
        s.solved = true
        s.solvedAt = a.createdAt
      }
    }
    if (Date.parse(a.createdAt) >= cutoff) {
      const date = a.createdAt.slice(0, 10)
      const d = days.get(date) ?? { date, attempts: 0, seconds: 0 }
      d.attempts++
      d.seconds += a.seconds
      days.set(date, d)
    }
  }
  return { items: [...items.values()], days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)) }
}
