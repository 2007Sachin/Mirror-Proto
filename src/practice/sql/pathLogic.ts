import { userKey } from '../../lib/data'
// Pure helpers for the SQL path: progress counting, "continue here", and the custom queue. No React, no data imports.
export interface ModuleLike { id: string; problemIds: string[] }
export interface ProblemLike { id: string; topic: string; level: 1 | 2 | 3 }

export const solvedSet = (stats: { itemId: string; solved: boolean }[]): Set<string> =>
  new Set(stats.filter(s => s.solved).map(s => s.itemId))

export const moduleProgress = (m: ModuleLike, solved: Set<string>) => {
  const done = m.problemIds.filter(id => solved.has(id)).length
  return { done, total: m.problemIds.length }
}

/** First module (in the given order) that still has an unsolved problem. */
export const nextUnsolvedModule = <M extends ModuleLike>(mods: M[], solved: Set<string>): M | undefined =>
  mods.find(m => m.problemIds.some(id => !solved.has(id)))

/** Problems of a module still to do, in teaching order. */
export const unsolvedIds = (m: ModuleLike, solved: Set<string>): string[] => m.problemIds.filter(id => !solved.has(id))

export interface QueueOpts {
  topics: string[]          // empty = any topic
  level: 0 | 1 | 2 | 3      // 0 = any
  count: number
  solved: Set<string>
}

/** Matching problems, unsolved first, then easy to hard; the picked set is shown easy to hard. */
export function buildQueue<P extends ProblemLike>(all: P[], o: QueueOpts): P[] {
  const match = all.filter(p => (!o.topics.length || o.topics.includes(p.topic)) && (!o.level || p.level === o.level))
  // ponytail: stable sort keeps problems.ts order within a level; no shuffling, so the same picks give the same queue
  const pick = [...match].sort((a, b) => Number(o.solved.has(a.id)) - Number(o.solved.has(b.id)) || a.level - b.level).slice(0, o.count)
  return pick.sort((a, b) => a.level - b.level)
}

export interface RunResult { tries: number; solved: boolean; first: boolean }

/** Record one submitted answer into a run's result map (immutably). */
export function noteAttempt(res: Record<string, RunResult>, id: string, correct: boolean): Record<string, RunResult> {
  const prev = res[id] ?? { tries: 0, solved: false, first: false }
  const tries = prev.tries + 1
  return { ...res, [id]: { tries, solved: prev.solved || correct, first: prev.first || (correct && tries === 1) } }
}

/** Counts only: solved, solved on the first try, not yet (queue items without a solved answer). */
export function summarize(queueIds: string[], res: Record<string, RunResult>) {
  const solved = queueIds.filter(id => res[id]?.solved).length
  const first = queueIds.filter(id => res[id]?.first).length
  return { solved, first, notYet: queueIds.length - solved }
}

export const minutesLeft = (deadline: number, now: number) => Math.max(0, Math.ceil((deadline - now) / 60000))

// ---- three-tab screen ----
export type Tab = 'journey' | 'free' | 'mock'
export const TABS: { id: Tab; title: string }[] = [{ id: 'journey', title: 'Journey' }, { id: 'free', title: 'Free practice' }, { id: 'mock', title: 'Mock tests' }]
export const parseTab = (v: unknown): Tab => (TABS.some(t => t.id === v) ? (v as Tab) : 'journey')
/** The journey names the boss preset 'onsite'; the mock test calls the same round 'analyst'. */
export const mockPresetId = (p: 'phone' | 'onsite' | 'senior' | 'concepts') => (p === 'onsite' ? 'analyst' : p)

interface Sectioned { id: string; level: string; kind?: 'module' | 'situation' | 'case' }
/** Free practice sections: plain modules grouped by level (in the order given), plus the situation and case-study modules. */
export function freeSections<M extends Sectioned>(mods: M[], levelOrder: string[]) {
  const plain = mods.filter(m => !m.kind || m.kind === 'module')
  return {
    groups: levelOrder.map(level => ({ level, mods: plain.filter(m => m.level === level) })).filter(g => g.mods.length > 0),
    stories: mods.filter(m => m.kind === 'situation' || m.kind === 'case'),
  }
}

const TAB_KEY = 'sql.path.tab'
const PLACED_KEY = 'sql.path.placed'
const read = (k: string) => { try { const key = userKey(k); return key ? localStorage.getItem(key) : null } catch { return null } }
const write = (k: string, v: string) => { try { const key = userKey(k); if (key) localStorage.setItem(key, v) } catch { /* not remembered */ } }
export const loadTab = (): Tab => parseTab(read(TAB_KEY))
export const saveTab = (t: Tab) => write(TAB_KEY, t)
export const loadPlaced = (): boolean => read(PLACED_KEY) === '1'
export const savePlaced = () => write(PLACED_KEY, '1')
