import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../src/lib/database.types.js'
import {
  answerAttemptFromRow,
  answerAttemptInsert,
  answerAttemptQuery,
  claimFromRow,
  claimInsert,
  gapMatchFromRow,
  gapMatchInsert,
  replayFromRow,
  replayInsert,
  storyFromRow,
  storyInsert,
  storyPatch,
  type Insert,
  type Row,
  type Update,
} from './adapters.js'
import type {
  AddTurnInput,
  AnswerAttemptFilter,
  AnswerAttemptInput,
  AnswerAttemptRow,
  CreateInterviewInput,
  CreateTargetInput,
  EvidenceItem,
  GapMatchInput,
  GapMatchRow,
  InterviewKind,
  InterviewRow,
  PracticeAttemptInput,
  PracticeAttemptRow,
  ProfileInput,
  ProfileRow,
  ReflectionRow,
  ReplayItemInput,
  Repository,
  RepoExport,
  ResumeClaimInput,
  ResumeClaimRow,
  SaveReflectionInput,
  StoryInput,
  StoryRow,
  Target,
  TargetPatch,
  TurnRow,
} from './types.js'

type Db = SupabaseClient<Database>

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

/** The newer tables: no workspace_id, owned by user_id only. */
export const NEW_TABLES = {
  answerAttempts: 'mirror_answer_attempts',
  stories: 'mirror_stories',
  resumeClaims: 'mirror_resume_claims',
  gapMatches: 'mirror_target_gap_matches',
  replaySchedule: 'mirror_replay_schedule',
} as const

export class PersistenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PersistenceError'
  }
}

type DbError = { message: string; code?: string }

function throwIf(error: DbError | null, action: string): void {
  if (error) throw new PersistenceError(`failed to ${action}: ${error.message}`)
}

/** An insert/update that must give a row back. */
function one<T>(res: { data: T | null; error: DbError | null }, action: string): T {
  throwIf(res.error, action)
  if (!res.data) throw new PersistenceError(`failed to ${action}: no row returned`)
  return res.data
}

/** A lookup: null only means "no such row" (or an id that is not a uuid). Any other failure throws. */
function maybe<T>(res: { data: T | null; error: DbError | null }, action: string): T | null {
  if (res.error && res.error.code !== '22P02') throwIf(res.error, action)
  return res.data ?? null
}

/** A list: a failed read is an error, never an empty list. */
function many<T>(res: { data: T[] | null; error: DbError | null }, action: string): T[] {
  throwIf(res.error, action)
  return res.data ?? []
}

const json = (v: unknown): Json => v as Json

// Columns that exist only after migration 0008 (SCREEN_DB_READY=1); absent from the generated types.
type ScreenColumns = Partial<{
  kind: InterviewKind
  question_cap: number | null
  time_cap_seconds: number | null
  started_at: string | null
  target_id: string | null
}>
type InterviewDb = Row<'mirror_interviews'> & ScreenColumns

function toInterviewRow(r: InterviewDb): InterviewRow {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    role: r.role,
    industry: r.industry,
    status: r.status as InterviewRow['status'],
    askedQuestions: Array.isArray(r.asked_questions) ? (r.asked_questions as string[]) : [],
    createdAt: r.created_at,
    kind: r.kind ?? 'practice',
    questionCap: r.question_cap ?? null,
    timeCapSeconds: r.time_cap_seconds ?? null,
    startedAt: r.started_at ?? null,
    targetId: r.target_id ?? null,
  }
}

function toTurnRow(r: Row<'mirror_turns'>): TurnRow {
  return {
    id: r.id,
    interviewId: r.interview_id,
    workspaceId: r.workspace_id,
    questionIndex: r.question_index,
    question: r.question,
    answer: r.answer,
    transcriptSource: r.transcript_source === 'voice' ? 'voice' : 'text',
    createdAt: r.created_at,
  }
}

function toReflectionRow(r: Row<'mirror_reflections'>): ReflectionRow {
  return {
    id: r.id,
    interviewId: r.interview_id,
    workspaceId: r.workspace_id,
    role: r.role,
    readinessLabel: r.readiness_label as ReflectionRow['readinessLabel'],
    readinessRange: r.readiness_range as ReflectionRow['readinessRange'],
    evidence: (Array.isArray(r.evidence) ? r.evidence : []) as unknown as EvidenceItem[],
    focus: r.focus,
    suggestion: r.suggestion ?? null,
    model: r.model,
    createdAt: r.created_at,
  }
}

function toProfileRow(r: Row<'mirror_profiles'>): ProfileRow {
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
    mode: r.mode === 'voice' ? 'voice' : 'text',
    createdAt: r.created_at,
  }
}

const list = <T>(v: Json): T[] => (Array.isArray(v) ? (v as unknown as T[]) : [])

function toTarget(r: Row<'mirror_targets'>): Target {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    interviewDate: r.interview_date,
    jd: r.jd,
    status: r.status === 'ready' ? 'ready' : 'scouting',
    skills: list(r.skills),
    rounds: list(r.rounds),
    events: list(r.events),
    debriefs: list(r.debriefs),
    nextStep: r.next_step,
    createdAt: r.created_at,
  }
}

function toAttempt(r: Row<'mirror_practice_attempts'>): PracticeAttemptRow {
  return {
    id: r.id,
    itemId: r.item_id,
    track: r.track as PracticeAttemptRow['track'],
    topic: r.topic,
    level: r.level as PracticeAttemptRow['level'],
    correct: r.correct,
    seconds: Number(r.seconds),
    hintsUsed: Number(r.hints_used),
    createdAt: r.created_at,
  }
}

type ScreenMeta = Pick<InterviewRow, 'kind' | 'questionCap' | 'timeCapSeconds' | 'startedAt' | 'targetId'>

// ponytail: lost on a server restart, which only matters for a screen already running; applying 0008 removes this.
// Module level because a repository is now built per request (interview ids are unique uuids).
const screenMeta = new Map<string, ScreenMeta>()

/**
 * Every query runs through `client`, which carries the signed-in user's token (anon key), so RLS applies.
 * `workspace` arguments are the user's id (slug = user id). The service role is never used here.
 * `screenDbReady` is true once migration 0008 is applied (SCREEN_DB_READY=1); until then screen metadata lives
 * in memory and a screen is capped at 4 questions.
 */
export function createUserRepository(client: Db, userId: string, opts: { screenDbReady?: boolean } = {}): Repository {
  const ready = opts.screenDbReady === true
  const withMeta = (r: InterviewRow): InterviewRow => (ready ? r : { ...r, ...screenMeta.get(r.id) })

  async function getInterview(workspace: string, id: string): Promise<InterviewRow | null> {
    const res = await client.from(PHASE1_TABLES.interviews).select().eq('id', id).eq('workspace_id', workspace).maybeSingle()
    const row = maybe(res, 'get interview')
    return row ? withMeta(toInterviewRow(row as InterviewDb)) : null
  }

  async function getTarget(workspace: string, id: string): Promise<Target | null> {
    const res = await client.from(PHASE1_TABLES.targets).select().eq('id', id).eq('workspace_id', workspace).maybeSingle()
    const row = maybe(res, 'get target')
    return row ? toTarget(row) : null
  }

  async function claimRows(): Promise<Row<'mirror_resume_claims'>[]> {
    const res = await client.from(NEW_TABLES.resumeClaims).select().eq('user_id', userId).order('created_at', { ascending: true })
    return many(res, 'list resume claims')
  }

  async function gapMatchesFor(rows: Row<'mirror_target_gap_matches'>[]): Promise<GapMatchRow[]> {
    const ids = [...new Set(rows.map(r => r.claim_id).filter((x): x is string => x !== null))]
    const quotes = new Map<string, string>()
    if (ids.length > 0) {
      const res = await client.from(NEW_TABLES.resumeClaims).select().eq('user_id', userId).in('id', ids)
      for (const c of many(res, 'list resume claims')) quotes.set(c.id, c.source_quote ?? c.claim)
    }
    return rows.map(r => gapMatchFromRow(userId, r, r.claim_id ? (quotes.get(r.claim_id) ?? null) : null))
  }

  async function listGapMatches(_workspace: string, targetId: string): Promise<GapMatchRow[]> {
    const res = await client
      .from(NEW_TABLES.gapMatches)
      .select()
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .order('created_at', { ascending: true })
    return gapMatchesFor(many(res, 'list gap matches'))
  }

  async function listInterviewsAll(workspace: string): Promise<InterviewRow[]> {
    const res = await client
      .from(PHASE1_TABLES.interviews)
      .select()
      .eq('workspace_id', workspace)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    return many(res, 'list interviews').map(r => withMeta(toInterviewRow(r as InterviewDb)))
  }

  /** Deletes in dependency order; the first failure stops the run. */
  async function deleteSteps(steps: [string, () => PromiseLike<{ error: DbError | null }>][]): Promise<void> {
    for (const [name, run] of steps) throwIf((await run()).error, `delete ${name}`)
  }

  const newDataSteps = (): [string, () => PromiseLike<{ error: DbError | null }>][] => [
    ['gap matches', () => client.from(NEW_TABLES.gapMatches).delete().eq('user_id', userId)],
    ['resume claims', () => client.from(NEW_TABLES.resumeClaims).delete().eq('user_id', userId)],
    ['answer attempts', () => client.from(NEW_TABLES.answerAttempts).delete().eq('user_id', userId)],
    ['stories', () => client.from(NEW_TABLES.stories).delete().eq('user_id', userId)],
    ['replay schedule', () => client.from(NEW_TABLES.replaySchedule).delete().eq('user_id', userId)],
  ]

  return {
    async ensureWorkspace(slug: string): Promise<void> {
      const { error } = await client
        .from(PHASE1_TABLES.workspaces)
        .upsert({ slug, user_id: userId }, { onConflict: 'slug', ignoreDuplicates: true })
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
      const extra: ScreenColumns = ready
        ? { kind: metaRow.kind, question_cap: cap, time_cap_seconds: metaRow.timeCapSeconds, started_at: metaRow.startedAt, target_id: metaRow.targetId }
        : {}
      const res = await client
        .from(PHASE1_TABLES.interviews)
        .insert({
          workspace_id: workspace,
          user_id: userId,
          role: input.role,
          industry: input.industry ?? null,
          status: 'in_progress',
          asked_questions: questions,
          ...extra,
        } as Insert<'mirror_interviews'>)
        .select()
        .single()
      const row = one(res, 'create interview') as InterviewDb
      if (!ready && (isScreen || cap !== null)) screenMeta.set(row.id, metaRow)
      return withMeta(toInterviewRow(row))
    },

    getInterview,

    async updateInterviewStatus(workspace: string, id: string, status: InterviewRow['status']): Promise<void> {
      const { error } = await client.from(PHASE1_TABLES.interviews).update({ status }).eq('id', id).eq('workspace_id', workspace)
      throwIf(error, 'update interview status')
    },

    async appendAskedQuestion(workspace: string, id: string, question: string): Promise<InterviewRow | null> {
      const current = await getInterview(workspace, id)
      if (!current) return null
      const res = await client
        .from(PHASE1_TABLES.interviews)
        .update({ asked_questions: [...current.askedQuestions, question] })
        .eq('id', id)
        .eq('workspace_id', workspace)
        .select()
        .single()
      return withMeta(toInterviewRow(one(res, 'append question') as InterviewDb))
    },

    async listInterviewsByRole(workspace: string, role: string): Promise<InterviewRow[]> {
      const res = await client.from(PHASE1_TABLES.interviews).select().eq('workspace_id', workspace).eq('role', role)
      return many(res, 'list interviews').map(r => withMeta(toInterviewRow(r as InterviewDb)))
    },

    async listInterviews(workspace: string, page?: { limit?: number; before?: string }): Promise<InterviewRow[]> {
      let query = client.from(PHASE1_TABLES.interviews).select().eq('workspace_id', workspace).order('created_at', { ascending: false })
      if (page?.before) query = query.lt('created_at', page.before)
      const res = await query.limit(page?.limit ?? 20)
      return many(res, 'list interviews').map(r => withMeta(toInterviewRow(r as InterviewDb)))
    },

    async addTurn(workspace: string, interviewId: string, input: AddTurnInput): Promise<TurnRow> {
      const res = await client
        .from(PHASE1_TABLES.turns)
        .insert({
          workspace_id: workspace,
          user_id: userId,
          interview_id: interviewId,
          question_index: input.questionIndex,
          question: input.question,
          answer: input.answer,
          transcript_source: input.transcriptSource,
        })
        .select()
        .single()
      return toTurnRow(one(res, 'add turn'))
    },

    async getTurns(workspace: string, interviewId: string): Promise<TurnRow[]> {
      const res = await client
        .from(PHASE1_TABLES.turns)
        .select()
        .eq('workspace_id', workspace)
        .eq('interview_id', interviewId)
        .order('question_index', { ascending: true })
      return many(res, 'list turns').map(toTurnRow)
    },

    async saveReflection(workspace: string, input: SaveReflectionInput): Promise<ReflectionRow> {
      const res = await client
        .from(PHASE1_TABLES.reflections)
        .upsert(
          {
            workspace_id: workspace,
            user_id: userId,
            interview_id: input.interviewId,
            role: input.role,
            readiness_label: input.readinessLabel,
            readiness_range: json(input.readinessRange),
            evidence: json(input.evidence),
            focus: input.focus,
            suggestion: input.suggestion,
            model: input.model,
          },
          { onConflict: 'interview_id' },
        )
        .select()
        .single()
      return toReflectionRow(one(res, 'save notes'))
    },

    async getReflection(workspace: string, interviewId: string): Promise<ReflectionRow | null> {
      const res = await client
        .from(PHASE1_TABLES.reflections)
        .select()
        .eq('interview_id', interviewId)
        .eq('workspace_id', workspace)
        .maybeSingle()
      const row = maybe(res, 'get notes')
      return row ? toReflectionRow(row) : null
    },

    async getProfile(workspace: string): Promise<ProfileRow | null> {
      const res = await client.from(PHASE1_TABLES.profiles).select().eq('workspace_id', workspace).maybeSingle()
      const row = maybe(res, 'get profile')
      return row ? toProfileRow(row) : null
    },

    async deleteProfile(workspace: string): Promise<void> {
      const { error } = await client.from(PHASE1_TABLES.profiles).delete().eq('workspace_id', workspace)
      throwIf(error, 'delete profile')
    },

    async saveProfile(workspace: string, input: ProfileInput): Promise<ProfileRow> {
      const res = await client
        .from(PHASE1_TABLES.profiles)
        .upsert(
          {
            workspace_id: workspace,
            user_id: userId,
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
      return toProfileRow(one(res, 'save profile'))
    },

    async createTarget(workspace: string, input: CreateTargetInput): Promise<Target> {
      const res = await client
        .from(PHASE1_TABLES.targets)
        .insert({
          workspace_id: workspace,
          user_id: userId,
          company: input.company,
          role: input.role,
          interview_date: input.interviewDate,
          jd: input.jd,
          skills: [],
          rounds: [],
          events: [],
          debriefs: [],
        })
        .select()
        .single()
      return toTarget(one(res, 'create target'))
    },

    getTarget,

    async listTargets(workspace: string): Promise<Target[]> {
      const res = await client
        .from(PHASE1_TABLES.targets)
        .select()
        .eq('workspace_id', workspace)
        .order('created_at', { ascending: false })
        .limit(50)
      return many(res, 'list targets').map(toTarget)
    },

    async updateTarget(workspace: string, id: string, patch: TargetPatch): Promise<Target | null> {
      const u: Update<'mirror_targets'> = {}
      if (patch.company !== undefined) u.company = patch.company
      if (patch.role !== undefined) u.role = patch.role
      if (patch.jd !== undefined) u.jd = patch.jd
      if (patch.status !== undefined) u.status = patch.status
      if (patch.interviewDate !== undefined) u.interview_date = patch.interviewDate
      if (patch.nextStep !== undefined) u.next_step = patch.nextStep
      if (patch.skills !== undefined) u.skills = json(patch.skills)
      if (patch.rounds !== undefined) u.rounds = json(patch.rounds)
      if (patch.events !== undefined) u.events = json(patch.events)
      if (patch.debriefs !== undefined) u.debriefs = json(patch.debriefs)
      if (Object.keys(u).length === 0) return getTarget(workspace, id)
      const res = await client.from(PHASE1_TABLES.targets).update(u).eq('id', id).eq('workspace_id', workspace).select().maybeSingle()
      throwIf(res.error, 'update target')
      return res.data ? toTarget(res.data) : null
    },

    async deleteTarget(workspace: string, id: string): Promise<void> {
      const { error } = await client.from(PHASE1_TABLES.targets).delete().eq('id', id).eq('workspace_id', workspace)
      throwIf(error, 'delete target')
    },

    async addPracticeAttempt(workspace: string, input: PracticeAttemptInput): Promise<PracticeAttemptRow> {
      const res = await client
        .from(PHASE1_TABLES.practiceAttempts)
        .insert({
          workspace_id: workspace,
          user_id: userId,
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
      return toAttempt(one(res, 'add practice attempt'))
    },

    async getPracticeAttempts(workspace: string, sinceIso?: string): Promise<PracticeAttemptRow[]> {
      let q = client.from(PHASE1_TABLES.practiceAttempts).select().eq('workspace_id', workspace)
      if (sinceIso) q = q.gte('created_at', sinceIso)
      const res = await q.order('created_at', { ascending: true }).limit(5000)
      return many(res, 'list practice attempts').map(toAttempt)
    },

    // ---- the five newer tables: scoped by user_id (and RLS), no workspace_id ----

    async addAnswerAttempt(workspace: string, input: AnswerAttemptInput): Promise<AnswerAttemptRow> {
      const res = await client.from(NEW_TABLES.answerAttempts).insert(answerAttemptInsert(userId, input)).select().single()
      const row = answerAttemptFromRow(userId, one(res, 'add answer attempt'))
      return { ...row, workspaceId: workspace, questionIndex: input.questionIndex }
    },

    async listAnswerAttempts(_workspace: string, filter?: AnswerAttemptFilter): Promise<AnswerAttemptRow[]> {
      const { kind, itemId, interviewId } = answerAttemptQuery(filter)
      let q = client.from(NEW_TABLES.answerAttempts).select().eq('user_id', userId)
      if (interviewId) q = q.eq('interview_id', interviewId)
      if (kind) q = q.eq('kind', kind)
      if (itemId) q = q.eq('item_id', itemId)
      const res = await q.order('created_at', { ascending: true })
      return many(res, 'list answer attempts').map(r => answerAttemptFromRow(userId, r))
    },

    async deleteAnswerAttempts(): Promise<void> {
      const { error } = await client.from(NEW_TABLES.answerAttempts).delete().eq('user_id', userId)
      throwIf(error, 'delete answer attempts')
    },

    async createStory(_workspace: string, input: StoryInput): Promise<StoryRow> {
      const res = await client.from(NEW_TABLES.stories).insert(storyInsert(userId, input)).select().single()
      return storyFromRow(userId, one(res, 'create story'))
    },

    async listStories(): Promise<StoryRow[]> {
      const res = await client
        .from(NEW_TABLES.stories)
        .select()
        .eq('user_id', userId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
      return many(res, 'list stories').map(r => storyFromRow(userId, r))
    },

    async getStory(_workspace: string, id: string): Promise<StoryRow | null> {
      const res = await client.from(NEW_TABLES.stories).select().eq('id', id).eq('user_id', userId).maybeSingle()
      const row = maybe(res, 'get story')
      return row ? storyFromRow(userId, row) : null
    },

    async updateStory(_workspace: string, id: string, patch: Partial<StoryInput>): Promise<StoryRow | null> {
      const res = await client
        .from(NEW_TABLES.stories)
        .update(storyPatch(patch, new Date().toISOString()))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle()
      throwIf(res.error, 'update story')
      return res.data ? storyFromRow(userId, res.data) : null
    },

    async deleteStory(_workspace: string, id: string): Promise<void> {
      const { error } = await client.from(NEW_TABLES.stories).delete().eq('id', id).eq('user_id', userId)
      throwIf(error, 'delete story')
    },

    async deleteAllStories(): Promise<void> {
      const { error } = await client.from(NEW_TABLES.stories).delete().eq('user_id', userId)
      throwIf(error, 'delete stories')
    },

    async replaceResumeClaims(_workspace: string, claims: ResumeClaimInput[]): Promise<ResumeClaimRow[]> {
      // Matches point at claims; detach them first so the delete cannot be blocked by that link.
      const detach = await client.from(NEW_TABLES.gapMatches).update({ claim_id: null }).eq('user_id', userId)
      throwIf(detach.error, 'detach gap matches')
      const del = await client.from(NEW_TABLES.resumeClaims).delete().eq('user_id', userId)
      throwIf(del.error, 'delete resume claims')
      if (claims.length === 0) return []
      const res = await client.from(NEW_TABLES.resumeClaims).insert(claims.map(c => claimInsert(userId, c))).select()
      const rows = many(res, 'save resume claims')
      // The caller's flags win over the recomputed ones for this response.
      return rows.map((r, i) => ({ ...claimFromRow(userId, r), ...(claims[i] ?? {}) }))
    },

    async listResumeClaims(): Promise<ResumeClaimRow[]> {
      return (await claimRows()).map(r => claimFromRow(userId, r))
    },

    async deleteResumeClaims(): Promise<void> {
      const detach = await client.from(NEW_TABLES.gapMatches).update({ claim_id: null }).eq('user_id', userId)
      throwIf(detach.error, 'detach gap matches')
      const { error } = await client.from(NEW_TABLES.resumeClaims).delete().eq('user_id', userId)
      throwIf(error, 'delete resume claims')
    },

    async replaceGapMatches(_workspace: string, targetId: string, rows: Omit<GapMatchInput, 'targetId'>[]): Promise<GapMatchRow[]> {
      const claimIds = new Map<string, string>()
      for (const c of await claimRows()) claimIds.set(c.source_quote ?? c.claim, c.id)
      const del = await client.from(NEW_TABLES.gapMatches).delete().eq('user_id', userId).eq('target_id', targetId)
      throwIf(del.error, 'delete gap matches')
      if (rows.length === 0) return []
      const res = await client
        .from(NEW_TABLES.gapMatches)
        .insert(rows.map(r => gapMatchInsert(userId, targetId, r, r.claimQuote ? (claimIds.get(r.claimQuote) ?? null) : null)))
        .select()
      const saved = many(res, 'save gap matches')
      // Only the stored columns persist; this response keeps the caller's area, probe and source.
      return saved.map((r, i) => {
        const src = rows[i]
        return { ...gapMatchFromRow(userId, r, src?.claimQuote ?? null), ...(src ? { area: src.area, probeQuestion: src.probeQuestion, source: src.source } : {}) }
      })
    },

    listGapMatches,

    async upsertReplayItem(_workspace: string, input: ReplayItemInput) {
      // Look the row up by item_key (one row per item per user) instead of relying on ON CONFLICT.
      const found = await client
        .from(NEW_TABLES.replaySchedule)
        .select()
        .eq('user_id', userId)
        .eq('item_key', input.itemId)
        .maybeSingle()
      const existing = maybe(found, 'find replay item')
      const payload = replayInsert(userId, input, new Date().toISOString())
      const res = existing
        ? await client.from(NEW_TABLES.replaySchedule).update(payload).eq('id', existing.id).eq('user_id', userId).select().single()
        : await client.from(NEW_TABLES.replaySchedule).insert(payload).select().single()
      return replayFromRow(userId, one(res, 'save replay item'))
    },

    async listReplaySchedule() {
      const res = await client
        .from(NEW_TABLES.replaySchedule)
        .select()
        .eq('user_id', userId)
        .order('due_at', { ascending: true })
      return many(res, 'list replay schedule').map(r => replayFromRow(userId, r))
    },

    async deleteReplayItem(_workspace: string, itemId: string): Promise<void> {
      const { error } = await client
        .from(NEW_TABLES.replaySchedule)
        .delete()
        .eq('user_id', userId)
        .eq('item_key', itemId)
      throwIf(error, 'delete replay item')
    },

    async deleteAllNewData(): Promise<void> {
      await deleteSteps(newDataSteps())
    },

    async exportAllData(workspace: string): Promise<RepoExport> {
      const mine = <T extends { eq(c: string, v: string): T }>(q: T): T => q.eq('workspace_id', workspace).eq('user_id', userId)
      const [profile, turns, reflections, targets, practice, answers, stories, claims, matches, replay] = await Promise.all([
        mine(client.from(PHASE1_TABLES.profiles).select()).maybeSingle(),
        mine(client.from(PHASE1_TABLES.turns).select()).order('created_at', { ascending: true }),
        mine(client.from(PHASE1_TABLES.reflections).select()).order('created_at', { ascending: true }),
        mine(client.from(PHASE1_TABLES.targets).select()).order('created_at', { ascending: true }),
        mine(client.from(PHASE1_TABLES.practiceAttempts).select()).order('created_at', { ascending: true }),
        client.from(NEW_TABLES.answerAttempts).select().eq('user_id', userId).order('created_at', { ascending: true }),
        client.from(NEW_TABLES.stories).select().eq('user_id', userId).order('created_at', { ascending: true }),
        claimRows(),
        client.from(NEW_TABLES.gapMatches).select().eq('user_id', userId).order('created_at', { ascending: true }),
        client.from(NEW_TABLES.replaySchedule).select().eq('user_id', userId).order('due_at', { ascending: true }),
      ])
      const interviews = await listInterviewsAll(workspace)
      const profileRow = maybe(profile, 'export profile')
      return {
        exportedAt: new Date().toISOString(),
        workspace,
        profile: profileRow ? toProfileRow(profileRow) : null,
        interviews,
        turns: many(turns, 'export turns').map(toTurnRow),
        reflections: many(reflections, 'export notes').map(toReflectionRow),
        targets: many(targets, 'export targets').map(toTarget),
        practiceAttempts: many(practice, 'export practice attempts').map(toAttempt),
        answerAttempts: many(answers, 'export answer attempts').map(r => answerAttemptFromRow(userId, r)),
        stories: many(stories, 'export stories').map(r => storyFromRow(userId, r)),
        resumeClaims: claims.map(r => claimFromRow(userId, r)),
        gapMatches: await gapMatchesFor(many(matches, 'export gap matches')),
        replaySchedule: many(replay, 'export replay schedule').map(r => replayFromRow(userId, r)),
      }
    },

    async deleteAllData(workspace: string): Promise<void> {
      // The mirror_workspaces row stays. Children go before parents.
      await deleteSteps([
        ...newDataSteps(),
        ['notes', () => client.from(PHASE1_TABLES.reflections).delete().eq('workspace_id', workspace).eq('user_id', userId)],
        ['turns', () => client.from(PHASE1_TABLES.turns).delete().eq('workspace_id', workspace).eq('user_id', userId)],
        ['interviews', () => client.from(PHASE1_TABLES.interviews).delete().eq('workspace_id', workspace).eq('user_id', userId)],
        ['practice attempts', () => client.from(PHASE1_TABLES.practiceAttempts).delete().eq('workspace_id', workspace).eq('user_id', userId)],
        ['targets', () => client.from(PHASE1_TABLES.targets).delete().eq('workspace_id', workspace).eq('user_id', userId)],
        ['profile', () => client.from(PHASE1_TABLES.profiles).delete().eq('workspace_id', workspace).eq('user_id', userId)],
      ])
    },
  }
}
