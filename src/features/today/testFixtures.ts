// Test fixtures shared by buildToday.test.ts and insights.test.ts.
import type { InterviewSession, InterviewSummary, Profile } from '../../lib/api'
import type { GapMatchRow } from '../../lib/data'
import type { TrackLike } from '../../practice/stats'
import type { ItemStat } from '../../practice/types'
import type { TodayInput, TodayTarget } from './types'

export const now = new Date(2026, 10, 10, 19) // Tuesday evening
export const at = (m: number, d: number, h = 9) => new Date(2026, m - 1, d, h).toISOString()
export const empty: TodayInput = { profile: null, coachNote: null, interviews: null, completedSessions: null, summary: null, targets: null, stories: null, retryAttempts: null, tracks: null }
export const tracks: TrackLike[] = [{ track: 'sql', title: 'SQL', topics: ['Joins', 'Aggregation'], items: [
  { id: 'sql-1', track: 'sql', topic: 'Joins', level: 1, title: 'Top customer in each country', minutes: 6 },
  { id: 'sql-2', track: 'sql', topic: 'Aggregation', level: 2, title: 'Orders per month', minutes: 8 },
] }]
export const stat = (id: string, topic: string, hist: [string, boolean][]): ItemStat => ({
  itemId: id, track: 'sql', topic, level: 1, attempts: hist.length, firstTryCorrect: hist[0][1], solved: hist.some(h => h[1]), seconds: 60,
  lastAt: hist[hist.length - 1][0], solvedAt: null, lastCorrect: hist[hist.length - 1][1], history: hist.map(([a, c]) => ({ at: a, correct: c })),
})
export const profile = { role: 'Analyst', firstQuestion: 'Tell me about a dataset you cleaned.', focus: 'Going deeper on “Under CMVR rules we shipped late”' } as Profile
export const progress = { id: 'i1', role: 'Data Analyst', status: 'in_progress', createdAt: at(11, 9), answered: 1, notes: null } as InterviewSummary
export const done = { ...progress, id: 'i0', status: 'completed' } as InterviewSummary
export const match = (rows: [string, 'core' | 'nice', 'covered' | 'partial' | 'gap'][]) => ({
  matches: rows.map(([skill, weight, status]) => ({ skill, weight, status, probeQuestion: null }) as GapMatchRow),
  claims: [], probes: [{ skill: 'Python', quote: null, question: 'How would you clean a messy file with Python?' }], source: 'fallback' as const, aiAttempted: false, hasResume: true,
})
export const target = (interviewDate: string | null, withSkills = true): TodayTarget => ({
  summary: { id: 't1', company: 'Northwind Analytics', role: 'Data Analyst', interviewDate, status: 'ready', nextStep: null, createdAt: at(11, 1) },
  skills: withSkills ? [{ name: 'Python', area: 'python', weight: 'core', quote: '' }] : [],
  match: match([['SQL', 'core', 'covered'], ['Python', 'core', 'gap'], ['Tableau', 'nice', 'partial']]),
})
export const session = (id: string, created: string, answers: string[]): InterviewSession => ({
  id, status: 'completed', createdAt: created, role: 'Analyst',
  turns: answers.map((answer, i) => ({ id: `${id}${i}`, questionIndex: i, question: 'Tell me about a hard project?', answer })),
}) as unknown as InterviewSession
