// Pure: the questions for "Explain it out loud", built from the learner's own query and the problem's metadata.
// Nothing here claims anything about the query that the SQL text does not show.
import type { SqlProblem } from '../problems'

export interface ExplainStep { id: 'joins' | 'nulls' | 'ties' | 'followup' | 'walk'; prompt: string; hint?: string }

const JOIN_RE = /\b(?:(left|right|full|inner|cross)(?:\s+outer)?\s+)?join\s+([a-z_][\w.]*)/gi
const FROM_RE = /\bfrom\s+([a-z_][\w.]*)/i
const NULL_RE = /\bnull\b|\bcoalesce\s*\(|\bifnull\s*\(/i
const TIE_EDGE = /\b(ties?|tied|duplicates?|equal)\b/i
const TIE_PATTERN = /rank|top|second|nth|per group|dedup|highest|lowest/i

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

function joinsOf(sql: string): { tables: string[]; kinds: string[] } {
  const tables: string[] = [], kinds: string[] = []
  const first = FROM_RE.exec(sql)?.[1]
  if (first) tables.push(first)
  for (const m of sql.matchAll(JOIN_RE)) {
    const t = m[2]
    if (!tables.some(x => x.toLowerCase() === t.toLowerCase())) tables.push(t)
    const k = (m[1] ?? 'inner').toLowerCase()
    if (!kinds.includes(k)) kinds.push(k)
  }
  return { tables, kinds }
}

export function buildExplainSteps({ problem, sql }: { problem: Pick<SqlProblem, 'pattern' | 'edgeCases' | 'followUp'>; sql: string }): ExplainStep[] {
  const steps: ExplainStep[] = []
  if (!sql.trim()) return [{ id: 'walk', prompt: 'Walk me through your query from FROM to the last clause.' }]
  const edges = problem.edgeCases ?? []

  const { tables, kinds } = joinsOf(sql)
  if (kinds.length) {
    steps.push({
      id: 'joins',
      prompt: `You joined ${list(tables)} with ${kinds.length === 1 ? `${/^[aeiou]/.test(kinds[0]) ? 'an' : 'a'} ${kinds[0]} join` : `${list(kinds)} joins`}. Why that kind of join, and what would change if you swapped it?`,
      hint: 'Think about which rows would be kept or dropped.',
    })
  } else {
    steps.push({ id: 'joins', prompt: 'You did not need a join here. Why not?', hint: 'Say where all the columns you need already live.' })
  }

  if (NULL_RE.test(sql) || edges.some(e => /\bnull/i.test(e))) {
    steps.push({ id: 'nulls', prompt: 'How does your query treat rows where a value is missing (NULL)?', hint: 'Say which clause decides it.' })
  }

  const tieEdge = edges.find(e => TIE_EDGE.test(e))
  if (tieEdge) steps.push({ id: 'ties', prompt: `The question warns: "${tieEdge}" How does your query handle that?` })
  else if (problem.pattern && TIE_PATTERN.test(problem.pattern)) steps.push({ id: 'ties', prompt: 'If two rows tie, which do you keep, and why?' })

  if (problem.followUp?.trim()) steps.push({ id: 'followup', prompt: problem.followUp.trim() })

  return steps.slice(0, 4)
}

