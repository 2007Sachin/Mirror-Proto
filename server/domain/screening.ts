// Realistic screening call: a neutral, plain interviewer with no hints, no praise and no coaching.
// Pure and deterministic: the same target always gives the same call. No AI, no names (the interviewer is never branded).
import type { InterviewRow } from '../repo/types.js'

export interface ScreenSkill { name: string; weight: 'core' | 'nice'; quote?: string | null }
export interface ScreenTarget {
  /** Seeds the order, so a target gives a stable call. */
  id?: string
  role: string
  company: string
  skills: ScreenSkill[]
  /** Résumé probe questions (from the résumé match). Up to two are used. */
  probes?: string[]
}

export const SCREEN_MIN_QUESTIONS = 5
export const SCREEN_MAX_QUESTIONS = 8
/** An answer already in flight when the clock runs out is still accepted for this long. */
export const SCREEN_GRACE_MS = 20_000

const OPENER = 'Can you tell me about your background and why this role?'
const OWNERSHIP = 'Tell me about something you owned from start to finish. What did you do, and what changed because of it?'
const CLOSER = 'Is there anything about your experience that we have not covered yet?'
const FILLERS = [
  'Describe a time something did not go to plan. What did you do next?',
  'Tell me about a time you explained something technical to someone who was not technical. How did it go?',
  'Tell me about a decision you made with incomplete information. What did you decide?',
  'Tell me about a time you worked with someone who saw a problem differently from you.',
  'Describe a piece of work you are proud of. What was your part in it?',
  'Tell me about a time you had to learn something quickly. How did you go about it?',
]

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function rng(seed: string) {
  let a = hash(seed)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shuffle<T>(list: T[], rand: () => number): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/** A verbatim prefix of the posting's own words, cut at a word boundary. */
function shortQuote(q: string): string {
  const t = q.trim()
  if (t.length <= 160) return t
  const cut = t.slice(0, 160)
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)).trim()
}

function skillQuestion(s: ScreenSkill, variant: number): string {
  const q = s.quote ? shortQuote(s.quote) : ''
  if (q && !q.includes('"')) return `The posting mentions "${q}". Can you walk me through a time you did that?`
  const name = s.name
  return [
    `Tell me about a time you used ${name} at work. What did you do, and what came of it?`,
    `Walk me through a piece of work where ${name} mattered. What was your part?`,
    `Where have you used ${name}, and what was the outcome?`,
  ][variant % 3]
}

const valid = (q: string) => q.length >= 8 && q.length <= 300 && q.endsWith('?')

export function buildScreeningQuestions(target: ScreenTarget, count: number): string[] {
  const n = Math.min(SCREEN_MAX_QUESTIONS, Math.max(SCREEN_MIN_QUESTIONS, Math.round(count) || SCREEN_MIN_QUESTIONS))
  const rand = rng(target.id ?? `${target.company}|${target.role}`)
  const seen = new Set<string>()
  const take = (q: string) => (valid(q) && !seen.has(q.toLowerCase()) ? (seen.add(q.toLowerCase()), true) : false)

  const probes = (target.probes ?? []).map(p => p.trim()).filter(valid).slice(0, 2)
  const core = shuffle(target.skills.filter(s => s.weight === 'core'), rand)
  const nice = shuffle(target.skills.filter(s => s.weight !== 'core'), rand)
  const middle = n - 2

  const out: string[] = []
  for (const p of probes) if (out.length < middle - 1 && take(p)) out.push(p)
  const skillQs: string[] = []
  for (const s of [...core, ...nice]) {
    if (out.length + skillQs.length >= middle - 1) break
    const q = skillQuestion(s, Math.floor(rand() * 3))
    if (take(q)) skillQs.push(q)
  }
  const pool = shuffle(FILLERS, rand)
  while (out.length + skillQs.length < middle - 1 && pool.length) { const f = pool.shift()!; if (take(f)) skillQs.push(f) }

  // Skill questions first, the ownership question after the first of them, then any résumé probes.
  const body = [...skillQs.slice(0, 1), OWNERSHIP, ...skillQs.slice(1), ...out]
  return [OPENER, ...body.slice(0, middle), CLOSER]
}

/** Seconds left on a screen's clock; null for anything that is not a timed screen. */
export function screenSecondsLeft(i: Pick<InterviewRow, 'kind' | 'startedAt' | 'timeCapSeconds'>, nowMs: number): number | null {
  if (i.kind !== 'screen' || !i.startedAt || !i.timeCapSeconds) return null
  return Math.ceil((Date.parse(i.startedAt) + i.timeCapSeconds * 1000 - nowMs) / 1000)
}
/** True once the cap and the grace for an answer already in flight are both used up. */
export const screenTimeUp = (i: Pick<InterviewRow, 'kind' | 'startedAt' | 'timeCapSeconds'>, nowMs: number): boolean => {
  const left = screenSecondsLeft(i, nowMs)
  return left !== null && left * 1000 < -SCREEN_GRACE_MS
}
