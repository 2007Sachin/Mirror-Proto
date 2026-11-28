// Kind words wall copy. Every quote and person is invented sample text.
// TODO(placeholder): real, permitted quotes and names needed; none of these are from real people.

export const KIND_WORDS = {
  title: 'Kind words',
  eyebrow: 'Kind words',
  h1: ['Some love from', 'people practicing'],
  sub: 'All placeholders. Replace with real, permitted quotes.',
  sampleLabel: 'Sample',
  who: 'Placeholder role',
  wallLabel: 'Kind words from people practicing (sample quotes)',
} as const

const LINE = 'It felt calm and kind, and I finally found my words. '
// TODO(placeholder): real, permitted quotes needed. Lengths vary on purpose to show the masonry columns.
export const QUOTES: { name: string; text: string }[] = [2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1].map((reps, i) => ({
  name: `Sample name ${i + 1}`,
  text: `Placeholder quote ${i + 1}. ${LINE.repeat(reps)}`.trim(),
}))
