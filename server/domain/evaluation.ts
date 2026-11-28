import type { EvidenceItem, TurnRow } from '../repo/types.js'
import type { EvaluationOutput } from '../providers/types.js'

/** What each dimension asks of an answer. The words here are shown to the learner as the dimension names. */
export const DIMENSIONS = ['structure', 'specificity', 'ownership', 'result'] as const
export type Dimension = (typeof DIMENSIONS)[number]
export const LEVELS = ['starting', 'clear', 'strong'] as const
export type Level = (typeof LEVELS)[number]

// Levels are words. A model sentence that sneaks a number, a percentage, a score or a verdict in is dropped, not shown.
const NUMBERY = /%|\d+\s*(out of|\/)\s*\d+|\b(scor|grad|pass|fail|ready|hire)\w*/i

/** A level is a plain word, never a number. Keeps the evaluation items out of anything that reads quotes only. */
export const isEvaluationItem = (e: EvidenceItem): boolean => e.level !== undefined

/**
 * Keeps only evaluation items whose quote is an exact piece of that answer, one item per dimension, in dimension order.
 * An item with a made-up or altered quote is dropped, never repaired. Pure.
 */
export function validateEvaluation(turns: Pick<TurnRow, 'id' | 'answer'>[], output: EvaluationOutput): EvidenceItem[] {
  const answer = new Map(turns.map(t => [t.id, t.answer]))
  const seen = new Set<string>()
  const kept: EvidenceItem[] = []
  for (const d of output.dimensions) {
    const text = answer.get(d.turnId)
    if (text === undefined || seen.has(d.dimension)) continue
    if (d.quote.trim() !== d.quote || !text.includes(d.quote)) continue
    if (NUMBERY.test(d.observation) || NUMBERY.test(d.fix)) continue
    seen.add(d.dimension)
    kept.push({ turnId: d.turnId, quote: d.quote, observation: d.observation, competency: d.dimension, level: d.level, fix: d.fix })
  }
  return kept.sort((a, b) => DIMENSIONS.indexOf(a.competency as Dimension) - DIMENSIONS.indexOf(b.competency as Dimension))
}
