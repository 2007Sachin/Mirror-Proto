import { BANK, COMPETENCIES, suitsRole } from './bank.js'
import { isRepeat, normalise } from './guard.js'
import type { Candidate, RoomState } from './types.js'

const MIN = 3
const MAX = 5
const WANT = 4

/** The question a gap candidate asks: the résumé match's probe when it made one. */
function gapText(skill: string, probe: string | null): string {
  return probe ?? `Tell me about a time you used ${skill}. What was your part in it?`
}

/**
 * 3 to 5 questions the interviewer may choose from, never a repeat:
 * target gaps first (core before nice), then a story theme the user has no story for, then bank questions for the role.
 */
export function buildCandidates(state: RoomState): Candidate[] {
  const out: Candidate[] = []
  const taken = (text: string) => isRepeat(text, [...state.asked, ...out.map(c => c.text)], state.history)
  const add = (c: Candidate): boolean => {
    if (out.length >= MAX || taken(c.text)) return false
    out.push(c)
    return true
  }

  const covered = new Set(state.covered.map(s => s.toLowerCase()))
  const open = state.gaps
    .filter(g => !covered.has(g.skill.toLowerCase()))
    .sort((a, b) => (a.weight === b.weight ? 0 : a.weight === 'core' ? -1 : 1))
  for (const g of open.slice(0, 3)) add({ id: `gap-${normalise(g.skill).replace(/\s+/g, '-')}`, text: gapText(g.skill, g.probeQuestion), source: 'gap', skill: g.skill })

  const fresh = BANK.filter(q => suitsRole(q, state.role) && !isRepeat(q.text, state.asked, state.history))

  // ponytail: a theme counts as covered when a story theme contains the competency's first word; a real tag match if themes get structured.
  const themes = state.storyThemes.map(t => t.toLowerCase())
  if (themes.length) {
    const missing = COMPETENCIES.find(c => !themes.some(t => t.includes(c.split(' ')[0].toLowerCase())) && fresh.some(q => q.competency === c))
    const q = fresh.find(b => b.competency === missing)
    if (q) add({ id: q.id, text: q.text, source: 'story', competency: q.competency })
  }

  for (const q of fresh) {
    if (out.length >= WANT) break
    add({ id: q.id, text: q.text, source: 'bank', competency: q.competency })
  }
  // The bank is nearly spent: pad with anything not asked word for word, so there are still three to choose from.
  for (const q of BANK) {
    if (out.length >= MIN) break
    if (suitsRole(q, state.role) && !out.some(c => c.id === q.id) && ![...state.asked, ...state.history].some(a => normalise(a) === normalise(q.text))) {
      out.push({ id: q.id, text: q.text, source: 'bank', competency: q.competency })
    }
  }
  return out
}
