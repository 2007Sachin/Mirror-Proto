/**
 * Pure mappings between our row types and the live columns of the five newer tables.
 * Source of truth for the columns: src/lib/database.types.ts (generated from the live schema).
 */
import type { Database } from '../../src/lib/database.types.js'
import { DICTIONARY } from '../domain/scout.js'
import { describeClaim } from '../domain/resume.js'
import type {
  AnswerAttemptFilter,
  AnswerAttemptInput,
  AnswerAttemptRow,
  GapMatchInput,
  GapMatchRow,
  ReplayItemInput,
  ReplayItemRow,
  ResumeClaimInput,
  ResumeClaimRow,
  StoryInput,
  StoryRow,
} from './types.js'

type Tables = Database['public']['Tables']
export type Row<T extends keyof Tables> = Tables[T]['Row']
export type Insert<T extends keyof Tables> = Tables[T]['Insert']
export type Update<T extends keyof Tables> = Tables[T]['Update']

// ---- answer attempts: kind and item_id are real columns; question_key names the question (<interview or item>:<index>) ----

export function answerAttemptKey(input: Pick<AnswerAttemptInput, 'interviewId' | 'itemId' | 'questionIndex'>): string {
  return `${input.interviewId ?? input.itemId ?? 'x'}:${input.questionIndex ?? 0}`
}

export function answerAttemptInsert(userId: string, input: AnswerAttemptInput): Insert<'mirror_answer_attempts'> {
  return {
    user_id: userId,
    interview_id: input.interviewId,
    turn_id: null,
    question_key: answerAttemptKey(input),
    kind: input.kind,
    item_id: input.itemId ?? null,
    question: input.question,
    attempt_no: input.attempt,
    answer_text: input.answer,
    transcript_source: input.transcriptSource,
    word_count: input.answer.trim() ? input.answer.trim().split(/\s+/).length : 0,
  }
}

export function answerAttemptFromRow(userId: string, r: Row<'mirror_answer_attempts'>): AnswerAttemptRow {
  const kind: AnswerAttemptInput['kind'] = r.kind === 'explain' ? 'explain' : 'retry'
  const index = Number(r.question_key.slice(r.question_key.lastIndexOf(':') + 1))
  return {
    id: r.id,
    workspaceId: userId,
    interviewId: r.interview_id,
    // The key stores 0 for "no index"; an attempt with no interview never had one.
    questionIndex: r.interview_id === null || !Number.isFinite(index) ? null : index,
    question: r.question,
    attempt: Number(r.attempt_no),
    answer: r.answer_text,
    kind,
    itemId: r.item_id,
    transcriptSource: r.transcript_source === 'voice' ? 'voice' : 'text',
    createdAt: r.created_at,
  }
}

/** Columns to match for a filter (null: no constraint). */
export function answerAttemptQuery(filter: AnswerAttemptFilter = {}): { kind: string | null; itemId: string | null; interviewId: string | null } {
  return { kind: filter.kind ?? null, itemId: filter.itemId ?? null, interviewId: filter.interviewId ?? null }
}

// ---- stories ----

type StorySource = 'manual' | 'first_interview' | 'interview'
export const storySource = (sourceInterviewId: string | null, source?: StorySource): StorySource => source ?? (sourceInterviewId ? 'interview' : 'manual')

export function storyInsert(userId: string, input: StoryInput): Insert<'mirror_stories'> {
  return {
    user_id: userId,
    title: input.title,
    situation: input.situation,
    task: input.task,
    action: input.action,
    result: input.result,
    themes: input.themes,
    quote: input.quote,
    question: input.question,
    source: storySource(input.sourceInterviewId, input.source),
    source_interview_id: input.sourceInterviewId,
    source_turn_id: input.sourceTurnId,
    archived_at: null,
  }
}

export function storyPatch(patch: Partial<StoryInput>, nowIso: string): Update<'mirror_stories'> {
  const u: Update<'mirror_stories'> = { updated_at: nowIso }
  if (patch.title !== undefined) u.title = patch.title
  if (patch.situation !== undefined) u.situation = patch.situation
  if (patch.task !== undefined) u.task = patch.task
  if (patch.action !== undefined) u.action = patch.action
  if (patch.result !== undefined) u.result = patch.result
  if (patch.themes !== undefined) u.themes = patch.themes
  if (patch.quote !== undefined) u.quote = patch.quote
  if (patch.question !== undefined) u.question = patch.question
  if (patch.sourceInterviewId !== undefined) { u.source_interview_id = patch.sourceInterviewId; u.source = storySource(patch.sourceInterviewId, patch.source) }
  else if (patch.source !== undefined) u.source = patch.source
  if (patch.sourceTurnId !== undefined) u.source_turn_id = patch.sourceTurnId
  return u
}

export function storyFromRow(userId: string, r: Row<'mirror_stories'>): StoryRow {
  return {
    id: r.id,
    workspaceId: userId,
    title: r.title,
    themes: r.themes ?? [],
    situation: r.situation ?? '',
    task: r.task ?? '',
    action: r.action ?? '',
    result: r.result ?? '',
    quote: r.quote,
    question: r.question,
    sourceInterviewId: r.source_interview_id,
    sourceTurnId: r.source_turn_id,
    source: storySource(r.source_interview_id, r.source as StorySource),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// ---- resume claims ----

export type ClaimCategory = 'skill' | 'tool' | 'project' | 'impact' | 'role' | 'education' | 'other'
/** A line with a number reads as an impact; one that names skills as a skill; anything else as other. */
export const claimCategory = (c: Pick<ResumeClaimInput, 'skills' | 'hasNumber'>): ClaimCategory => (c.hasNumber ? 'impact' : c.skills.length > 0 ? 'skill' : 'other')

export function claimInsert(userId: string, input: ResumeClaimInput, resumeName: string | null = null): Insert<'mirror_resume_claims'> {
  return {
    user_id: userId,
    claim: input.quote,
    source_quote: input.quote,
    category: claimCategory(input),
    skills: input.skills,
    has_number: input.hasNumber,
    is_vague: input.vague,
    resume_name: resumeName,
  }
}

export function claimFromRow(userId: string, r: Row<'mirror_resume_claims'>): ResumeClaimRow {
  const quote = r.source_quote ?? r.claim
  // Rows written before these columns existed have them empty: work them out again from the text.
  const d = describeClaim(quote)
  return {
    id: r.id,
    workspaceId: userId,
    quote,
    skills: r.skills && r.skills.length > 0 ? r.skills : d.skills,
    hasNumber: r.has_number ?? d.hasNumber,
    vague: r.is_vague ?? d.vague,
    createdAt: r.created_at,
  }
}

// ---- gap matches ----

const STATUSES = ['covered', 'partial', 'gap'] as const
const AREAS = [...new Set(DICTIONARY.map(d => d.area))]

export function gapMatchInsert(
  userId: string,
  targetId: string,
  row: Omit<GapMatchInput, 'targetId'>,
  claimId: string | null,
): Insert<'mirror_target_gap_matches'> {
  return {
    user_id: userId,
    target_id: targetId,
    skill_name: row.skill,
    skill_weight: row.weight,
    jd_quote: null,
    claim_id: claimId,
    match_status: row.status,
    note: row.note,
    probe_question: row.probeQuestion,
    area: row.area,
    source: row.source,
  }
}

export const areaOf = (skill: string): GapMatchInput['area'] => DICTIONARY.find(d => d.name === skill)?.area ?? 'tools'

export function gapMatchFromRow(userId: string, r: Row<'mirror_target_gap_matches'>, claimQuote: string | null): GapMatchRow {
  return {
    id: r.id,
    workspaceId: userId,
    targetId: r.target_id,
    skill: r.skill_name,
    area: AREAS.find(a => a === r.area) ?? areaOf(r.skill_name),
    weight: r.skill_weight === 'core' ? 'core' : 'nice',
    status: STATUSES.find(s => s === r.match_status) ?? 'gap',
    claimQuote,
    note: r.note ?? '',
    probeQuestion: r.probe_question ?? null,
    source: r.source === 'ai' ? 'ai' : 'fallback',
    createdAt: r.created_at,
  }
}

// ---- replay schedule ----

const num = (v: unknown, fallback: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}

const REPLAY_KINDS = ['question', 'pattern', 'practice_item'] as const

export function replayInsert(userId: string, input: ReplayItemInput, nowIso: string): Insert<'mirror_replay_schedule'> {
  return {
    user_id: userId,
    item_kind: input.kind ?? 'practice_item',
    item_key: input.itemId,
    due_at: input.dueAt,
    interval_days: input.intervalDays,
    repetitions: input.rung,
    last_recall: input.lastResult === null ? null : input.lastResult ? 'good' : 'again',
    updated_at: nowIso,
  }
}

export function replayFromRow(userId: string, r: Row<'mirror_replay_schedule'>): ReplayItemRow {
  return {
    id: r.id,
    workspaceId: userId,
    itemId: r.item_key,
    kind: REPLAY_KINDS.find(k => k === r.item_kind) ?? 'practice_item',
    dueAt: r.due_at,
    intervalDays: num(r.interval_days, 0),
    rung: num(r.repetitions, 0),
    lastResult: r.last_recall === 'good' || r.last_recall === 'easy' ? true : r.last_recall === 'again' || r.last_recall === 'hard' ? false : null,
    updatedAt: r.updated_at,
  }
}

/** `ease` may arrive from PostgREST as a string (numeric column). Not part of our row type; exposed for callers that need it. */
export const easeOf = (r: Pick<Row<'mirror_replay_schedule'>, 'ease'>): number => num(r.ease, 2.5)
