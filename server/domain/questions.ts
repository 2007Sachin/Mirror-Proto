export const FIXED_QUESTIONS: readonly string[] = [
  'Tell me about a project or moment at work that you’re genuinely proud of.',
  'What was specifically yours to own, and what decision did you make?',
  'What resistance or unexpected difficulty did you encounter?',
  'What changed because of your work, and what would you do differently now?',
]

export type ReadinessLabel = 'emerging' | 'solid' | 'strong'

export function readinessLabelFor(readinessLow: number): ReadinessLabel {
  if (readinessLow >= 70) return 'strong'
  if (readinessLow >= 50) return 'solid'
  return 'emerging'
}
