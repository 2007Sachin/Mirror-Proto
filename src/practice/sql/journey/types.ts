// The SQL "journey": one guided, game-like route through everything (replaces the old six-way picker).
// journeyLogic.ts builds a JourneyState from the curriculum and the learner's attempts; JourneyMap.tsx draws it; Path.tsx wires actions.
export type NodeKind = 'placement' | 'module' | 'concepts' | 'boss'
export type NodeStatus = 'done' | 'current' | 'open' // nothing is ever locked; 'current' is the single recommended next step

export interface JourneyNode {
  id: string                 // 'place', 'm:<moduleId>', 'c:<conceptTopic>', 'boss:<preset>'
  kind: NodeKind
  title: string              // short, plain
  blurb: string              // one sentence shown in the node sheet
  minutes: number            // honest total
  moduleId?: string          // kind 'module'
  conceptTopic?: string      // kind 'concepts'
  mockPreset?: 'phone' | 'onsite' | 'senior' | 'concepts' // kind 'boss'
  solved: number             // items solved in this node (0 for placement/boss unless tracked)
  total: number
  stars: 0 | 1 | 2 | 3       // 1 = started and something solved, 2 = everything solved, 3 = everything solved on the first try
  status: NodeStatus
  xp: number                 // XP still on offer in this node
}

export interface JourneyWorld {
  id: string                 // 'foundations' | 'core' | 'staples' | 'advanced'
  title: string              // 'World 1 · Foundations'
  subtitle: string           // one plain line about what this stretch teaches
  badge: string              // badge name earned by finishing the world's modules
  nodes: JourneyNode[]       // in walking order, placement first in world 1, boss last
  done: boolean              // all modules/concept nodes solved
}

export interface JourneyState {
  worlds: JourneyWorld[]
  current: JourneyNode | null
  xp: number
  level: { n: number; title: string; xpIntoLevel: number; xpForNext: number }
  badges: { id: string; title: string; earned: boolean }[]
  quest: { text: string; progress: string; done: boolean }   // today's small goal, e.g. 'Solve a few problems today' with '1 done'
  guide: { mood: 'welcome' | 'cheer' | 'nudge'; text: string; cta: { label: string; nodeId: string } | null }
}
