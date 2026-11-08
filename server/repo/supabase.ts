import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  AddTurnInput,
  CreateInterviewInput,
  EvidenceItem,
  InterviewRow,
  ReflectionRow,
  Repository,
  SaveReflectionInput,
  TurnRow,
} from './types.js'

interface InterviewRecord {
  id: string
  workspace_id: string
  role: string
  industry: string | null
  status: InterviewRow['status']
  asked_questions: string[] | null
  created_at: string
}

interface TurnRecord {
  id: string
  workspace_id: string
  interview_id: string
  question_index: number
  question: string
  answer: string
  transcript_source: 'text' | 'voice'
  created_at: string
}

interface ReflectionRecord {
  id: string
  workspace_id: string
  interview_id: string
  role: string
  readiness_label: 'emerging' | 'solid' | 'strong'
  readiness_range: { low: number; high: number } | null
  evidence: EvidenceItem[]
  focus: string
  model: string
  created_at: string
}

function toInterviewRow(r: InterviewRecord): InterviewRow {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    role: r.role,
    industry: r.industry,
    status: r.status,
    askedQuestions: r.asked_questions ?? [],
    createdAt: r.created_at,
  }
}

function toTurnRow(r: TurnRecord): TurnRow {
  return {
    id: r.id,
    interviewId: r.interview_id,
    workspaceId: r.workspace_id,
    questionIndex: r.question_index,
    question: r.question,
    answer: r.answer,
    transcriptSource: r.transcript_source,
    createdAt: r.created_at,
  }
}

function toReflectionRow(r: ReflectionRecord): ReflectionRow {
  return {
    id: r.id,
    interviewId: r.interview_id,
    workspaceId: r.workspace_id,
    role: r.role,
    readinessLabel: r.readiness_label,
    readinessRange: r.readiness_range,
    evidence: r.evidence,
    focus: r.focus,
    model: r.model,
    createdAt: r.created_at,
  }
}

/** Phase 1 tables. Prefixed to avoid the production `public.turns` table. */
export const PHASE1_TABLES = {
  workspaces: 'mirror_workspaces',
  interviews: 'mirror_interviews',
  turns: 'mirror_turns',
  reflections: 'mirror_reflections',
} as const

export class PersistenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PersistenceError'
  }
}

function throwIf(error: { message: string } | null, action: string): void {
  if (error) throw new PersistenceError(`failed to ${action}: ${error.message}`)
}

export function createSupabaseRepository(url: string, secretKey: string): Repository {
  const client: SupabaseClient = createClient(url, secretKey)

  return {
    async ensureWorkspace(slug: string): Promise<void> {
      const { error } = await client.from(PHASE1_TABLES.workspaces).upsert({ slug }, { onConflict: 'slug' })
      throwIf(error, 'ensure workspace')
    },

    async createInterview(workspace: string, input: CreateInterviewInput): Promise<InterviewRow> {
      const { data, error } = await client
        .from(PHASE1_TABLES.interviews)
        .insert({
          workspace_id: workspace,
          role: input.role,
          industry: input.industry ?? null,
          status: 'in_progress',
          asked_questions: [input.openingQuestion],
        })
        .select()
        .single()
      throwIf(error, 'create interview')
      return toInterviewRow(data as InterviewRecord)
    },

    async getInterview(workspace: string, id: string): Promise<InterviewRow | null> {
      const { data, error } = await client
        .from(PHASE1_TABLES.interviews)
        .select()
        .eq('id', id)
        .eq('workspace_id', workspace)
        .maybeSingle()
      if (error || !data) return null
      return toInterviewRow(data as InterviewRecord)
    },

    async updateInterviewStatus(workspace: string, id: string, status: InterviewRow['status']): Promise<void> {
      const { error } = await client
        .from(PHASE1_TABLES.interviews)
        .update({ status })
        .eq('id', id)
        .eq('workspace_id', workspace)
      throwIf(error, 'update interview status')
    },

    async appendAskedQuestion(workspace: string, id: string, question: string): Promise<InterviewRow | null> {
      const current = await this.getInterview(workspace, id)
      if (!current) return null
      const asked = [...current.askedQuestions, question]
      const { data, error } = await client
        .from(PHASE1_TABLES.interviews)
        .update({ asked_questions: asked })
        .eq('id', id)
        .eq('workspace_id', workspace)
        .select()
        .single()
      throwIf(error, 'append question')
      return toInterviewRow(data as InterviewRecord)
    },

    async listInterviewsByRole(workspace: string, role: string): Promise<InterviewRow[]> {
      const { data, error } = await client
        .from(PHASE1_TABLES.interviews)
        .select()
        .eq('workspace_id', workspace)
        .eq('role', role)
      throwIf(error, 'list interviews')
      return (data as InterviewRecord[]).map(toInterviewRow)
    },

    async addTurn(workspace: string, interviewId: string, input: AddTurnInput): Promise<TurnRow> {
      const { data, error } = await client
        .from(PHASE1_TABLES.turns)
        .insert({
          workspace_id: workspace,
          interview_id: interviewId,
          question_index: input.questionIndex,
          question: input.question,
          answer: input.answer,
          transcript_source: input.transcriptSource,
        })
        .select()
        .single()
      throwIf(error, 'add turn')
      return toTurnRow(data as TurnRecord)
    },

    async getTurns(workspace: string, interviewId: string): Promise<TurnRow[]> {
      const { data, error } = await client
        .from(PHASE1_TABLES.turns)
        .select()
        .eq('workspace_id', workspace)
        .eq('interview_id', interviewId)
        .order('question_index', { ascending: true })
      throwIf(error, 'list turns')
      return (data as TurnRecord[]).map(toTurnRow)
    },

    async saveReflection(workspace: string, input: SaveReflectionInput): Promise<ReflectionRow> {
      const { data, error } = await client
        .from(PHASE1_TABLES.reflections)
        .upsert(
          {
            workspace_id: workspace,
            interview_id: input.interviewId,
            role: input.role,
            readiness_label: input.readinessLabel,
            readiness_range: input.readinessRange,
            evidence: input.evidence,
            focus: input.focus,
            model: input.model,
          },
          { onConflict: 'interview_id' },
        )
        .select()
        .single()
      throwIf(error, 'save reflection')
      return toReflectionRow(data as ReflectionRecord)
    },

    async getReflection(workspace: string, interviewId: string): Promise<ReflectionRow | null> {
      const { data, error } = await client
        .from(PHASE1_TABLES.reflections)
        .select()
        .eq('interview_id', interviewId)
        .eq('workspace_id', workspace)
        .maybeSingle()
      if (error || !data) return null
      return toReflectionRow(data as ReflectionRecord)
    },
  }
}
