// A finished session, read into the same sections every time.
// Words only: no grades, no counts of questions, no percentages.
import { analyseAnswer } from '../../lib/analyse'
import { scan } from '../../copyScan'
import { missingParts } from '../screen/debriefLogic'
import type { InterviewSession, Reflection } from '../../lib/api'

export interface StarLine { key: 'situation' | 'task' | 'action' | 'result'; label: string; state: 'In the answer' | 'Still open' }

export interface QuestionNote {
  index: number
  question: string
  answer: string
  worked: string
  strengthen: string
  delivery: string
  star: StarLine[]
}

export interface SessionReview {
  overview: string
  questions: QuestionNote[]
  pattern: string | null
  nextPractice: string
}

const PARTS: StarLine['key'][] = ['situation', 'task', 'action', 'result']
const LABEL: Record<StarLine['key'], string> = { situation: 'Situation', task: 'Task', action: 'Action', result: 'Result' }

function sentence(text: string): string {
  const t = text.trim()
  if (!t || /[.!?]$/.test(t)) return t
  return `${t}.`
}

function safe(text: string, fallback: string): string {
  const t = text.trim()
  return t && scan('review', t).length === 0 ? t : fallback
}

function starLines(answer: string): StarLine[] {
  const star = analyseAnswer(answer).star
  return PARTS.map(key => ({ key, label: LABEL[key], state: star[key] ? 'In the answer' : 'Still open' }))
}

function worked(answer: string, observation?: string): string {
  const fromNote = observation ? safe(observation, '') : ''
  if (fromNote) return fromNote
  const present = starLines(answer).filter(s => s.state === 'In the answer').map(s => s.label.toLowerCase())
  if (!present.length) return 'The answer is saved. The shape is still open.'
  if (present.length === 4) return 'It has a situation, a task, what you did, and what changed.'
  return `It already has ${present.join(', ')}.`
}

function delivery(answer: string, source: 'text' | 'voice'): string {
  const a = analyseAnswer(answer)
  const how = source === 'voice' ? 'Spoken.' : 'Typed.'
  const length = a.words < 25 ? 'It is brief.' : a.words > 160 ? 'It runs long.' : 'The length is comfortable.'
  const fill = a.fillerTotal > 0 ? 'A few filler words showed up.' : 'The wording is direct.'
  return `${how} ${length} ${fill}`
}

function openPart(session: InterviewSession): StarLine['key'] | null {
  const misses = Object.fromEntries(PARTS.map(p => [p, 0])) as Record<StarLine['key'], number>
  for (const t of session.turns) {
    const star = analyseAnswer(t.answer).star
    for (const p of PARTS) if (!star[p]) misses[p] += 1
  }
  const top = [...PARTS].sort((a, b) => misses[b] - misses[a])[0]
  return misses[top] > 0 ? top : null
}

/** Filler words against the length of the answers, so a shorter session is not treated as cleaner. */
function fillerRate(session: InterviewSession): { fillers: number; words: number } {
  return session.turns.reduce((sum, t) => {
    const a = analyseAnswer(t.answer)
    return { fillers: sum.fillers + a.fillerTotal, words: sum.words + a.words }
  }, { fillers: 0, words: 0 })
}

/** How this session compares with the one before it. Null when there is no earlier session. */
export function patternAcross(current: InterviewSession, previous: InterviewSession | null): string | null {
  if (!previous || !previous.turns.length || !current.turns.length) return null
  const lines: string[] = []
  const now = fillerRate(current)
  const then = fillerRate(previous)
  if (now.words > 0 && then.words > 0 && (now.fillers > 0 || then.fillers > 0)) {
    const nowRate = now.fillers / now.words
    const thenRate = then.fillers / then.words
    const base = Math.max(nowRate, thenRate)
    // Ignore a small swing. A one-word difference in a long answer is not a pattern.
    if (base > 0 && Math.abs(nowRate - thenRate) / base >= 0.25) {
      if (nowRate < thenRate) lines.push('Fewer filler words for the length of these answers than the session before.')
      else lines.push('More filler words for the length of these answers than the session before.')
    }
  }
  const gap = openPart(current)
  const prevGap = openPart(previous)
  if (gap && gap === prevGap) lines.push(`The ${LABEL[gap].toLowerCase()} is still open, as it was last time.`)
  else if (gap) lines.push(`The part still open most often is the ${LABEL[gap].toLowerCase()}.`)
  return lines.length ? lines.join(' ') : 'Nothing repeats from the session before.'
}

export function reviewSession(session: InterviewSession, previous: InterviewSession | null, reflection: Reflection | null): SessionReview {
  const byTurn = new Map((reflection?.evidence ?? []).map(e => [e.turnId, e.observation]))
  const questions: QuestionNote[] = [...session.turns]
    .filter(t => t.answer.trim())
    .sort((a, b) => a.questionIndex - b.questionIndex)
    .map(t => ({
      index: t.questionIndex,
      question: t.question,
      answer: t.answer,
      worked: worked(t.answer, byTurn.get(t.id)),
      strengthen: safe(missingParts(t.answer), 'Saying it again can make it shorter and sharper.'),
      delivery: delivery(t.answer, t.transcriptSource),
      star: starLines(t.answer),
    }))
  const kind = session.kind === 'screen' ? 'A screening call' : 'A practice conversation'
  const focus = reflection?.focus ? sentence(safe(reflection.focus, '')) : ''
  const overview = focus
    ? `${kind} for ${session.role}. ${focus}`
    : `${kind} for ${session.role}. The notes are not written yet. Your answers are saved.`
  const suggestion = reflection?.suggestion ? safe(reflection.suggestion, '') : ''
  const weakest = questions.find(q => q.star.some(s => s.state === 'Still open'))
  const nextPractice = suggestion
    || (weakest ? `Say “${weakest.question}” again, and add the part that is still open.` : 'Say one answer again, shorter, and land what changed.')
  return { overview, questions, pattern: patternAcross(session, previous), nextPractice }
}
