// Fixtures for the Today tests (Today.test.tsx, copy.test.tsx). They are TodayData: the input and the per-section status
// that useTodayData() returns. buildToday() runs for real on top of them. NOW is the fixed clock the tests set.
import type { TodayData, TodayInput, TodayStatus } from '../features/today/types'
import type { Profile } from '../lib/api'

export const NOW = new Date('2026-11-16T18:00:00Z')
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString()
const ymd = (n: number) => day(n).slice(0, 10)

export const ready: TodayStatus = { hero: 'ready', comingUp: 'ready', since: 'ready', replays: 'ready', stories: 'ready' }

export const profile: Profile = {
  role: 'Data analyst', story: 'I built a weekly sales dashboard.', pressureQuestion: 'Why did you pick that metric?', pressureAnswer: 'It matched how the team decided.',
  summary: 'Clear on the what, lighter on how it ended.', focus: 'Finishing the story: what you did and how it ended',
  firstQuestion: 'Tell me about a project you are proud of.', resumeText: 'Analyst at a retail firm.', resumeName: 'resume.pdf', mode: 'text',
}

const sqlItem = { id: 'sql-joins-1', track: 'sql' as const, topic: 'Joins', level: 1 as const, title: 'Orders without a customer', minutes: 6 }
const sqlItem2 = { id: 'sql-window-1', track: 'sql' as const, topic: 'Window functions', level: 2 as const, title: 'Top customer in each country', minutes: 10 }
export const tracks = [{ track: 'sql' as const, title: 'SQL', topics: ['Joins', 'Window functions'], items: [sqlItem, sqlItem2] }]

const match = (skill: string, status: 'covered' | 'partial' | 'gap', weight: 'core' | 'nice' = 'core') => ({
  id: skill, workspaceId: 'w', createdAt: day(-3), targetId: 't1', skill, area: 'sql', weight, status,
  claimQuote: null, note: '', probeQuestion: status === 'gap' ? `How would you use ${skill} on a real dataset?` : null, source: 'fallback' as const,
})

const target = {
  summary: { id: 't1', company: 'Northwind Analytics', role: 'Senior Data Analyst', interviewDate: ymd(10), status: 'ready' as const, nextStep: null, createdAt: day(-5) },
  skills: [
    { name: 'SQL joins', area: 'sql' as const, weight: 'core' as const, quote: '' },
    { name: 'Window functions', area: 'sql' as const, weight: 'core' as const, quote: '' },
    { name: 'Stakeholder conflict', area: 'behavioural' as const, weight: 'nice' as const, quote: '' },
    { name: 'Experiment design', area: 'analytics' as const, weight: 'nice' as const, quote: '' },
  ],
  match: {
    matches: [match('SQL joins', 'covered'), match('Experiment design', 'partial', 'nice'), match('Window functions', 'gap'), match('Stakeholder conflict', 'gap', 'nice')],
    claims: [], probes: [], source: 'fallback' as const, aiAttempted: false, hasResume: true,
  },
}

/** A returning user: a target with a date, covered/partial/gap, history with a miss then a solve, stories, retries, a coach note. */
export const rich: TodayData = {
  status: ready,
  input: {
    profile,
    coachNote: { observation: 'Your last answer opened with a clear result.', nextPractice: 'Finish with how it ended.', practiceQuestion: 'Tell me about a time a plan changed late.', basedOn: 'interview', source: 'fallback' },
    interviews: [{ id: 'i1', role: 'Data analyst', status: 'completed', createdAt: day(-2), answered: 4, notes: { keepWorkingOn: 'Say what happened in the end.', quotes: [], source: 'fallback' } }],
    completedSessions: [],
    summary: {
      items: [
        { itemId: sqlItem.id, track: 'sql', topic: 'Joins', level: 1, attempts: 2, firstTryCorrect: false, solved: true, seconds: 400, lastAt: day(-3), solvedAt: day(-3), lastCorrect: true, history: [{ at: day(-4), correct: false }, { at: day(-3), correct: true }] },
        { itemId: sqlItem2.id, track: 'sql', topic: 'Window functions', level: 2, attempts: 1, firstTryCorrect: false, solved: false, seconds: 300, lastAt: day(-2), solvedAt: null, lastCorrect: false, history: [{ at: day(-2), correct: false }] },
      ],
      days: [{ date: ymd(-2), attempts: 1, seconds: 300 }, { date: ymd(-3), attempts: 1, seconds: 400 }],
    },
    targets: [target],
    stories: [{ id: 's1', workspaceId: 'w', createdAt: day(-9), updatedAt: day(-9), title: 'Dashboard rescue', themes: ['ownership', 'data-driven'], situation: 'a', task: 'b', action: 'c', result: 'd', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null }],
    retryAttempts: [
      { id: 'a1', workspaceId: 'w', createdAt: day(-6), interviewId: 'i1', questionIndex: 0, question: 'Tell me about a project you are proud of.', attempt: 1, answer: 'We built it and it was fine.', kind: 'retry', transcriptSource: 'text' },
      { id: 'a2', workspaceId: 'w', createdAt: day(-3), interviewId: 'i1', questionIndex: 0, question: 'Tell me about a project you are proud of.', attempt: 2, answer: 'I built the dashboard, then sales sped up the weekly review because of it.', kind: 'retry', transcriptSource: 'text' },
    ],
    tracks,
  } satisfies TodayInput,
}

/** No interview, no attempts, no target, no story. The coach note is a 404 (null). */
export const newUser: TodayData = {
  status: ready,
  input: { profile: { ...profile, focus: '' }, coachNote: null, interviews: [], completedSessions: [], summary: { items: [], days: [] }, targets: [], stories: [], retryAttempts: [], tracks },
}

export const withStatus = (d: TodayData, status: Partial<TodayStatus>): TodayData => ({ ...d, status: { ...d.status, ...status } })
