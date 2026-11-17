// Repeat guard: a question counts as asked when its normalised text matches, or its content words overlap enough to be the same question reworded.

const STOP = new Set(
  ('a an the and or but of to in on at for with from by as is are was were be been it its this that these those i me my we our you your ' +
    'do does did done have has had what how why when where which who whom about tell describe walk through time ever can could would ' +
    'should will one more some any there then so if than into out up over whats').split(/\s+/),
)

/** Lowercase, strip punctuation and stopwords; the content words of a question. */
export function contentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !STOP.has(w))
}

export const normalise = (text: string): string => contentTokens(text).join(' ')

/** Share of content words the two questions have in common (0 to 1). */
export function similarity(a: string, b: string): number {
  const A = new Set(contentTokens(a))
  const B = new Set(contentTokens(b))
  if (!A.size || !B.size) return 0
  let both = 0
  for (const w of A) if (B.has(w)) both += 1
  return both / (A.size + B.size - both)
}

export const REPEAT_THRESHOLD = 0.6

/** True when `candidate` matches (exactly or nearly) a question already asked this interview or in earlier ones. */
export function isRepeat(candidate: string, asked: readonly string[], history: readonly string[]): boolean {
  const n = normalise(candidate)
  if (!n) return true
  for (const q of [...asked, ...history]) {
    if (normalise(q) === n || similarity(candidate, q) >= REPEAT_THRESHOLD) return true
  }
  return false
}
