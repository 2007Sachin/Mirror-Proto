import type { EvidenceItem, Reflection } from '../../lib/api'

export type Level = NonNullable<EvidenceItem['level']>
export const LEVEL: Record<Level, { word: string; rank: number }> = {
  starting: { word: 'Just starting', rank: 0 },
  clear: { word: 'Clear', rank: 1 },
  strong: { word: 'Strong', rank: 2 },
}
export const DIMENSION: Record<string, { label: string; means: string }> = {
  structure: { label: 'Structure', means: 'A clear situation, what you did, and how it ended.' },
  specificity: { label: 'Specificity', means: 'Concrete details: what, where, with whom, which tool.' },
  ownership: { label: 'Ownership', means: 'What you personally did and decided, not only what we did.' },
  result: { label: 'Result', means: 'What changed because of what you did.' },
}

/** The evaluation items inside the notes: levels in words, each with the learner's own words. */
export const evaluationOf = (reflection: Reflection | null): EvidenceItem[] =>
  (reflection?.evidence ?? []).filter(e => e.level !== undefined && DIMENSION[e.competency])

