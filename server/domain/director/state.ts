import { normalise } from './guard.js'
import type { InterviewContext } from '../../providers/types.js'
import type { InterviewRow, Repository, TurnRow } from '../../repo/types.js'
import type { AnswerSignals, GapSkill, RoomState } from './types.js'

const OUTCOME = /\b(result|resulted|outcome|improved|reduced|increased|decreased|saved|cut|grew|launched|shipped|delivered|fixed|won|because of|led to|as a result)\b|\d/i

/** What the last answer looked like: length, thin (short or no outcome), strong (specific, with an outcome). */
export function answerSignals(answer: string): AnswerSignals {
  const words = answer.trim().split(/\s+/).filter(Boolean).length
  const hasOutcome = OUTCOME.test(answer)
  const thin = words < 25 || !hasOutcome
  return { words, thin, strong: !thin && (/\d/.test(answer) || words >= 60) }
}

/** Reads what the Director needs from the repository. No new tables: history is the union of earlier interviews' asked questions. */
export async function buildRoomState(
  repo: Repository,
  workspace: string,
  interview: InterviewRow,
  turns: TurnRow[],
  // The profile is accepted so a later stage can use it; the Director needs nothing from it yet.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _profile: InterviewContext | null = null,
): Promise<RoomState> {
  const earlier = await repo.listInterviews(workspace, { limit: 30 })
  const history = [...new Set(earlier.filter(i => i.id !== interview.id).flatMap(i => i.askedQuestions))]

  let gaps: GapSkill[] = []
  if (interview.targetId) {
    const rows = await repo.listGapMatches(workspace, interview.targetId)
    gaps = rows
      .filter(r => r.status !== 'covered')
      .map(r => ({ skill: r.skill, weight: r.weight, probeQuestion: r.probeQuestion }))
      .sort((a, b) => (a.weight === b.weight ? 0 : a.weight === 'core' ? -1 : 1))
  }

  const stories = await repo.listStories(workspace)
  const storyThemes = [...new Set(stories.flatMap(s => s.themes))]

  const asked = interview.askedQuestions
  const covered = gaps
    .filter(g => asked.some(q => q === g.probeQuestion || normalise(q).includes(normalise(g.skill))))
    .map(g => g.skill)

  const lastTurn = turns[turns.length - 1]
  return {
    interviewId: interview.id,
    role: interview.role,
    industry: interview.industry,
    targetId: interview.targetId ?? null,
    turns: turns.map(t => ({ question: t.question, answer: t.answer })),
    asked,
    history,
    gaps,
    storyThemes,
    covered,
    last: lastTurn ? answerSignals(lastTurn.answer) : null,
    nextIndex: turns.length,
    notes: [],
  }
}
