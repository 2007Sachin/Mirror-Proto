import { TOTAL_QUESTIONS } from './questions.js'
import type {
  AddTurnInput,
  EvidenceItem,
  InterviewRow,
  TurnRow,
} from '../repo/types.js'

export type AddTurnResult =
  | { ok: true; turn: TurnRow; status: InterviewRow['status']; completed: boolean }
  | { ok: false; error: string; status: number; expected?: number }

export type EvidenceValidationResult =
  | { ok: true; evidence: EvidenceItem[] }
  | { ok: false; error: string; status: number }

export type CompletionCheck =
  | { ok: true }
  | { ok: false; error: string; status: number; answers?: number }

export interface ProviderReflectionOutput {
  readinessLabel: 'emerging' | 'solid' | 'strong'
  readinessRange: { low: number; high: number } | null
  evidence: EvidenceItem[]
  focus: string
}

/**
 * Pure turn-acceptance rules. Answers are accepted before any NIM call.
 */
export function addTurn(
  interview: InterviewRow | null,
  turns: TurnRow[],
  input: AddTurnInput,
): AddTurnResult {
  if (!interview) return { ok: false, error: 'interview_not_found', status: 404 }
  if (interview.status === 'completed') {
    return { ok: false, error: 'interview_already_completed', status: 409 }
  }
  if (interview.status === 'abandoned') {
    return { ok: false, error: 'interview_abandoned', status: 409 }
  }
  const answer = input.answer.trim()
  if (answer.length === 0) {
    return { ok: false, error: 'empty_answer', status: 400 }
  }
  const expected = turns.length
  if (expected >= TOTAL_QUESTIONS) {
    return { ok: false, error: 'interview_already_completed', status: 409 }
  }
  if (input.questionIndex < expected) {
    return { ok: false, error: 'duplicate_question_index', status: 409 }
  }
  if (input.questionIndex !== expected) {
    return { ok: false, error: 'out_of_order_question_index', status: 409, expected }
  }
  const asked = interview.askedQuestions[input.questionIndex]
  if (!asked) {
    return { ok: false, error: 'followup_not_ready', status: 409, expected }
  }
  const completed = input.questionIndex === TOTAL_QUESTIONS - 1
  const turn: TurnRow = {
    id: crypto.randomUUID(),
    interviewId: interview.id,
    workspaceId: interview.workspaceId,
    questionIndex: input.questionIndex,
    question: asked,
    answer,
    transcriptSource: input.transcriptSource,
    createdAt: new Date().toISOString(),
  }
  return { ok: true, turn, status: completed ? 'completed' : 'in_progress', completed }
}

export function canComplete(interview: InterviewRow | null, turns: TurnRow[]): CompletionCheck {
  if (!interview) return { ok: false, error: 'interview_not_found', status: 404 }
  if (interview.status === 'abandoned') {
    return { ok: false, error: 'interview_abandoned', status: 409 }
  }
  if (turns.length < TOTAL_QUESTIONS) {
    return { ok: false, error: 'interview_incomplete', status: 409, answers: turns.length }
  }
  return { ok: true }
}

export function canAbandon(interview: InterviewRow | null): CompletionCheck {
  if (!interview) return { ok: false, error: 'interview_not_found', status: 404 }
  if (interview.status === 'completed') {
    return { ok: false, error: 'interview_already_completed', status: 409 }
  }
  return { ok: true }
}

export function validateEvidence(turns: TurnRow[], evidence: EvidenceItem[]): EvidenceValidationResult {
  const turnById = new Map(turns.map(t => [t.id, t]))
  const valid: EvidenceItem[] = []
  for (const item of evidence) {
    const turn = turnById.get(item.turnId)
    if (!turn) return { ok: false, error: 'invalid_evidence_turn_id', status: 400 }
    if (item.quote.trim() !== item.quote || !turn.answer.includes(item.quote)) {
      return { ok: false, error: 'invalid_evidence_quote', status: 400 }
    }
    valid.push(item)
  }
  return { ok: true, evidence: valid }
}

/**
 * Numeric readiness is only trustworthy when backed by evidence. Never invent
 * candidate experience. A range without evidence is stripped.
 */
export function reconcileReadinessRange(output: ProviderReflectionOutput): ProviderReflectionOutput {
  if (output.evidence.length === 0) {
    return { ...output, readinessRange: null }
  }
  const range = output.readinessRange
  if (range && range.low > range.high) {
    return { ...output, readinessRange: { low: range.high, high: range.low } }
  }
  return output
}
