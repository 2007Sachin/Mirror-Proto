// Draft a STAR card from the learner's own sentences. Pure and deterministic: every field is an exact
// substring of the answer or empty. Nothing is invented or paraphrased.
import { analyseAnswer, CHANGED, DID } from '../lib/analyse'
import { themesFor } from './themes'

export interface StoryDraft {
  title: string
  themes: string[]
  situation: string
  task: string
  action: string
  result: string
  quote: string | null
}

const TASK = /\b(needed to|had to|was asked|goal|responsible for|my job|had been asked|aim(?:ed)?)\b/i
const CONTEXT = /\b(when|at|last (?:year|month|quarter)|we had|our|the team|while|during)\b/i

function cut(s: string, max = 60): string {
  if (s.length <= max) return s
  const head = s.slice(0, max + 1)
  const i = head.lastIndexOf(' ')
  return head.slice(0, i > 0 ? i : max).replace(/[\s,;:.-]+$/, '')
}

export function draftStory({ question, answer }: { question: string; answer: string }): StoryDraft {
  const sentences = analyseAnswer(answer ?? '').sentences.map(s => s.text)
  const used = new Set<number>()
  const pick = (test: (s: string, i: number) => boolean): string => {
    const out: string[] = []
    sentences.forEach((s, i) => { if (!used.has(i) && test(s, i)) { used.add(i); out.push(s) } })
    return out.join(' ')
  }
  // Action first, then result (after the action), task, and situation from what is left at the start.
  const actionAt = sentences.findIndex(s => DID.test(s))
  const action = pick(s => DID.test(s))
  const result = pick((s, i) => i > actionAt && CHANGED.test(s))
  const task = pick(s => TASK.test(s))
  const situation = pick((s, i) => i === 0 || (i < Math.max(actionAt, 1) && CONTEXT.test(s)))
  const longest = sentences.reduce((a, s) => (s.length > a.length ? s : a), '')
  const first = sentences[0] ?? ''
  return {
    title: first ? cut(first) : cut((question ?? '').trim()),
    themes: themesFor(`${answer ?? ''}`),
    situation, task, action, result,
    quote: longest || null,
  }
}
