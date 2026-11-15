// Deterministic reading of one typed or transcribed answer. No AI, no scores.
// Every span is an exact substring of the learner's own text (offsets into the original string),
// so anything a screen highlights is their words, never ours.

export interface Span { start: number; end: number; text: string }

export interface Analysis {
  words: number
  sentences: Span[]
  /** As transcribed: only terms that appear, in a fixed order. */
  fillers: { term: string; count: number; spans: Span[] }[]
  fillerTotal: number
  vague: { phrase: string; span: Span; why: string }[]
  star: { situation: boolean; task: boolean; action: boolean; result: boolean }
}

export const countWords = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0)

// ponytail: plain keyword heuristics (moved from Interview.tsx); swap for a smarter read if it ever needs to be.
export const DID = /\bI\s+(?:\w+\s+)?(built|led|wrote|decided|fixed|designed|launched|created|owned|ran|shipped|proposed|organi[sz]ed|worked|made|chose|developed|started|set up)\b/i
export const CHANGED = /(result|reduced|increased|saved|improved|grew|faster|fewer|\d)/i

const CONTEXT = /\b(when|at|last (?:year|month|quarter)|we had|our|the team|while|during)\b/i
const TASK = /\b(needed to|had to|was asked|goal|responsible for|my job|had been asked|aim(?:ed)?)\b/i

// Order is the order they are reported in. 'actually' and 'like' only count in the spots people really use them as fillers.
const FILLERS: [term: string, re: RegExp][] = [
  ['um', /\bum+\b/gi],
  ['uh', /\buh+\b/gi],
  ['erm', /\berm\b/gi],
  ['er', /\ber\b/gi],
  ['hmm', /\bhmm+\b/gi],
  ['you know', /\byou know\b/gi],
  ['kind of', /\bkind of\b/gi],
  ['sort of', /\bsort of\b/gi],
  ['basically', /\bbasically\b/gi],
  ['literally', /\bliterally\b/gi],
  ['actually', /(?<=,\s*)actually(?=\s*,)/gi],
  ['like', /(?<=,\s*)like(?=\s*,)|(?<=\bum,?\s+)like\b/gi],
]

const WEAK = /\b(helped with|helped|assisted|worked on|was involved in|responsible for|various|a lot of|lots of|stuff|things|etc|and so on|a bit|quite|some kind of)\b/gi

const span = (text: string, start: number, end: number): Span => ({ start, end, text: text.slice(start, end) })

/** Sentences as trimmed spans. A full stop inside "3.5" does not end one. */
function splitSentences(text: string): Span[] {
  const out: Span[] = []
  let from = 0
  const push = (to: number) => {
    let s = from
    let e = to
    while (s < e && /\s/.test(text[s])) s++
    while (e > s && /\s/.test(text[e - 1])) e--
    if (e > s) out.push(span(text, s, e))
    from = to
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\n') push(i + 1)
    else if (ch === '.' || ch === '!' || ch === '?') {
      let j = i
      while (j + 1 < text.length && '.!?'.includes(text[j + 1])) j++
      if (j + 1 >= text.length || /\s/.test(text[j + 1])) push(j + 1)
      i = j
    }
  }
  push(text.length)
  return out
}

export function analyseAnswer(text: string): Analysis {
  const sentences = splitSentences(text)

  const fillers = FILLERS.map(([term, re]) => {
    const spans = [...text.matchAll(re)].map(m => span(text, m.index, m.index + m[0].length))
    return { term, count: spans.length, spans }
  }).filter(f => f.count > 0)

  // A weak phrase is only a problem when its sentence says nothing about what changed.
  const vague: Analysis['vague'] = []
  for (const s of sentences) {
    if (CHANGED.test(s.text)) continue
    for (const m of s.text.matchAll(WEAK)) {
      const start = s.start + m.index
      vague.push({ phrase: m[0], span: span(text, start, start + m[0].length), why: 'No result or number here.' })
    }
  }

  const actionAt = sentences.findIndex(s => DID.test(s.text))
  return {
    words: countWords(text),
    sentences,
    fillers,
    fillerTotal: fillers.reduce((n, f) => n + f.count, 0),
    vague,
    star: {
      situation: (sentences[0] ? CONTEXT.test(sentences[0].text) : false) || countWords(text) > 25,
      task: TASK.test(text),
      action: actionAt >= 0,
      result: /\d/.test(text) || sentences.some((s, i) => i > actionAt && CHANGED.test(s.text)),
    },
  }
}
