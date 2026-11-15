import type { ItemStat } from './types'

/** Days between replays: after the first try, then after each correct replay. Clearing the last rung retires the item. */
export const LADDER = [1, 3, 7]

export interface DueRep { itemId: string; dueAt: string; overdueDays: number; reason: string; compressed: boolean }

const dayOf = (iso: string) => { const d = new Date(iso); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) // calendar maths, DST-safe
const between = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000)
const today = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate())

/** Whole days from today to a YYYY-MM-DD date; null when missing, malformed or past. */
function daysToInterview(now: Date, date?: string | null): number | null {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return null
  const n = between(today(now), new Date(y, m - 1, d))
  return n >= 0 ? n : null
}

interface Plan { rung: number; retired: boolean; last: Date; missed: boolean; gap: number; compressed: boolean }

function plan(item: ItemStat, interviewDays: number | null): Plan {
  const hist = item.history?.length ? item.history : [{ at: item.lastAt, correct: item.lastCorrect ?? item.solved }]
  let rung = 0, retired = false
  let prev = dayOf(hist[0].at)
  for (const a of hist.slice(1)) {
    const day = dayOf(a.at)
    if (!a.correct) { rung = 0; retired = false } // a miss starts the ladder again
    else if (!retired && between(prev, day) >= LADDER[rung]) { // same-day repeats and early replays do not advance
      if (rung === LADDER.length - 1) retired = true
      else rung++
    }
    prev = day
  }
  const missed = !hist[hist.length - 1].correct
  const base = LADDER[rung]
  const gap = interviewDays === null ? base : Math.min(base, Math.max(1, Math.floor(interviewDays / 2)))
  return { rung, retired, last: prev, missed, gap, compressed: gap < base }
}

const ago = (n: number) => (n <= 0 ? 'earlier today' : n === 1 ? 'yesterday' : `${n} days ago`)

function reasonFor(p: Plan, now: Date, interviewDays: number | null): string {
  const n = between(p.last, today(now))
  if (p.missed) return n <= 1 ? `You missed this ${n <= 0 ? 'today' : 'yesterday'}. Another go while it is fresh helps it stick.` : `You missed this ${n} days ago. Another go now helps it stick.`
  if (p.compressed && interviewDays !== null) return `Your interview is ${interviewDays === 1 ? 'tomorrow' : `in ${interviewDays} days`}, so the gaps between replays are shorter now.`
  return `You tried this ${ago(n)}, so this is a good time to replay it.`
}

/** Plain reason for replaying an item (also usable for items that are not due yet). */
export function replayReason(item: ItemStat, now: Date, interviewDate?: string | null): string {
  const d = daysToInterview(now, interviewDate)
  return reasonFor(plan(item, d), now, d)
}

/** Replays due now: compressed first, then most overdue, then by id. No replays on the interview day. */
export function dueReps(items: ItemStat[], now: Date, interviewDate?: string | null): DueRep[] {
  const d = daysToInterview(now, interviewDate)
  if (d === 0) return []
  const out: DueRep[] = []
  for (const item of items) {
    if (item.attempts < 1) continue
    const p = plan(item, d)
    if (p.retired) continue
    const due = addDays(p.last, p.gap)
    if (due.getTime() > now.getTime()) continue
    out.push({ itemId: item.itemId, dueAt: due.toISOString(), overdueDays: between(due, today(now)), reason: reasonFor(p, now, d), compressed: p.compressed })
  }
  return out.sort((a, b) => Number(b.compressed) - Number(a.compressed) || b.overdueDays - a.overdueDays || a.itemId.localeCompare(b.itemId))
}
