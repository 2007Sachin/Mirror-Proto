import type { JourneyNode, JourneyState, JourneyWorld } from './types'

const n = (id: string, kind: JourneyNode['kind'], title: string, solved: number, total: number, stars: JourneyNode['stars'], status: JourneyNode['status'], xp = 40): JourneyNode =>
  ({ id, kind, title, blurb: `A short, friendly run through ${title.toLowerCase()}.`, minutes: 12, solved, total, stars, status, xp,
    ...(kind === 'boss' ? { mockPreset: 'phone' as const } : {}) })

const worlds: JourneyWorld[] = [
  { id: 'foundations', title: 'World 1 · Foundations', subtitle: 'Read a table and ask it simple questions.', badge: 'Foundations', done: true, nodes: [
    n('place', 'placement', 'Find your level', 0, 0, 0, 'done', 0),
    n('m:select', 'module', 'SELECT basics', 4, 4, 3, 'done', 0),
    n('m:filter', 'module', 'Filtering rows', 4, 4, 2, 'done', 0),
    n('boss:phone', 'boss', 'Phone screen mock', 0, 0, 1, 'done', 0)] },
  { id: 'core', title: 'World 2 · Core', subtitle: 'Join, group and count with confidence.', badge: 'Core', done: false, nodes: [
    n('m:nulls', 'module', 'NULL and missing data', 2, 4, 1, 'current'),
    n('c:joins', 'concepts', 'Join ideas', 0, 5, 0, 'open'),
    n('m:group', 'module', 'Grouping', 1, 6, 1, 'open'),
    n('boss:onsite', 'boss', 'Onsite mock', 0, 0, 0, 'open', 100)] },
  { id: 'staples', title: 'World 3 · Interview staples', subtitle: 'The patterns interviewers love.', badge: 'Staples', done: false, nodes: [
    n('m:window', 'module', 'Window functions', 0, 5, 0, 'open'),
    n('m:cte', 'module', 'CTEs', 0, 4, 0, 'open')] },
  { id: 'advanced', title: 'World 4 · Advanced', subtitle: 'Tune queries and think like a senior.', badge: 'Advanced', done: false, nodes: [
    n('c:perf', 'concepts', 'Performance ideas', 0, 3, 0, 'open'),
    n('boss:senior', 'boss', 'Senior mock', 0, 0, 0, 'open', 150)] },
]

export const sampleState: JourneyState = {
  worlds,
  current: worlds[1].nodes[0],
  xp: 260,
  level: { n: 3, title: 'Analyst', xpIntoLevel: 60, xpForNext: 100 },
  badges: [
    { id: 'foundations', title: 'Foundations', earned: true },
    { id: 'core', title: 'Core', earned: false },
    { id: 'staples', title: 'Staples', earned: false },
    { id: 'advanced', title: 'Advanced', earned: false },
  ],
  quest: { text: 'Solve 3 problems today', progress: '1 of 3', done: false },
  guide: { mood: 'welcome', text: 'Nice start. Two NULL problems left, then you earn the Core badge.', cta: { label: 'Continue', nodeId: 'm:nulls' } },
}
