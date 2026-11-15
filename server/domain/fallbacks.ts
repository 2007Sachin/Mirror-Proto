import type { ReflectionOutput } from '../providers/types.js'

/** The first sentence of what they said, as an exact substring, at most `max` characters. */
export function firstSentenceOf(text: string, max: number): string {
  const one = text.trim().split(/(?<=[.!?])\s/)[0] ?? ''
  return one.length > max ? one.slice(0, max).trimEnd() : one
}

const NOTES_GAP = 'Saying what you personally decided, in one clear sentence.'
const NOTES_NEXT = 'Next time, open with the decision you made, then give the context around it.'

/**
 * Notes built only from the learner's own words: verbatim first sentences from their longest answers.
 * Nothing here claims anything about them; the gap is the focus they chose, or a plain catalogue line.
 */
export function fallbackNotes(
  turns: { id: string; answer: string }[],
  focus?: string | null,
): ReflectionOutput {
  const picked = turns
    .map((t, order) => ({ turnId: t.id, order, quote: firstSentenceOf(t.answer, 200), length: t.answer.length }))
    .filter(t => t.quote.length > 0)
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)
    .sort((a, b) => a.order - b.order)
  return {
    whatStoodOut: picked.map(({ turnId, quote }) => ({ turnId, quote })),
    keepWorkingOn: focus?.trim() ? focus.trim().slice(0, 300) : NOTES_GAP,
    suggestion: NOTES_NEXT,
  }
}

/** The catalogue question, led by a short quote of their last answer when it has enough words to quote. */
export function quotedFollowUp(base: string, lastAnswer?: string): string {
  if (!lastAnswer || lastAnswer.trim().split(/\s+/).length < 5) return base
  return `You said: “${firstSentenceOf(lastAnswer, 120)}” ${base}`.slice(0, 500)
}

/** The learner's own pressure answer, in their words, as the gap to work on. */
export function gapFromAnswer(answer: string): string {
  const quote = firstSentenceOf(answer, 140)
  return quote ? `Going deeper on “${quote}”` : 'Saying what you personally did, in one clear sentence.'
}
