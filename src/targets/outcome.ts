import type { InterviewSummary } from '../lib/api'

// How the real interview for a job went, written by the candidate. It is never a grade. Kept in this browser only, like every mirror.* key.
export const RESULTS = [
  { id: 'waiting', label: 'It happened and I am waiting to hear' },
  { id: 'offer', label: 'I got an offer' },
  { id: 'not-selected', label: 'I was not selected' },
  { id: 'withdrew', label: 'I withdrew' },
] as const
export type Result = (typeof RESULTS)[number]['id']
export type Outcome = { result: Result | null; note: string }

const KEY = (targetId: string) => `mirror.target.v1.${targetId}.outcome`
const NOTE_MAX = 300
const IDS = RESULTS.map(r => r.id) as string[]

export function loadOutcome(targetId: string): Outcome {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(targetId)) ?? 'null')
    if (v && typeof v === 'object') return { result: IDS.includes(v.result) ? v.result : null, note: typeof v.note === 'string' ? v.note.slice(0, NOTE_MAX) : '' }
  } catch { /* unreadable: start fresh */ }
  return { result: null, note: '' }
}
export function saveOutcome(targetId: string, o: Outcome): void {
  const clean: Outcome = { result: o.result, note: o.note.slice(0, NOTE_MAX) }
  try {
    if (!clean.result && !clean.note) localStorage.removeItem(KEY(targetId))
    else localStorage.setItem(KEY(targetId), JSON.stringify(clean))
  } catch { /* private mode: lasts for this visit */ }
}

const day = (iso: string) => iso.slice(0, 10)
/** The days you practised for one job: how many different days, and the first and last. Null when nothing is tied to it. */
export function practiceDays(rows: Pick<InterviewSummary, 'targetId' | 'createdAt'>[], targetId: string): { days: number; first: string; last: string } | null {
  const mine = rows.filter(r => r.targetId === targetId).map(r => r.createdAt).sort()
  if (mine.length === 0) return null
  return { days: new Set(mine.map(day)).size, first: mine[0], last: mine[mine.length - 1] }
}
