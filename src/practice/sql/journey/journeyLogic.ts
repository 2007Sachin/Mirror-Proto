// Pure logic for the SQL journey: turns the curriculum + the learner's attempts into one guided route.
// Callers: journey/JourneyMap.tsx (draws it) and Path.tsx (wires actions). No Date.now, no storage.
import type { SqlModule } from '../curriculum'
import type { ConceptQuestion } from '../concepts/types'
import type { DayStat, ItemStat } from '../../types'
import type { JourneyNode, JourneyState, JourneyWorld } from './types'

export interface JourneyInput {
  modules: SqlModule[]
  problems: { id: string; topic: string; level: 1 | 2 | 3 }[]
  concepts: ConceptQuestion[]
  items: ItemStat[]          // attempts so far for the SQL track
  days: DayStat[]
  todayISO: string           // YYYY-MM-DD
  placementDone: boolean
}

const WORLD_DEFS = [
  { id: 'foundations', title: 'World 1 · Foundations', subtitle: 'Read tables, filter rows, handle NULLs, summarise and join once.', badge: 'Query Cartographer', boss: 'phone' as const },
  { id: 'core', title: 'World 2 · Core patterns', subtitle: 'Joins that repeat rows, subqueries, CTEs, conditional counts and set operations.', badge: 'Join Whisperer', boss: 'onsite' as const },
  { id: 'staples', title: 'World 3 · Interview staples', subtitle: 'Window functions, top-N, percentiles and rows that overlap.', badge: 'Window Wizard', boss: 'concepts' as const },
  { id: 'advanced', title: 'World 4 · Senior patterns', subtitle: 'Runs, sessions, cohorts, funnels, recursion and trends.', badge: 'Interview Ready', boss: 'senior' as const },
]
const BOSS = {
  phone: { title: 'Phone screen', blurb: 'A 30-minute mock phone screen: 3 questions, no hints.', minutes: 30 },
  onsite: { title: 'Onsite round', blurb: 'A 45-minute mock onsite: SQL and concept questions mixed.', minutes: 45 },
  concepts: { title: 'Concepts round', blurb: 'A quick 15-minute round of interview concept questions.', minutes: 15 },
  senior: { title: 'Senior loop', blurb: 'A 60-minute mock senior loop: harder SQL and concepts.', minutes: 60 },
}
// Module id prefix -> world index. ponytail: a module not listed falls back to its level, so new modules never break the route.
const MODULE_WORLD: Record<string, number> = {
  'p7-': 1, 'p8-': 1, 'p9-': 1, 'p11-': 1, 'p12-': 1,
  'p10-': 2, 'p13-': 2, 'p14-': 2, 'p15-': 2,
}
const LEVEL_WORLD = { beginner: 0, pro: 1, advanced: 3 } as const
const CONCEPT_WORLD: Record<string, number> = {
  'SQL commands and data types': 0, 'Keys and constraints': 0, 'Joins, sets and NULL': 1,
  'Indexes and performance': 2, 'Normalisation and design': 2, 'Transactions and ACID': 3,
}
const CONCEPT_BLURB: Record<string, string> = {
  'SQL commands and data types': 'Which command does what, and which column type fits the data.',
  'Keys and constraints': 'Primary and foreign keys, and the rules that keep rows clean.',
  'Joins, sets and NULL': 'How joins, set operations and NULL change the rows you get back.',
  'Indexes and performance': 'What an index speeds up, what it costs, and why a query is slow.',
  'Normalisation and design': 'How to split tables so each fact lives in one place.',
  'Transactions and ACID': 'What a transaction promises when things go wrong halfway.',
}
const REASON: Record<string, string> = { 'm:b3-nulls': 'NULLs trip up almost every screen, so we start there.' }

const LEVEL_XP = [0, 100, 250, 500, 900, 1500, 2400, 3600]
const LEVEL_TITLE = ['Rookie', 'Query Cadet', 'Analyst', 'Senior Analyst', 'Data Detective', 'Interview Ready', 'Staff', 'Principal']
const PLACEMENT_XP = 20
const QUEST_GOAL = 3

const sqlXp = (level: number) => 10 * level
const conceptXp = (level: number) => 5 * level

export function buildJourney(input: JourneyInput): JourneyState {
  const stat = new Map(input.items.map(i => [i.itemId, i]))
  const levelOf = new Map<string, { base: number; bonus: number }>()
  input.problems.forEach(p => levelOf.set(p.id, { base: sqlXp(p.level), bonus: 5 }))
  input.concepts.forEach(c => levelOf.set(c.id, { base: conceptXp(c.level), bonus: 3 }))

  // XP earned so far, and XP still on offer for a set of item ids.
  let earned = input.placementDone ? PLACEMENT_XP : 0
  stat.forEach((s, id) => {
    const v = levelOf.get(id)
    if (v && s.solved) earned += v.base + (s.firstTryCorrect ? v.bonus : 0)
  })
  const offer = (ids: string[]) => ids.reduce((n, id) => {
    const v = levelOf.get(id)
    return n + (v && !stat.get(id)?.solved ? v.base + v.bonus : 0)
  }, 0)

  const itemNode = (base: Pick<JourneyNode, 'id' | 'kind' | 'title' | 'blurb' | 'minutes'> & Partial<JourneyNode>, ids: string[]): JourneyNode => {
    const got = ids.filter(id => stat.get(id)?.solved)
    const solved = got.length
    const all = ids.length > 0 && solved === ids.length
    const stars = (all ? (got.every(id => stat.get(id)?.firstTryCorrect) ? 3 : 2) : solved > 0 ? 1 : 0) as 0 | 1 | 2 | 3
    return { ...base, solved, total: ids.length, stars, status: all ? 'done' : 'open', xp: offer(ids) }
  }

  const buckets: JourneyNode[][] = WORLD_DEFS.map(() => [])
  input.modules.filter(m => m.kind !== 'situation' && m.kind !== 'case' && !/^(sit|case)-/.test(m.id)).forEach(m => {
    const prefix = Object.keys(MODULE_WORLD).find(p => m.id.startsWith(p))
    const w = prefix ? MODULE_WORLD[prefix] : LEVEL_WORLD[m.level]
    buckets[w].push(itemNode({ id: `m:${m.id}`, kind: 'module', title: m.title, blurb: m.blurb, minutes: m.minutes, moduleId: m.id }, m.problemIds))
  })
  const topics = [...new Set(input.concepts.map(c => c.topic))]
  topics.forEach(t => {
    const qs = input.concepts.filter(c => c.topic === t)
    // ponytail: an unknown concept topic lands in World 3; add it to CONCEPT_WORLD to place it elsewhere.
    buckets[CONCEPT_WORLD[t] ?? 2].push(itemNode({
      id: `c:${t}`, kind: 'concepts', title: t, blurb: CONCEPT_BLURB[t] ?? 'A few interview questions you answer by explaining.',
      minutes: Math.max(1, Math.round(qs.length * 1.5)), conceptTopic: t,
    }, qs.map(q => q.id)))
  })

  const worlds: JourneyWorld[] = WORLD_DEFS.map((d, i) => {
    const nodes = buckets[i]
    const done = nodes.length > 0 && nodes.every(n => n.status === 'done')
    const b = BOSS[d.boss]
    const boss: JourneyNode = { id: `boss:${d.boss}`, kind: 'boss', title: b.title, blurb: b.blurb, minutes: b.minutes, mockPreset: d.boss, solved: 0, total: 0, stars: 0, status: 'open', xp: 50 }
    const place: JourneyNode[] = i === 0 ? [{
      id: 'place', kind: 'placement', title: 'Find your level', blurb: 'Eight quick questions place you on the route', minutes: 8,
      solved: 0, total: 0, stars: 0, status: input.placementDone ? 'done' : 'open', xp: input.placementDone ? 0 : PLACEMENT_XP,
    }] : []
    return { id: d.id, title: d.title, subtitle: d.subtitle, badge: d.badge, nodes: [...place, ...nodes, boss], done }
  })

  // Exactly one 'current': the first unfinished module/concept/placement node in walking order.
  // ponytail: bosses never become 'current' (they cannot be "done"), so the route always moves on; the guide suggests a mock test at the end.
  const current = worlds.flatMap(w => w.nodes).find(n => n.kind !== 'boss' && n.status !== 'done') ?? null
  if (current) current.status = 'current'

  const level = (() => {
    let i = LEVEL_XP.length - 1
    while (LEVEL_XP[i] > earned) i--
    return { n: i + 1, title: LEVEL_TITLE[i], xpIntoLevel: earned - LEVEL_XP[i], xpForNext: i + 1 < LEVEL_XP.length ? LEVEL_XP[i + 1] - LEVEL_XP[i] : 0 }
  })()

  const solvedItems = input.items.filter(i => i.solved && levelOf.has(i.itemId))
  const conceptIds = new Set(input.concepts.map(c => c.id))
  const badges = [
    ...worlds.map(w => ({ id: `world:${w.id}`, title: w.badge, earned: w.done })),
    { id: 'first-solve', title: 'First solve', earned: solvedItems.length > 0 },
    { id: 'ten-solved', title: 'Ten solved', earned: solvedItems.length >= 10 },
    { id: 'concept-starter', title: 'Concept starter', earned: solvedItems.some(i => conceptIds.has(i.itemId)) },
    { id: 'phone-ready', title: 'Phone screen ready', earned: worlds[0].done },
  ]

  // Quest: solved today by solvedAt; ponytail: if that is empty, fall back to today's attempts from DayStat (they include wrong tries).
  const solvedToday = input.items.filter(i => i.solvedAt?.slice(0, 10) === input.todayISO).length
  const n = solvedToday || (input.days.find(d => d.date === input.todayISO)?.attempts ?? 0)
  const quest = { text: `Solve ${QUEST_GOAL} problems today`, progress: `${Math.min(n, QUEST_GOAL)} of ${QUEST_GOAL}`, done: n >= QUEST_GOAL }

  return { worlds, current, xp: earned, level, badges, quest, guide: coach(input, worlds, current, quest.done, solvedItems) }
}

function coach(input: JourneyInput, worlds: JourneyWorld[], current: JourneyNode | null, questDone: boolean, solvedItems: ItemStat[]): JourneyState['guide'] {
  if (!input.placementDone && input.items.length === 0) {
    return { mood: 'welcome', text: 'Welcome. Eight quick questions will place you on the route, so we start in the right spot.', cta: { label: 'Find my level', nodeId: 'place' } }
  }
  if (!current) {
    return { mood: 'cheer', text: 'You have walked the whole route. Nice work. A full mock test is the best way to check it all holds together.', cta: null }
  }
  const lastSolved = [...solvedItems].sort((a, b) => (b.solvedAt ?? '').localeCompare(a.solvedAt ?? ''))[0]
  const lastWrong = input.items.filter(i => i.attempts > 0 && !i.solved).sort((a, b) => b.lastAt.localeCompare(a.lastAt))[0]

  // Did the latest solve finish a world we have now moved past?
  const solvedWorld = lastSolved && worlds.find(w => w.nodes.some(n => (n.moduleId && input.modules.find(m => m.id === n.moduleId)?.problemIds.includes(lastSolved.itemId)) || (n.conceptTopic && input.concepts.some(c => c.id === lastSolved.itemId && c.topic === n.conceptTopic))))
  const worldFinished = !!solvedWorld?.done && !solvedWorld.nodes.some(n => n.id === current.id)
  const threeStar = worlds.some(w => w.nodes.some(n => n.stars === 3)) && !!lastSolved?.firstTryCorrect
  const mood: 'cheer' | 'nudge' = worldFinished || questDone || threeStar ? 'cheer' : 'nudge'

  // Join whole sentences: each trimmed, ends with one full stop, and the "tricky" line appears at most once.
  const stop = (t: string) => { const x = t.trim(); return /[.!?]$/.test(x) ? x : `${x}.` }
  const parts = [
    worldFinished ? `${solvedWorld!.badge} unlocked` : questDone ? "Today's goal is done" : '',
    `Next up is ${current.title}`,
    REASON[current.id] ?? current.blurb,
    lastWrong?.topic && lastWrong.attempts > 0 ? `${lastWrong.topic} looked tricky last time, a quick replay will help` : '',
  ].filter(Boolean).map(stop)
  return {
    mood,
    text: [...new Set(parts)].join(' '),
    cta: { label: current.solved === 0 ? 'Start' : 'Continue', nodeId: current.id },
  }
}
