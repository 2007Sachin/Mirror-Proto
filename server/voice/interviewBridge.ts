import { TOTAL_QUESTIONS } from '../domain/questions.js'
import { persistFollowUpQuestion } from '../domain/followUp.js'
import { addTurn } from '../domain/stateMachine.js'
import { ProviderFailure } from '../providers/nim.js'
import type { ReflectionProvider } from '../providers/types.js'
import type { Repository, TurnRow } from '../repo/types.js'

export type BridgeResult =
  | {
      ok: true
      turn: TurnRow
      nextQuestionIndex: number | null
      nextQuestion: string | null
      completed: boolean
    }
  | { ok: false; code: string; status: number }

/**
 * Translates a finalized voice transcript into a Phase-1 interview turn by
 * calling the SAME domain state machine + Repository the REST layer uses
 * (no HTTP loopback). Question ordering stays in domain/stateMachine.ts.
 * Follow-ups are persisted onto asked_questions the same way POST /turns does.
 */
export async function submitVoiceTurn(
  repo: Repository,
  workspace: string,
  interviewId: string,
  questionIndex: number,
  answer: string,
  provider: ReflectionProvider | null,
): Promise<BridgeResult> {
  const interview = await repo.getInterview(workspace, interviewId)
  if (!interview) return { ok: false, code: 'interview_not_found', status: 404 }
  const turns = await repo.getTurns(workspace, interviewId)
  const asked = interview.askedQuestions[questionIndex] ?? ''
  const result = addTurn(interview, turns, {
    questionIndex,
    question: asked,
    answer,
    transcriptSource: 'voice',
  })
  if (!result.ok) return { ok: false, code: result.error, status: result.status }

  const turn = await repo.addTurn(workspace, interviewId, {
    questionIndex: result.turn.questionIndex,
    question: result.turn.question,
    answer: result.turn.answer,
    transcriptSource: 'voice',
  })
  if (result.completed) {
    await repo.updateInterviewStatus(workspace, interviewId, 'completed')
    return { ok: true, turn, nextQuestionIndex: null, nextQuestion: null, completed: true }
  }

  const fresh = (await repo.getInterview(workspace, interviewId)) ?? interview
  const savedTurns = await repo.getTurns(workspace, interviewId)
  try {
    const nextQuestion = await persistFollowUpQuestion(repo, fresh, savedTurns, provider)
    return {
      ok: true,
      turn,
      nextQuestionIndex: questionIndex + 1,
      nextQuestion,
      completed: false,
    }
  } catch (err) {
    if (err instanceof ProviderFailure) {
      return { ok: false, code: 'followup_provider_unavailable', status: 503 }
    }
    throw err
  }
}

/** Current progress of an interview, for session_ready. */
export async function interviewProgress(
  repo: Repository,
  workspace: string,
  interviewId: string,
): Promise<{ questionIndex: number; questionCount: number; currentQuestion: string | null } | null> {
  const interview = await repo.getInterview(workspace, interviewId)
  if (!interview) return null
  const turns = await repo.getTurns(workspace, interviewId)
  return {
    questionIndex: turns.length,
    questionCount: TOTAL_QUESTIONS,
    currentQuestion: interview.askedQuestions[turns.length] ?? null,
  }
}
