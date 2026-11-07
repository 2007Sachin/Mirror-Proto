import { FIXED_QUESTIONS, type ReadinessLabel } from './questions.js'
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

export interface ProviderReflectionOutput {
  readinessLabel: ReadinessLabel
  readinessRange: { low: number; high: number } | null
  evidence: EvidenceItem[]
  focus: string
}

const TOTAL_QUESTIONS = FIXED_QUESTIONS.length

/**
 * Pure turn-acceptance rules. The repository has already loaded the interview
 * (workspace-first, so a foreign interview arrives here as null) and its
 * existing turns; this function decides whether the incoming turn is legal.
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
  const answer = input.answer.trim()
  if (answer.length === 0) {
    return { ok: false, error: 'empty_answer', status: 400 }
  }
  const expected = turns.length
  if (input.questionIndex < expected) {
    return { ok: false, error: 'duplicate_question_index', status: 409 }
  }
  if (input.questionIndex !== expected) {
    return { ok: false, error: 'out_of_order_question_index', status: 409, expected }
  }
  const completed = input.questionIndex === TOTAL_QUESTIONS - 1
  const turn: TurnRow = {
    id: crypto.randomUUID(),
    interviewId: interview.id,
    workspaceId: interview.workspaceId,
    questionIndex: input.questionIndex,
    question: FIXED_QUESTIONS[input.questionIndex],
    answer,
    transcriptSource: input.transcriptSource,
    createdAt: new Date().toISOString(),
  }
  return { ok: true, turn, status: completed ? 'completed' : 'in_progress', completed }
}

/**
 * Server-side re-validation of provider evidence: every item must reference a
 * known turn in this interview and the quote must be an exact substring of
 * that turn's stored answer (whitespace-padded quotes are rejected).
 */
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
 * Numeric readiness is only trustworthy when backed by evidence. If the
 * provider emitted a readiness range but zero evidence items survived
 * validation, the range is stripped.
 */
export function reconcileReadinessRange(output: ProviderReflectionOutput): ProviderReflectionOutput {
  if (output.evidence.length === 0) {
    return { ...output, readinessRange: null }
  }
  return output
}
