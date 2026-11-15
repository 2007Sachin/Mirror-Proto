// Pure insight functions for Today. Input: PracticeSummary + track catalog + targets. No percentages anywhere.
import { dueReps } from './replay'
import type { ItemStat, PracticeItem, PracticeSummary, Track } from './types'

const DAY = 86_400_000
const t = (iso: string) => Date.parse(iso)

/** The part of a TrackModule the stats need (keeps these functions free of lazy components). */
export interface TrackLike { track: Track; title: string; topics: string[]; items: PracticeItem[] }
export type NeedArea = 'sql' | 'python' | 'tools' | 'analytics' | 'behavioural'
export interface TargetLike { company: string; interviewDate: string | null; skills: { area: NeedArea }[] }

const itemsOf = (tracks: TrackLike[]) => tracks.flatMap(x => x.items)
const attempted = (s: PracticeSummary) => s.items.filter(i => i.attempts > 0)

/** Distinct items attempted in the last 7 days vs the 7 before.
 *  ponytail: uses each item's lastAt, so an item attempted in both weeks counts only in the later one. */
export function weekCompare(s: PracticeSummary, now: Date) {
  const n = now.getTime()
  let thisWeek = 0, lastWeek = 0
  for (const i of attempted(s)) {
    const age = n - t(i.lastAt)
    if (age < 0) continue
    if (age < 7 * DAY) thisWeek++
    else if (age < 14 * DAY) lastWeek++
  }
  return { thisWeek, lastWeek }
}

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Seconds practised per UTC day for the last 7 days, oldest first, plus the total. */
export function weekSeconds(s: PracticeSummary, now: Date) {
  const by = new Map(s.days.map(d => [d.date, d.seconds]))
  const perDay = Array.from({ length: 7 }, (_, k) => by.get(utcDay(now.getTime() - (6 - k) * DAY)) ?? 0)
  return { perDay, total: perDay.reduce((a, b) => a + b, 0) }
}

/** Topics touched / total, and the untouched ones. */
export function coverage(s: PracticeSummary, tracks: TrackLike[]) {
  const touched = new Set(attempted(s).map(i => `${i.track}|${i.topic}`))
  const untouched: { track: Track; trackTitle: string; topic: string }[] = []
  let total = 0
  for (const x of tracks) for (const topic of x.topics) {
    total++
    if (!touched.has(`${x.track}|${topic}`)) untouched.push({ track: x.track, trackTitle: x.title, topic })
  }
  return { touched: total - untouched.length, total, untouched }
}

/** Counts only: of the items attempted in a topic, how many were right on the very first attempt. */
export function firstTryByTopic(s: PracticeSummary, tracks: TrackLike[]) {
  const rows: { track: Track; topic: string; attempted: number; firstTryCorrect: number }[] = []
  for (const x of tracks) for (const topic of x.topics) {
    const here = attempted(s).filter(i => i.track === x.track && i.topic === topic)
    if (here.length) rows.push({ track: x.track, topic, attempted: here.length, firstTryCorrect: here.filter(i => i.firstTryCorrect).length })
  }
  return rows
}

/** Topics with items failed first and still unsolved. */
export function weakSpots(s: PracticeSummary, tracks: TrackLike[]) {
  const spots: { track: Track; topic: string; itemIds: string[] }[] = []
  for (const x of tracks) for (const topic of x.topics) {
    const ids = s.items.filter(i => i.track === x.track && i.topic === topic && i.attempts > 0 && !i.firstTryCorrect && !i.solved).map(i => i.itemId)
    if (ids.length) spots.push({ track: x.track, topic, itemIds: ids })
  }
  return spots
}

/** Solved more than 3 days ago and not attempted since. Oldest first. */
export function dueForReview(s: PracticeSummary, now: Date): { itemId: string; daysAgo: number }[] {
  return s.items
    .filter((i): i is ItemStat & { solvedAt: string } => i.solved && !!i.solvedAt && now.getTime() - t(i.solvedAt) > 3 * DAY && t(i.lastAt) <= t(i.solvedAt))
    .sort((a, b) => t(a.solvedAt) - t(b.solvedAt))
    .map(i => ({ itemId: i.itemId, daysAgo: Math.floor((now.getTime() - t(i.solvedAt)) / DAY) }))
}

/** 28 booleans, oldest to newest (last one is today, UTC). */
export function activeDays28(s: PracticeSummary, now: Date): boolean[] {
  const active = new Set(s.days.filter(d => d.attempts > 0).map(d => d.date))
  return Array.from({ length: 28 }, (_, k) => active.has(utcDay(now.getTime() - (27 - k) * DAY)))
}

const localMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Nearest interview that is today or later. */
export function nextInterview(targets: TargetLike[], now: Date): { company: string; days: number } | null {
  let best: { company: string; days: number } | null = null
  for (const x of targets) {
    if (!x.interviewDate) continue
    const [y, m, d] = x.interviewDate.split('-').map(Number)
    const days = Math.round((new Date(y, m - 1, d).getTime() - localMidnight(now)) / DAY)
    if (days >= 0 && (!best || days < best.days)) best = { company: x.company, days }
  }
  return best
}

const AREA_TRACKS: Record<NeedArea, Track[]> = { sql: ['sql'], python: ['python'], analytics: ['stats', 'case'], tools: [], behavioural: [] }

/** Which tracks a target's skills point at, with solved vs available items; areas with no hands-on track listed separately. */
export function targetNeeds(skills: { area: NeedArea }[], tracks: TrackLike[], s: PracticeSummary) {
  const areas = new Set(skills.map(k => k.area))
  const wanted = new Set(Array.from(areas).flatMap(a => AREA_TRACKS[a]))
  const rows = tracks.filter(x => wanted.has(x.track)).map(x => ({
    track: x.track,
    title: x.title,
    available: x.items.length,
    solved: s.items.filter(i => i.track === x.track && i.solved).length,
    practised: s.items.filter(i => i.track === x.track && i.attempts > 0).length,
  }))
  const noTrack = (['tools', 'behavioural'] as NeedArea[]).filter(a => areas.has(a))
  return { rows, noTrack }
}

export interface Recommendation { itemId: string; reason: string }

/** Transparent order: weak spot, spaced replay (1/3/7 days, shorter before interviewDate), old due review, uncovered topic of a track a target needs, least-practised track. */
export function recommend(s: PracticeSummary, tracks: TrackLike[], targets: TargetLike[], now: Date, interviewDate?: string | null): Recommendation | null {
  const catalog = itemsOf(tracks)
  const byId = new Map(catalog.map(i => [i.id, i]))
  const title = (id: string) => byId.get(id)?.title ?? id

  const weak = weakSpots(s, tracks).find(w => byId.has(w.itemIds[0]))
  if (weak) return { itemId: weak.itemIds[0], reason: `You missed “${title(weak.itemIds[0])}” on the first try and have not solved it yet. Try it again.` }

  const rep = dueReps(s.items, now, interviewDate).find(r => byId.has(r.itemId))
  if (rep) return { itemId: rep.itemId, reason: rep.reason }

  const due = dueForReview(s, now).find(d => byId.has(d.itemId))
  if (due) return { itemId: due.itemId, reason: `You solved “${title(due.itemId)}” ${due.daysAgo} days ago. A second look now helps it stick.` }

  const seen = new Set(attempted(s).map(i => i.itemId))
  const firstNew = (pool: PracticeItem[]) => [...pool].filter(i => !seen.has(i.id)).sort((a, b) => a.level - b.level)[0]
  const untouched = coverage(s, tracks).untouched

  for (const target of targets) {
    for (const row of targetNeeds(target.skills, tracks, s).rows) {
      const gap = untouched.find(u => u.track === row.track)
      const pick = gap && firstNew(catalog.filter(i => i.track === gap.track && i.topic === gap.topic))
      if (gap && pick) return { itemId: pick.id, reason: `${target.company} asks for ${row.title}, and you have not touched ${gap.topic} yet.` }
    }
  }

  const attemptsBy = (x: TrackLike) => s.items.filter(i => i.track === x.track).reduce((n, i) => n + i.attempts, 0)
  const least = [...tracks].sort((a, b) => attemptsBy(a) - attemptsBy(b))
  for (const x of least) {
    const pick = firstNew(x.items)
    if (pick) return { itemId: pick.id, reason: attemptsBy(x) === 0 ? `You have not tried ${x.title} yet. This one is a gentle start.` : `${x.title} is the track you have practised least. Here is a new one.` }
  }
  return null
}
