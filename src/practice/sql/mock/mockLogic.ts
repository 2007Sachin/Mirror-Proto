// Pure helpers for the timed mock test: presets, deterministic question choice, results counts, revisit list, clock.
// No React and no data imports: callers pass the problem and concept lists in.
// Owner's request: "build it in our database and for mock test".
export type Lv = 1 | 2 | 3
export interface Cand { id: string; topic: string; level: Lv; pattern?: string }
export type Kind = 'sql' | 'concept'
export interface MockPreset { id: string; name: string; minutes: number; sql: Lv[]; concepts: Lv[]; spoken?: boolean } // one entry per question slot = wanted level
export interface MockItem { id: string; kind: Kind }
export interface MockTestDef { presetId: string; name: string; minutes: number; items: MockItem[]; spoken?: boolean }

const LV = ['', 'Beginner', 'Pro', 'Advanced']
export const PRESETS: MockPreset[] = [
  { id: 'phone', name: 'Phone screen', minutes: 30, sql: [1, 2, 2], concepts: [] },
  { id: 'analyst', name: 'Analyst onsite', minutes: 45, sql: [2, 2, 3, 3], concepts: [1, 2, 2, 3] },
  { id: 'senior', name: 'Senior loop', minutes: 60, sql: [2, 3, 3, 3], concepts: [2, 2, 3, 3] },
  { id: 'concepts', name: 'Concepts round', minutes: 15, sql: [], concepts: [1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3] },
]

export interface Custom { count: number; minutes: number; concepts: boolean; difficulty: 0 | 1 | 2 | 3; spoken?: boolean }
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(n) ? n : lo)))

/** Build-your-own: count 2-8, minutes 10-90. With concepts on, a third of the questions are concept questions. */
export function customPreset(c: Custom): MockPreset {
  const count = clamp(c.count, 2, 8), minutes = clamp(c.minutes, 10, 90)
  const nc = c.concepts ? Math.floor(count / 3) : 0
  const ramp = (n: number): Lv[] => Array.from({ length: n }, (_, i) => (c.difficulty || (n < 2 ? 2 : 1 + Math.min(2, Math.floor((i * 3) / n)))) as Lv)
  return { id: 'custom', name: 'Your own test', minutes, sql: ramp(count - nc), concepts: ramp(nc), ...(c.spoken ? { spoken: true } : {}) }
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
const mixWords = (slots: Lv[]) => [1, 2, 3].map(l => ({ l, n: slots.filter(s => s === l).length })).filter(x => x.n).map(x => `${x.n} ${LV[x.l]}`).join(' + ')

/** Plain words for a preset card. */
export function describe(p: MockPreset): string {
  const parts: string[] = []
  if (p.sql.length) parts.push(`${plural(p.sql.length, 'SQL question')} (${mixWords(p.sql)})`)
  if (p.concepts.length) parts.push(plural(p.concepts.length, 'concept question'))
  return `${parts.join(' and ')}. ${p.minutes} minutes.${p.spoken ? ' You will explain each answer out loud afterwards.' : ''}`
}

/** Small seeded generator (mulberry32): same seed, same numbers. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function choose(pool: Cand[], want: Lv, used: Set<string>, topics: Set<string>, patterns: Set<string>, solved: Set<string>, rnd: () => number): Cand | undefined {
  // ponytail: weighted cost, not a full optimiser: a repeated topic costs more than a solved one, which costs more than a level step.
  const cost = (c: Cand) => Math.abs(c.level - want) * 4 + (topics.has(c.topic) ? 6 : 0) + (solved.has(c.id) ? 3 : 0) + (c.pattern && patterns.has(c.pattern) ? 1 : 0)
  const free = pool.filter(c => !used.has(c.id))
  if (!free.length) return undefined
  const best = Math.min(...free.map(cost))
  const tied = free.filter(c => cost(c) === best)
  return tied[Math.floor(rnd() * tied.length)]
}

function pickSet(pool: Cand[], slots: Lv[], solved: Set<string>, rnd: () => number): Cand[] {
  const used = new Set<string>(), topics = new Set<string>(), patterns = new Set<string>(), out: Cand[] = []
  for (const want of slots) {
    const c = choose(pool, want, used, topics, patterns, solved, rnd)
    if (!c) break
    used.add(c.id); topics.add(c.topic); if (c.pattern) patterns.add(c.pattern)
    out.push(c)
  }
  return out.sort((a, b) => a.level - b.level) // easy -> hard (stable)
}

/** Deterministic from the seed. SQL first, then concepts; each group easy to hard. */
export function buildMock(preset: MockPreset, problems: Cand[], concepts: Cand[], solvedIds: Set<string>, seed: number): MockTestDef {
  const rnd = rng(seed)
  const sql = pickSet(problems, preset.sql, solvedIds, rnd)
  const con = pickSet(concepts, preset.concepts, solvedIds, rnd)
  return { presetId: preset.id, name: preset.name, minutes: preset.minutes, items: [...sql.map(c => ({ id: c.id, kind: 'sql' as Kind })), ...con.map(c => ({ id: c.id, kind: 'concept' as Kind }))], ...(preset.spoken ? { spoken: true } : {}) }
}

// ---- results ----
export interface QResult { id: string; kind: Kind; title: string; topic: string; pattern?: string; moduleId?: string; tries: number; solved: boolean; first: boolean; seconds: number }
export type Outcome = 'Solved first try' | 'Solved' | 'Not yet' | 'Skipped'
export const outcome = (r: QResult): Outcome => (r.solved ? (r.first ? 'Solved first try' : 'Solved') : r.tries > 0 ? 'Not yet' : 'Skipped')

/** Counts only. `solved` means the last submitted answer was right. */
export function summarise(results: QResult[], usedSeconds: number, allowedSeconds: number) {
  const o = results.map(outcome)
  return {
    total: results.length,
    firstTry: o.filter(x => x === 'Solved first try').length,
    afterRetries: o.filter(x => x === 'Solved').length,
    notSolved: o.filter(x => x === 'Not yet').length,
    skipped: o.filter(x => x === 'Skipped').length,
    usedSeconds, allowedSeconds,
    perQuestion: results.map(r => ({ id: r.id, seconds: r.seconds })),
  }
}

export interface Revisit { key: string; topic: string; moduleId?: string; why: 'Not solved' | 'Took the longest' }
/** Topics/modules to look at again: everything not solved, plus up to two of the slowest solved (at least a minute). No scores. */
export function revisit(results: QResult[]): Revisit[] {
  const out: Revisit[] = []
  const add = (r: QResult, why: Revisit['why']) => {
    const key = r.moduleId ?? r.topic
    if (!out.some(x => x.key === key)) out.push({ key, topic: r.topic, moduleId: r.moduleId, why })
  }
  results.filter(r => !r.solved).forEach(r => add(r, 'Not solved'))
  results.filter(r => r.solved && r.seconds >= 60).sort((a, b) => b.seconds - a.seconds).slice(0, 2).forEach(r => add(r, 'Took the longest'))
  return out
}

// ---- clock: store startedAt + deadline, never a running counter ----
export const makeClock = (minutes: number, now: number) => ({ startedAt: now, deadline: now + minutes * 60000 })
/** Clamped to the test length, so a clock moved backwards cannot give extra time. */
export const remainingMs = (startedAt: number, deadline: number, now: number) => Math.max(0, Math.min(deadline - now, deadline - startedAt))
export function clockText(ms: number): string {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
/** Smallest of 10/5/1 minutes that the remaining time has reached, only if it is shorter than the whole test; else null. */
export function milestone(remaining: number, totalMs: number): 10 | 5 | 1 | null {
  for (const m of [1, 5, 10] as const) if (remaining <= m * 60000 && m * 60000 < totalMs) return m
  return null
}
