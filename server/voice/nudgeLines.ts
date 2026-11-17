// Calm scripted lines for live-call events. Plain, no scores, no counts.
export type LineKind = 'first' | 'second' | 'ramble' | 'repeat'

export const LINES: Record<LineKind, readonly string[]> = {
  first: ["Take your time, I'm here.", 'No rush. Whenever you are ready.', "Take a moment if you need one, I'm listening."],
  second: [
    'Want me to repeat the question, or give you a moment?',
    'Shall I say the question again, or would you like a little more time?',
    'I can repeat that, or we can wait a bit longer. Whichever helps.',
  ],
  ramble: [
    'Shall we move on, or is there one more point?',
    'That is plenty to work with. Move on, or one more point first?',
    'I have got that. Ready to move on, or is there something to add?',
  ],
  repeat: ['Of course, here it is again.', 'Sure, let me say that again.', 'No problem, once more.'],
}

const REPEAT_RE = /\b(repeat (that|the question|it)|say (that|it|the question) again|can you repeat|could you repeat|one more time|pardon|come again)\b/

/** A short utterance that asks for the question again. A long answer that merely contains the word is an answer. */
export function isRepeatRequest(transcript: string): boolean {
  const t = transcript.toLowerCase().replace(/[^a-z' ]+/g, ' ').trim()
  return t.split(/\s+/).length <= 8 && REPEAT_RE.test(t)
}

/** Pick a variant not yet used in this call; when all are used, start over but never repeat the last. */
export function pickLine(kind: LineKind, used: Set<string>, rand: () => number = Math.random): string {
  const all = LINES[kind]
  let pool = all.filter(l => !used.has(l))
  if (pool.length === 0) {
    const last = [...used].filter(l => all.includes(l)).pop()
    all.forEach(l => used.delete(l))
    pool = all.filter(l => l !== last)
    if (last) used.add(last)
  }
  const line = pool[Math.floor(rand() * pool.length)]
  used.add(line)
  return line
}
