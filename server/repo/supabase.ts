import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  AddTurnInput,
  CreateInterviewInput,
  EvidenceItem,
  InterviewKind,
  InterviewRow,
  PracticeAttemptInput,
  PracticeAttemptRow,
  ProfileInput,
  ProfileRow,
  ReflectionRow,
  Repository,
  SaveReflectionInput,
  Target,
  CreateTargetInput,
  TargetPatch,
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
  kind?: InterviewKind
  question_cap?: number | null
  time_cap_seconds?: number | null
  started_at?: string | null
  target_id?: string | null
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
  readiness_label: 'emerging' | 'solid' | 'strong' | null
  suggestion: string | null
  readiness_range: { low: number; high: number } | null
  evidence: EvidenceItem[]
  focus: string
  model: string
  created_at: string
}

interface ProfileRecord {
  workspace_id: string
  role: string
  story: string
  pressure_question: string
  pressure_answer: string
  summary: string
  focus: string
  first_question: string
  resume_text: string | null
  resume_name: string | null
  mode: 'text' | 'voice'
  created_at: string
}

interface TargetRecord {
  id: string
  company: string
  role: string
  interview_date: string | null
  jd: string
  status: Target['status']
  skills: Target['skills'] | null
  rounds: Target['rounds'] | null
  events: Target['events'] | null
  debriefs: Target['debriefs'] | null
  next_step: string | null
  created_at: string
}

interface PracticeAttemptRecord {
  id: string
  item_id: string
  track: PracticeAttemptRow['track']
  topic: string
  level: PracticeAttemptRow['level']
  correct: boolean
  seconds: number
  hints_used: number
  created_at: string
}

function toAttempt(r: PracticeAttemptRecord): PracticeAttemptRow {
  return {
    id: r.id,
    itemId: r.item_id,
    track: r.track,
    topic: r.topic,
    level: r.level,
    correct: r.correct,
    seconds: r.seconds,
    hintsUsed: r.hints_used,
    createdAt: r.created_at,
  }
}

function toTarget(r: TargetRecord): Target {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    interviewDate: r.interview_date,
    jd: r.jd,
    status: r.status,
    skills: r.skills ?? [],
    rounds: r.rounds ?? [],
    events: r.events ?? [],
    debriefs: r.debriefs ?? [],
    nextStep: r.next_step,
    createdAt: r.created_at,
  }
}

function toProfileRow(r: ProfileRecord): ProfileRow {
  return {
    workspaceId: r.workspace_id,
    role: r.role,
    story: r.story,
    pressureQuestion: r.pressure_question,
    pressureAnswer: r.pressure_answer,
    summary: r.summary,
    focus: r.focus,
    firstQuestion: r.first_question,
    resumeText: r.resume_text,
    resumeName: r.resume_name ?? null,
    mode: r.mode,
    createdAt: r.created_at,
  }
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
    kind: r.kind ?? 'practice',
    questionCap: r.question_cap ?? null,
    timeCapSeconds: r.time_cap_seconds ?? null,
    startedAt: r.started_at ?? null,
    targetId: r.target_id ?? null,
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
    suggestion: r.suggestion ?? null,
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
  profiles: 'mirror_profiles',
  targets: 'mirror_targets',
  practiceAttempts: 'mirror_practice_attempts',
} as const

export class PersistenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PersistenceError'
  }
}

/** The stores for stories, attempts, claims, matches and replay are not wired to Supabase yet. */
const notReady = (): never => {
  throw new PersistenceError('storage_not_ready')
}

function throwIf(error: { message: string } | null, action: string): void {
  if (error) throw new PersistenceError(`failed to ${action}: ${error.message}`)
}

type ScreenMeta = Pick<InterviewRow, 'kind' | 'questionCap' | 'timeCapSeconds' | 'startedAt' | 'targetId'>

/** `screenDbReady` is true once migration 0008 is applied (SCREEN_DB_READY=1). Until then screen metadata lives in memory and a screen is capped at 4 questions. */
export function createSupabaseRepository(url: string, secretKey: string, opts: { screenDbReady?: boolean } = {}): Repository {
  const client: SupabaseClient = createClient(url, secretKey)
  const ready = opts.screenDbReady === true
  // ponytail: lost on a server restart, which only matters for a screen already running; applying 0008 removes this.
  const meta = new Map<string, ScreenMeta>()
  const withMeta = (r: InterviewRow): InterviewRow => (ready ? r : { ...r, ...meta.get(r.id) })

  return {
    async ensureWorkspace(slug: string): Promise<void> {
      const { error } = await client.from(PHASE1_TABLES.workspaces).upsert({ slug }, { onConflict: 'slug' })
      throwIf(error, 'ensure workspace')
    },

    async createInterview(workspace: string, input: CreateInterviewInput): Promise<InterviewRow> {
      const isScreen = input.kind === 'screen'
      // Without the migration the turns check allows indexes 0..3 only, so a screen is clamped to four questions.
      const asked = input.askedQuestions?.length ? input.askedQuestions : [input.openingQuestion]
      const questions = isScreen && !ready ? asked.slice(0, 4) : asked
      const questionCap = isScreen ? (input.questionCap ?? questions.length) : (input.questionCap ?? null)
      const cap = isScreen && !ready && questionCap !== null ? Math.min(questionCap, 4) : questionCap
      const metaRow: ScreenMeta = {
        kind: input.kind ?? 'practice',
        questionCap: cap,
        timeCapSeconds: input.timeCapSeconds ?? null,
        startedAt: input.startedAt ?? null,
        targetId: input.targetId ?? null,
      }
      const { data, error } = await client
        .from(PHASE1_TABLES.interviews)
        .insert({
          workspace_id: workspace,
          role: input.role,
          industry: input.industry ?? null,
          status: 'in_progress',
          asked_questions: questions,
          ...(ready
            ? { kind: metaRow.kind, question_cap: cap, time_cap_seconds: metaRow.timeCapSeconds, started_at: metaRow.startedAt, target_id: metaRow.targetId }
            : {}),
        })
        .select()
        .single()
      throwIf(error, 'create interview')
      const row = data as InterviewRecord
      if (!ready && (isScreen || cap !== null)) meta.set(row.id, metaRow)
      return withMeta(toInterviewRow(row))
    },

    async getInterview(workspace: string, id: string): Promise<InterviewRow | null> {
      const { data, error } = await client
        .from(PHASE1_TABLES.interviews)
        .select()
        .eq('id', id)
        .eq('workspace_id', workspace)
        .maybeSingle()
      if (error || !data) return null
      return withMeta(toInterviewRow(data as InterviewRecord))
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
      return withMeta(toInterviewRow(data as InterviewRecord))
    },

    async listInterviewsByRole(workspace: string, role: string): Promise<InterviewRow[]> {
      const { data, error } = await client
        .from(PHASE1_TABLES.interviews)
        .select()
        .eq('workspace_id', workspace)
        .eq('role', role)
      throwIf(error, 'list interviews')
      return (data as InterviewRecord[]).map(r => withMeta(toInterviewRow(r)))
    },

    async listInterviews(workspace: string, page?: { limit?: number; before?: string }): Promise<InterviewRow[]> {
      let query = client
        .from(PHASE1_TABLES.interviews)
        .select()
        .eq('workspace_id', workspace)
        .order('created_at', { ascending: false })
      if (page?.before) query = query.lt('created_at', page.before)
      const { data, error } = await query.limit(page?.limit ?? 20)
      throwIf(error, 'list interviews')
      return (data as InterviewRecord[]).map(r => withMeta(toInterviewRow(r)))
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
            suggestion: input.suggestion,
            model: input.model,
          },
          { onConflict: 'interview_id' },
        )
        .select()
        .single()
      throwIf(error, 'save notes')
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

    async getProfile(workspace: string): Promise<ProfileRow | null> {
      const { data, error } = await client.from(PHASE1_TABLES.profiles).select().eq('workspace_id', workspace).maybeSingle()
      if (error || !data) return null
      return toProfileRow(data as ProfileRecord)
    },

    async deleteProfile(workspace: string): Promise<void> {
      const { error } = await client.from(PHASE1_TABLES.profiles).delete().eq('workspace_id', workspace)
      throwIf(error, 'delete profile')
    },

    async saveProfile(workspace: string, input: ProfileInput): Promise<ProfileRow> {
      const { data, error } = await client
        .from(PHASE1_TABLES.profiles)
        .upsert(
          {
            workspace_id: workspace,
            role: input.role,
            story: input.story,
            pressure_question: input.pressureQuestion,
            pressure_answer: input.pressureAnswer,
            summary: input.summary,
            focus: input.focus,
            first_question: input.firstQuestion,
            resume_text: input.resumeText,
            resume_name: input.resumeName,
            mode: input.mode,
          },
          { onConflict: 'workspace_id' },
        )
        .select()
        .single()
      throwIf(error, 'save profile')
      return toProfileRow(data as ProfileRecord)
    },

    async createTarget(workspace: string, input: CreateTargetInput): Promise<Target> {
      const { data, error } = await client
        .from(PHASE1_TABLES.targets)
        .insert({ workspace_id: workspace, company: input.company, role: input.role, interview_date: input.interviewDate, jd: input.jd })
        .select()
        .single()
      throwIf(error, 'create target')
      return toTarget(data as TargetRecord)
    },

    async getTarget(workspace: string, id: string): Promise<Target | null> {
      const { data, error } = await client.from(PHASE1_TABLES.targets).select().eq('id', id).eq('workspace_id', workspace).maybeSingle()
      if (error || !data) return null
      return toTarget(data as TargetRecord)
    },

    async listTargets(workspace: string): Promise<Target[]> {
      const { data, error } = await client
        .from(PHASE1_TABLES.targets)
        .select()
        .eq('workspace_id', workspace)
        .order('created_at', { ascending: false })
        .limit(50)
      throwIf(error, 'list targets')
      return (data as TargetRecord[]).map(toTarget)
    },

    async updateTarget(workspace: string, id: string, patch: TargetPatch): Promise<Target | null> {
      const { nextStep, interviewDate, ...rest } = patch
      const record = {
        ...rest, // status, skills, rounds, events, debriefs, company, role, jd share column names
        ...(nextStep !== undefined ? { next_step: nextStep } : {}),
        ...(interviewDate !== undefined ? { interview_date: interviewDate } : {}),
      }
      const { data, error } = await client
        .from(PHASE1_TABLES.targets)
        .update(record)
        .eq('id', id)
        .eq('workspace_id', workspace)
        .select()
        .maybeSingle()
      throwIf(error, 'update target')
      return data ? toTarget(data as TargetRecord) : null
    },

    async deleteTarget(workspace: string, id: string): Promise<void> {
      const { error } = await client.from(PHASE1_TABLES.targets).delete().eq('id', id).eq('workspace_id', workspace)
      throwIf(error, 'delete target')
    },

    async addPracticeAttempt(workspace: string, input: PracticeAttemptInput): Promise<PracticeAttemptRow> {
      const { data, error } = await client
        .from(PHASE1_TABLES.practiceAttempts)
        .insert({
          workspace_id: workspace,
          item_id: input.itemId,
          track: input.track,
          topic: input.topic,
          level: input.level,
          correct: input.correct,
          seconds: input.seconds,
          hints_used: input.hintsUsed,
        })
        .select()
        .single()
      throwIf(error, 'add practice attempt')
      return toAttempt(data as PracticeAttemptRecord)
    },

    async getPracticeAttempts(workspace: string, sinceIso?: string): Promise<PracticeAttemptRow[]> {
      let q = client.from(PHASE1_TABLES.practiceAttempts).select().eq('workspace_id', workspace)
      if (sinceIso) q = q.gte('created_at', sinceIso)
      const { data, error } = await q.order('created_at', { ascending: true }).limit(5000)
      throwIf(error, 'list practice attempts')
      return (data as PracticeAttemptRecord[]).map(toAttempt)
    },

    // New stores: typed by us, columns not wired yet (needs auth + generated types).
    async addAnswerAttempt(): Promise<never> {
      return notReady()
    },
    async listAnswerAttempts(): Promise<never> {
      return notReady()
    },
    async deleteAnswerAttempts(): Promise<never> {
      return notReady()
    },
    async createStory(): Promise<never> {
      return notReady()
    },
    async listStories(): Promise<never> {
      return notReady()
    },
    async getStory(): Promise<never> {
      return notReady()
    },
    async updateStory(): Promise<never> {
      return notReady()
    },
    async deleteStory(): Promise<never> {
      return notReady()
    },
    async deleteAllStories(): Promise<never> {
      return notReady()
    },
    async replaceResumeClaims(): Promise<never> {
      return notReady()
    },
    async listResumeClaims(): Promise<never> {
      return notReady()
    },
    async deleteResumeClaims(): Promise<never> {
      return notReady()
    },
    async replaceGapMatches(): Promise<never> {
      return notReady()
    },
    async listGapMatches(): Promise<never> {
      return notReady()
    },
    async upsertReplayItem(): Promise<never> {
      return notReady()
    },
    async listReplaySchedule(): Promise<never> {
      return notReady()
    },
    async deleteReplayItem(): Promise<never> {
      return notReady()
    },
    async deleteAllNewData(): Promise<never> {
      return notReady()
    },
    // Placeholders; agent B rewrites this repository.
    async exportAllData(): Promise<never> {
      return notReady()
    },
    async deleteAllData(): Promise<never> {
      return notReady()
    },
  }
}
