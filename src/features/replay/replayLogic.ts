// Pure helpers on top of analyseAnswer. No scores, no percentages; only statements the analyses support.
import type { Analysis } from '../../lib/analyse'

export type SegmentKind = 'plain' | 'filler' | 'vague'
export interface Segment { text: string; kind: SegmentKind }

export type StarKey = 'situation' | 'task' | 'action' | 'result'
export const STAR_PARTS: { key: StarKey; name: string; tip: string }[] = [
  { key: 'situation', name: 'what the situation was', tip: 'Open with one line on where and when this happened.' },
  { key: 'task', name: 'what you were asked to do', tip: 'Say what you needed to get done, in one sentence.' },
  { key: 'action', name: 'what you did', tip: 'Say what you did yourself, starting with "I".' },
  { key: 'result', name: 'what changed', tip: 'End with what changed, ideally with a number.' },
]

/** The STAR parts the answer does not show yet, in plain words with a one-line tip each. */
export const missingStarParts = (a: Analysis) => STAR_PARTS.filter(p => !a.star[p.key])

/** The learner's own text cut into plain / filler / vague runs. Overlaps are merged; filler wins. */
export function highlightSegments(text: string, a: Analysis): Segment[] {
  const kinds: SegmentKind[] = Array.from({ length: text.length }, () => 'plain')
  const paint = (start: number, end: number, k: SegmentKind) => {
    for (let i = Math.max(0, start); i < Math.min(text.length, end); i++) if (k === 'filler' || kinds[i] === 'plain') kinds[i] = k
  }
  a.vague.forEach(v => paint(v.span.start, v.span.end, 'vague'))
  a.fillers.forEach(f => f.spans.forEach(s => paint(s.start, s.end, 'filler')))
  const out: Segment[] = []
  let from = 0
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || kinds[i] !== kinds[from]) {
      out.push({ text: text.slice(from, i), kind: kinds[from] })
      from = i
    }
  }
  return text ? out : []
}

/** "um x2, you know x1" */
export const fillerLine = (a: Analysis) => a.fillers.map(f => `${f.term} x${f.count}`).join(', ')

const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`
const hasNumber = (a: Analysis) => a.sentences.some(s => /\d/.test(s.text))

/** What got better between two attempts, plain. When nothing did, say so calmly with one suggestion. */
export function compareAttempts(first: Analysis, second: Analysis): { improved: boolean; lines: string[] } {
  const lines: string[] = []
  const fewerFillers = first.fillerTotal - second.fillerTotal
  if (fewerFillers > 0) lines.push(`${n(fewerFillers, 'fewer filler word', 'fewer filler words')}`)
  const fewerVague = first.vague.length - second.vague.length
  if (fewerVague > 0) {
    lines.push(!hasNumber(first) && hasNumber(second) ? 'A vague phrase was replaced with a number' : `${n(fewerVague, 'fewer vague phrase', 'fewer vague phrases')}`)
  }
  for (const p of STAR_PARTS) if (!first.star[p.key] && second.star[p.key]) lines.push(`${p.key === 'result' ? 'The result' : `The ${p.key}`} is now included`)
  if (lines.length) return { improved: true, lines }

  const gap = missingStarParts(first)[0]
  const next = gap ? gap.tip : first.fillerTotal > 0 ? 'Try pausing instead of using a filler word.' : first.vague.length > 0 ? 'Swap one vague phrase for a number or a result.' : 'Add one more concrete detail.'
  return { improved: false, lines: ['Nothing clearly changed this time, and that is fine.', next] }
}
