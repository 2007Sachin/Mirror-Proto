import type {
  AddTurnInput,
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
  CreateInterviewInput,
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

interface WorkspaceBucket {
  interviews: Map<string, InterviewRow>
  turns: Map<string, TurnRow[]>
  reflections: Map<string, ReflectionRow>
}

export function createMemoryRepository(): Repository {
  const workspaces = new Map<string, WorkspaceBucket>()
  const profiles = new Map<string, ProfileRow>()
  const targets = new Map<string, Target[]>() // per workspace, oldest first
  const attempts = new Map<string, PracticeAttemptRow[]>() // per workspace, oldest first
  const answerAttempts = new Map<string, AnswerAttemptRow[]>() // oldest first
  const stories = new Map<string, StoryRow[]>() // oldest first
  const claims = new Map<string, ResumeClaimRow[]>()
  const gapMatches = new Map<string, GapMatchRow[]>() // per workspace, all targets
  const replay = new Map<string, ReplayItemRow[]>()
  const now = () => new Date().toISOString()
  const clearNew = (workspace: string) => {
    for (const m of [answerAttempts, stories, claims, gapMatches, replay]) m.delete(workspace)
  }

  const bucket = (slug: string): WorkspaceBucket => {
    let b = workspaces.get(slug)
    if (!b) {
      b = { interviews: new Map(), turns: new Map(), reflections: new Map() }
      workspaces.set(slug, b)
    }
    return b
  }

  return {
    async ensureWorkspace(slug: string): Promise<void> {
      bucket(slug)
    },

    async createInterview(workspace: string, input: CreateInterviewInput): Promise<InterviewRow> {
      const b = bucket(workspace)
      const row: InterviewRow = {
        id: crypto.randomUUID(),
        workspaceId: workspace,
        role: input.role,
        industry: input.industry ?? null,
        status: 'in_progress',
        askedQuestions: input.askedQuestions?.length ? [...input.askedQuestions] : [input.openingQuestion],
        createdAt: new Date().toISOString(),
        kind: input.kind ?? 'practice',
        questionCap: input.questionCap ?? null,
        timeCapSeconds: input.timeCapSeconds ?? null,
        startedAt: input.startedAt ?? null,
        targetId: input.targetId ?? null,
      }
      b.interviews.set(row.id, row)
      b.turns.set(row.id, [])
      return row
    },

    async getInterview(workspace: string, id: string): Promise<InterviewRow | null> {
      return workspaces.get(workspace)?.interviews.get(id) ?? null
    },

    async updateInterviewStatus(workspace: string, id: string, status: InterviewRow['status']): Promise<void> {
      const row = workspaces.get(workspace)?.interviews.get(id)
      if (row) row.status = status
    },

    async appendAskedQuestion(workspace: string, id: string, question: string): Promise<InterviewRow | null> {
      const row = workspaces.get(workspace)?.interviews.get(id)
      if (!row) return null
      row.askedQuestions = [...row.askedQuestions, question]
      return row
    },

    async listInterviewsByRole(workspace: string, role: string): Promise<InterviewRow[]> {
      const b = workspaces.get(workspace)
      if (!b) return []
      return [...b.interviews.values()].filter(i => i.role === role)
    },

    async listInterviews(workspace: string, page?: { limit?: number; before?: string }): Promise<InterviewRow[]> {
      const all = [...(workspaces.get(workspace)?.interviews.values() ?? [])].reverse()
      const older = page?.before ? all.filter(i => i.createdAt < page.before!) : all
      return page?.limit ? older.slice(0, page.limit) : older
    },

    async addTurn(workspace: string, interviewId: string, input: AddTurnInput): Promise<TurnRow> {
      const b = bucket(workspace)
      const row: TurnRow = {
        id: crypto.randomUUID(),
        interviewId,
        workspaceId: workspace,
        questionIndex: input.questionIndex,
        question: input.question,
        answer: input.answer,
        transcriptSource: input.transcriptSource,
        createdAt: new Date().toISOString(),
      }
      const list = b.turns.get(interviewId) ?? []
      list.push(row)
      b.turns.set(interviewId, list)
      return row
    },

    async getTurns(workspace: string, interviewId: string): Promise<TurnRow[]> {
      const b = workspaces.get(workspace)
      if (!b) return []
      return [...(b.turns.get(interviewId) ?? [])].sort((a, b2) => a.questionIndex - b2.questionIndex)
    },

    async saveReflection(workspace: string, input: SaveReflectionInput): Promise<ReflectionRow> {
      const b = bucket(workspace)
      const existing = b.reflections.get(input.interviewId)
      const row: ReflectionRow = {
        id: existing?.id ?? crypto.randomUUID(),
        interviewId: input.interviewId,
        workspaceId: workspace,
        role: input.role,
        readinessLabel: input.readinessLabel,
        readinessRange: input.readinessRange,
        evidence: input.evidence,
        focus: input.focus,
        suggestion: input.suggestion,
        model: input.model,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      }
      b.reflections.set(input.interviewId, row)
      return row
    },

    async getReflection(workspace: string, interviewId: string): Promise<ReflectionRow | null> {
      return workspaces.get(workspace)?.reflections.get(interviewId) ?? null
    },

    async getProfile(workspace: string): Promise<ProfileRow | null> {
      return profiles.get(workspace) ?? null
    },

    async deleteProfile(workspace: string): Promise<void> {
      profiles.delete(workspace)
      clearNew(workspace)
    },

    async saveProfile(workspace: string, input: ProfileInput): Promise<ProfileRow> {
      const row: ProfileRow = { ...input, workspaceId: workspace, createdAt: new Date().toISOString() }
      profiles.set(workspace, row)
      return row
    },

    async createTarget(workspace: string, input: CreateTargetInput): Promise<Target> {
      const row: Target = {
        ...input,
        id: crypto.randomUUID(),
        status: 'scouting',
        skills: [],
        rounds: [],
        events: [],
        debriefs: [],
        nextStep: null,
        createdAt: new Date().toISOString(),
      }
      targets.set(workspace, [...(targets.get(workspace) ?? []), row])
      return row
    },

    async getTarget(workspace: string, id: string): Promise<Target | null> {
      return targets.get(workspace)?.find(t => t.id === id) ?? null
    },

    async listTargets(workspace: string): Promise<Target[]> {
      return [...(targets.get(workspace) ?? [])].reverse()
    },

    async updateTarget(workspace: string, id: string, patch: TargetPatch): Promise<Target | null> {
      const list = targets.get(workspace)
      const i = list?.findIndex(t => t.id === id) ?? -1
      if (!list || i < 0) return null
      list[i] = { ...list[i], ...patch }
      return list[i]
    },

    async deleteTarget(workspace: string, id: string): Promise<void> {
      targets.set(workspace, (targets.get(workspace) ?? []).filter(t => t.id !== id))
      gapMatches.set(workspace, (gapMatches.get(workspace) ?? []).filter(m => m.targetId !== id))
    },

    async addPracticeAttempt(workspace: string, input: PracticeAttemptInput): Promise<PracticeAttemptRow> {
      const row: PracticeAttemptRow = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
      attempts.set(workspace, [...(attempts.get(workspace) ?? []), row])
      return row
    },

    async getPracticeAttempts(workspace: string, sinceIso?: string): Promise<PracticeAttemptRow[]> {
      return (attempts.get(workspace) ?? []).filter(a => !sinceIso || a.createdAt >= sinceIso).slice(0, 5000)
    },

    async addAnswerAttempt(workspace: string, input: AnswerAttemptInput) {
      const row: AnswerAttemptRow = { ...input, itemId: input.itemId ?? null, id: crypto.randomUUID(), workspaceId: workspace, createdAt: now() }
      answerAttempts.set(workspace, [...(answerAttempts.get(workspace) ?? []), row])
      return row
    },
    async listAnswerAttempts(workspace: string, f?: AnswerAttemptFilter) {
      return (answerAttempts.get(workspace) ?? []).filter(
        a => (!f?.interviewId || a.interviewId === f.interviewId) && (!f?.itemId || a.itemId === f.itemId) && (!f?.kind || a.kind === f.kind),
      )
    },
    async deleteAnswerAttempts(workspace: string) {
      answerAttempts.delete(workspace)
    },

    async createStory(workspace: string, input: StoryInput) {
      const at = now()
      const row: StoryRow = { ...input, id: crypto.randomUUID(), workspaceId: workspace, createdAt: at, updatedAt: at }
      stories.set(workspace, [...(stories.get(workspace) ?? []), row])
      return row
    },
    async listStories(workspace: string) {
      return [...(stories.get(workspace) ?? [])].reverse()
    },
    async getStory(workspace: string, id: string) {
      return stories.get(workspace)?.find(s => s.id === id) ?? null
    },
    async updateStory(workspace: string, id: string, patch: Partial<StoryInput>) {
      const list = stories.get(workspace)
      const i = list?.findIndex(s => s.id === id) ?? -1
      if (!list || i < 0) return null
      list[i] = { ...list[i], ...patch, id, workspaceId: workspace, createdAt: list[i].createdAt, updatedAt: now() }
      return list[i]
    },
    async deleteStory(workspace: string, id: string) {
      stories.set(workspace, (stories.get(workspace) ?? []).filter(s => s.id !== id))
    },
    async deleteAllStories(workspace: string) {
      stories.delete(workspace)
    },

    async replaceResumeClaims(workspace: string, input: ResumeClaimInput[]) {
      const rows = input.map(c => ({ ...c, id: crypto.randomUUID(), workspaceId: workspace, createdAt: now() }))
      claims.set(workspace, rows)
      return [...rows]
    },
    async listResumeClaims(workspace: string) {
      return [...(claims.get(workspace) ?? [])]
    },
    async deleteResumeClaims(workspace: string) {
      claims.delete(workspace)
    },

    async replaceGapMatches(workspace: string, targetId: string, input: Omit<GapMatchInput, 'targetId'>[]) {
      const rows = input.map(m => ({ ...m, targetId, id: crypto.randomUUID(), workspaceId: workspace, createdAt: now() }))
      gapMatches.set(workspace, [...(gapMatches.get(workspace) ?? []).filter(m => m.targetId !== targetId), ...rows])
      return rows
    },
    async listGapMatches(workspace: string, targetId: string) {
      return (gapMatches.get(workspace) ?? []).filter(m => m.targetId === targetId)
    },

    async upsertReplayItem(workspace: string, input: ReplayItemInput) {
      const list = replay.get(workspace) ?? []
      const i = list.findIndex(r => r.itemId === input.itemId)
      const row: ReplayItemRow = { ...input, id: i >= 0 ? list[i].id : crypto.randomUUID(), workspaceId: workspace, updatedAt: now() }
      if (i >= 0) list[i] = row
      else list.push(row)
      replay.set(workspace, list)
      return row
    },
    async listReplaySchedule(workspace: string) {
      return [...(replay.get(workspace) ?? [])].sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    },
    async deleteReplayItem(workspace: string, itemId: string) {
      replay.set(workspace, (replay.get(workspace) ?? []).filter(r => r.itemId !== itemId))
    },
    async deleteAllNewData(workspace: string) {
      clearNew(workspace)
    },
  }
}
