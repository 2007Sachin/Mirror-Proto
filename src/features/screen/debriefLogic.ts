// Deterministic reading of a finished screening call. No scores, no ranking, no counts shown to the learner.
// Every quote is an exact substring of one of the learner's own answers.
import { analyseAnswer, CHANGED, DID } from '../../lib/analyse'

export interface ScreenTurn { question: string; answer: string }
export interface Quote { text: string; turn: number }
export interface ListenFor { id: string; label: string; found: boolean; quotes: Quote[]; tip: string }

const MAX_QUOTE = 200

/** A sentence from the answer, cut to a prefix (still an exact substring) when it runs long. */
function trim(text: string): string {
  if (text.length <= MAX_QUOTE) return text
  const cut = text.slice(0, MAX_QUOTE)
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)).trim()
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Up to two sentences matching `test`, from different answers first. */
function pick(turns: ScreenTurn[], test: (sentence: string, turn: ScreenTurn) => boolean): Quote[] {
  const first: Quote[] = []
  const rest: Quote[] = []
  turns.forEach((t, turn) => {
    const hits = analyseAnswer(t.answer).sentences.filter(s => test(s.text, t))
    hits.forEach((s, i) => (i === 0 ? first : rest).push({ text: trim(s.text), turn }))
  })
  return [...first, ...rest].slice(0, 2)
}

const starCount = (a: string) => Object.values(analyseAnswer(a).star).filter(Boolean).length

export function buildListenFor(turns: ScreenTurn[], skillNames: string[]): ListenFor[] {
  const skillRes = skillNames.filter(Boolean).map(n => new RegExp(`(?<![A-Za-z0-9])${escapeRe(n)}(?![A-Za-z0-9])`, 'i'))
  const mentionsSkill = (s: string) => skillRes.some(r => r.test(s))
  const hasNumber = (s: string) => /\d/.test(s)

  const structured = turns.map((t, turn) => ({ t, turn })).filter(({ t }) => starCount(t.answer) >= 3)
  const concise = turns.map((t, turn) => ({ turn, a: analyseAnswer(t.answer) })).filter(({ a }) => a.words >= 25 && a.words <= 160)

  const item = (id: string, label: string, quotes: Quote[], tip: string, found = quotes.length > 0): ListenFor => ({ id, label, found, quotes, tip })
  return [
    item('structure', 'Clear structure: what happened, what you did, what changed',
      structured.slice(0, 2).map(({ t, turn }) => ({ text: trim(analyseAnswer(t.answer).sentences[0]?.text ?? t.answer), turn })),
      'Open with the situation in a sentence, then what you did, then what changed.'),
    item('specifics', 'Specific tools and numbers',
      pick(turns, s => hasNumber(s) || mentionsSkill(s)),
      'Name the tool you used and one number, such as how many, how long or how much.'),
    item('ownership', 'Ownership words, like "I led" or "I built"',
      pick(turns, s => DID.test(s)),
      'Say "I" for the parts you did yourself, so it is clear what was yours.'),
    item('outcomes', 'A clear outcome',
      pick(turns, s => CHANGED.test(s)),
      'Finish with what changed because of your work, even if it was small.'),
    item('jobwords', 'The job’s own words',
      pick(turns, s => mentionsSkill(s)),
      skillNames.length ? `Use the posting’s own words where they are true for you, such as ${skillNames.slice(0, 2).join(' or ')}.` : 'Use the posting’s own words where they are true for you.'),
    item('concise', 'Answers that stay to the point',
      concise.slice(0, 2).map(({ turn, a }) => ({ text: trim(a.sentences[0]?.text ?? turns[turn].answer), turn })),
      'Land the main point in the first sentence or two, then add one detail.'),
  ]
}

/** Fewest STAR parts met; ties go to the most fillers, then the shortest. Null when there are no answers. */
export function pickWeakest(turns: ScreenTurn[]): number | null {
  if (turns.length === 0) return null
  const rows = turns.map((t, i) => { const a = analyseAnswer(t.answer); return { i, star: Object.values(a.star).filter(Boolean).length, fillers: a.fillerTotal, words: a.words } })
  rows.sort((x, y) => x.star - y.star || y.fillers - x.fillers || x.words - y.words || x.i - y.i)
  return rows[0].i
}

/** Plain words for what the weakest answer did not yet say. */
export function missingParts(answer: string): string {
  const s = analyseAnswer(answer).star
  const miss = [!s.situation && 'what the situation was', !s.task && 'what you were asked to do', !s.action && 'what you did yourself', !s.result && 'what changed'].filter(Boolean) as string[]
  if (miss.length === 0) return 'It covers the main parts. Saying it again can make it shorter and sharper.'
  const list = miss.length === 1 ? miss[0] : `${miss.slice(0, -1).join(', ')} or ${miss[miss.length - 1]}`
  return `It did not yet say ${list}.`
}
