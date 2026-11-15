// Pure logic for "Your plan" and the starting-point check. No React.
import { DIAG, GROUPS } from './diagnostic'
import type { SqlLevelId } from '../curriculum'
import type { Conf } from './diagnostic'

export type NodeState = 'solved' | 'progress' | 'next' | 'todo'
export interface Prog { done: number; total: number }
type Pre = Record<string, string[]>

const solvedP = (p?: Prog) => !!p && (p.total === 0 || p.done >= p.total)

/** First module (in teaching order) that is not finished and whose prerequisites all are. */
export const recommendNext = (ids: string[], pre: Pre, prog: Record<string, Prog>): string | undefined =>
  ids.find(id => !solvedP(prog[id]) && (pre[id] ?? []).every(p => solvedP(prog[p])))

export function nodeState(id: string, next: string | undefined, prog: Record<string, Prog>): NodeState {
  if (solvedP(prog[id])) return 'solved'
  if (id === next) return 'next'
  return (prog[id]?.done ?? 0) > 0 ? 'progress' : 'todo'
}

/** Id of a module that sits on a prerequisite cycle, or null. */
export function findCycle(pre: Pre): string | null {
  const seen = new Map<string, 1 | 2>() // 1 = on the current path, 2 = finished
  const visit = (id: string): string | null => {
    if (seen.get(id) === 2) return null
    if (seen.get(id) === 1) return id
    seen.set(id, 1)
    for (const p of pre[id] ?? []) { const c = visit(p); if (c) return c }
    seen.set(id, 2)
    return null
  }
  for (const id of Object.keys(pre)) { const c = visit(id); if (c) return c }
  return null
}

/** Column of each module: 0 for roots, otherwise one past its deepest prerequisite. Assumes no cycle. */
export function layers(ids: string[], pre: Pre): Record<string, number> {
  const out: Record<string, number> = {}
  const d = (id: string): number => out[id] ?? (out[id] = (pre[id] ?? []).reduce((m, p) => Math.max(m, d(p) + 1), 0))
  ids.forEach(d)
  return out
}

// ---- starting-point check ----
export interface Answer { id: string; pick: number; conf: Conf }
export interface Diagnosis { level: SqlLevelId; modules: string[]; missed: string[]; surprises: string[] }
const ORDER: SqlLevelId[] = ['beginner', 'pro', 'advanced']

/**
 * The level is the first one where something was missed; all right means Advanced.
 * ponytail: one miss decides, no weighting. Add weights if 8 items prove too coarse.
 * Modules come from the missed concept groups, in the curriculum order passed in, at most 3.
 */
export function diagnose(answers: Answer[], moduleOrder: string[]): Diagnosis {
  const wrong = DIAG.filter(q => answers.find(a => a.id === q.id)?.pick !== q.answer)
  const missedGroups = [...new Set(wrong.map(q => q.group))]
  const level = ORDER.find(l => missedGroups.some(g => GROUPS[g].level === l)) ?? 'advanced'
  const want = new Set(missedGroups.flatMap(g => GROUPS[g].modules))
  const modules = (want.size ? moduleOrder.filter(m => want.has(m)) : ['sit-advanced', 'case-subs']).slice(0, 3)
  const sure = wrong.filter(q => { const c = answers.find(a => a.id === q.id)?.conf; return c === 'certain' || c === 'fairly' })
  return { level, modules, missed: missedGroups.map(g => GROUPS[g].label), surprises: [...new Set(sure.map(q => GROUPS[q.group].label))] }
}

const KEY = 'mirror.sql.diag'
export interface Saved { level: SqlLevelId; modules: string[] }
export function loadDiag(): Saved | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return v && ORDER.includes(v.level) && Array.isArray(v.modules) ? { level: v.level, modules: v.modules.filter((m: unknown) => typeof m === 'string') } : null
  } catch { return null }
}
export function saveDiag(s: Saved) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* not remembered */ } }

// ---- plan page ----
/** Reverse of prerequisites: what each module opens up. */
export function unlocks(ids: string[], pre: Pre): Record<string, string[]> {
  const out: Record<string, string[]> = Object.fromEntries(ids.map(id => [id, [] as string[]]))
  for (const id of ids) for (const p of pre[id] ?? []) out[p]?.push(id)
  return out
}

/** Minutes still to go: each module's minutes scaled by the share of problems left. */
export const minutesToGo = (mods: { id: string; minutes: number }[], prog: Record<string, Prog>): number =>
  Math.round(mods.reduce((n, m) => { const p = prog[m.id]; return n + (p && p.total ? m.minutes * (1 - Math.min(p.done, p.total) / p.total) : solvedP(p) ? 0 : m.minutes) }, 0))

/** Counts for the summary strip. progress = started but not finished; the recommended module is counted in `todo`/`progress`, not `solved`. */
export function planSummary(ids: string[], pre: Pre, prog: Record<string, Prog>) {
  const next = recommendNext(ids, pre, prog)
  const solved = ids.filter(id => solvedP(prog[id])).length
  const progress = ids.filter(id => !solvedP(prog[id]) && (prog[id]?.done ?? 0) > 0).length
  return { solved, progress, left: ids.length - solved, next }
}
export const WORD: Record<NodeState, string> = { solved: 'solved', progress: 'in progress', next: 'next up', todo: 'not started' }
