export const TOTAL_QUESTIONS = 4 as const

export const OPENING_QUESTION =
  'Tell me about a project or moment at work that you’re genuinely proud of.'

/** Deterministic follow-up catalog used when NVIDIA NIM is not configured. */
export const FALLBACK_QUESTIONS: readonly string[] = [
  OPENING_QUESTION,
  'What was specifically yours to own, and what decision did you make?',
  'What resistance or unexpected difficulty did you encounter?',
  'What changed because of your work, and what would you do differently now?',
]

/** @deprecated Use FALLBACK_QUESTIONS. Kept so existing imports keep compiling. */
export const FIXED_QUESTIONS = FALLBACK_QUESTIONS

export type ReadinessLabel = 'emerging' | 'solid' | 'strong'

export function readinessLabelFor(readinessLow: number): ReadinessLabel {
  if (readinessLow >= 70) return 'strong'
  if (readinessLow >= 50) return 'solid'
  return 'emerging'
}

export function fallbackQuestionAt(index: number): string {
  return FALLBACK_QUESTIONS[index] ?? FALLBACK_QUESTIONS[FALLBACK_QUESTIONS.length - 1]
}
