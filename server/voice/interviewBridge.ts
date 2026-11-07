import { FIXED_QUESTIONS } from '../domain/questions.js'
import { addTurn } from '../domain/stateMachine.js'
import type { Repository, TurnRow } from '../repo/types.js'

export type BridgeResult =
  | { ok: true; turn: TurnRow; nextQuestionIndex: number | null; completed: boolean }
  | { ok: false; code: string; status: number }

/**
 * Translates a finalized voice transcript into a Phase-1 interview turn by
 * calling the SAME domain state machine + Repository the REST layer uses
 * (no HTTP loopback). Question ordering and duplicate detection stay in
 * domain/stateMachine.ts — this bridge adds no interview rules.
 */
export async function submitVoiceTurn(
  repo: Repository,
  workspace: string,
  interviewId: string,
  questionIndex: number,
  answer: string,
): Promise<BridgeResult> {
  const interview = await repo.getInterview(workspace, interviewId)
  if (!interview) return { ok: false, code: 'interview_not_found', status: 404 }
  const turns = await repo.getTurns(workspace, interviewId)
  const result = addTurn(interview, turns, {
    questionIndex,
    question: FIXED_QUESTIONS[questionIndex],
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
  }
  return {
    ok: true,
    turn,
    nextQuestionIndex: result.completed ? null : questionIndex + 1,
    completed: result.completed,
  }
}

/** Current progress of an interview, for session_ready. */
export async function interviewProgress(
  repo: Repository,
  workspace: string,
  interviewId: string,
): Promise<{ questionIndex: number; questionCount: number } | null> {
  const interview = await repo.getInterview(workspace, interviewId)
  if (!interview) return null
  const turns = await repo.getTurns(workspace, interviewId)
  return { questionIndex: turns.length, questionCount: FIXED_QUESTIONS.length }
}

export function questionText(index: number): string {
  return FIXED_QUESTIONS[index]
}
