export type InterviewStatus = 'in_progress' | 'completed' | 'abandoned'
export type TranscriptSource = 'text' | 'voice'
export type InterviewKind = 'practice' | 'screen'

export interface InterviewRow {
  id: string
  workspaceId: string
  role: string
  industry: string | null
  status: InterviewStatus
  askedQuestions: string[]
  createdAt: string
  /** Absent on rows written before screens existed; read as 'practice'. */
  kind?: InterviewKind
  /** Questions this interview asks; null/absent means the practice default (four). */
  questionCap?: number | null
  timeCapSeconds?: number | null
  startedAt?: string | null
  targetId?: string | null
}

export interface TurnRow {
  id: string
  interviewId: string
  workspaceId: string
  questionIndex: number
  question: string
  answer: string
  transcriptSource: TranscriptSource
  createdAt: string
}

export interface EvidenceItem {
  turnId: string
  quote: string
  observation: string
  competency: string
}

export interface ReflectionRow {
  id: string
  interviewId: string
  workspaceId: string
  role: string
  /** No longer generated (reflections are not scored); kept for rows written before. */
  readinessLabel: 'emerging' | 'solid' | 'strong' | null
  readinessRange: { low: number; high: number } | null
  evidence: EvidenceItem[]
  /** "Keep working on": the gap still open. */
  focus: string
  suggestion: string | null
  model: string
  createdAt: string
}

/** What "The First Interview" learned about the candidate. One row per workspace. */
export interface ProfileInput {
  role: string
  story: string
  pressureQuestion: string
  pressureAnswer: string
  summary: string
  focus: string
  firstQuestion: string
  resumeText: string | null
  resumeName: string | null
  mode: 'text' | 'voice'
}

export interface ProfileRow extends ProfileInput {
  workspaceId: string
  createdAt: string
}

export interface CreateInterviewInput {
  role: string
  industry?: string
  openingQuestion: string
  kind?: InterviewKind
  questionCap?: number | null
  timeCapSeconds?: number | null
  startedAt?: string | null
  targetId?: string | null
  /** Seeds ALL questions at once (a screen). Overrides openingQuestion. */
  askedQuestions?: string[]
}

export interface AddTurnInput {
  questionIndex: number
  question: string
  answer: string
  transcriptSource: TranscriptSource
}

export interface SaveReflectionInput {
  interviewId: string
  role: string
  /** No longer generated (reflections are not scored); kept for rows written before. */
  readinessLabel: 'emerging' | 'solid' | 'strong' | null
  readinessRange: { low: number; high: number } | null
  evidence: EvidenceItem[]
  /** "Keep working on": the gap still open. */
  focus: string
  suggestion: string | null
  model: string
}

export type SkillArea = 'sql' | 'python' | 'tools' | 'analytics' | 'behavioural'
export type RoundKind = 'sql' | 'python' | 'tools' | 'behavioural'

export interface Skill {
  name: string
  area: SkillArea
  weight: 'core' | 'nice'
  /** Verbatim phrase from the JD (a substring of it). */
  quote: string
}

export interface Round {
  id: string
  kind: RoundKind
  title: string
  why: string
  available: boolean
}

export interface AgentEvent {
  at: string
  agent: 'Scout' | 'Planner' | 'Interviewer' | 'Coach'
  text: string
  /** Set on Planner lines: whether the model or the plain fallback wrote it. */
  source?: 'ai' | 'fallback'
}

export interface Debrief {
  id: string
  kind: 'sql'
  createdAt: string
  solved: number
  total: number
  wentWell: string
  keepWorkingOn: string
  suggestion: string
}

export interface Target {
  id: string
  company: string
  role: string
  interviewDate: string | null
  jd: string
  status: 'scouting' | 'ready'
  skills: Skill[]
  rounds: Round[]
  events: AgentEvent[]
  debriefs: Debrief[]
  nextStep: string | null
  createdAt: string
}

export type CreateTargetInput = Pick<Target, 'company' | 'role' | 'interviewDate' | 'jd'>
export type TargetPatch = Partial<Omit<Target, 'id' | 'createdAt'>>

export type PracticeTrack = 'sql' | 'python' | 'stats' | 'case'

export interface PracticeAttemptInput {
  itemId: string
  track: PracticeTrack
  topic: string
  level: 1 | 2 | 3
  correct: boolean
  seconds: number
  hintsUsed: number
}

export interface PracticeAttemptRow extends PracticeAttemptInput {
  id: string
  createdAt: string
}

// ---- New data stores (memory now; Supabase throws storage_not_ready until auth lands). All scoped by workspace. ----

export interface AnswerAttemptInput {
  interviewId: string | null
  questionIndex: number | null
  question: string
  attempt: number
  answer: string
  kind: 'retry' | 'explain'
  itemId?: string | null
  transcriptSource: TranscriptSource
}
export interface AnswerAttemptRow extends AnswerAttemptInput {
  id: string
  workspaceId: string
  createdAt: string
}
export interface AnswerAttemptFilter {
  interviewId?: string
  itemId?: string
  kind?: AnswerAttemptInput['kind']
}

export interface StoryInput {
  title: string
  themes: string[]
  situation: string
  task: string
  action: string
  result: string
  quote: string | null
  question: string | null
  sourceInterviewId: string | null
  sourceTurnId: string | null
}
export interface StoryRow extends StoryInput {
  id: string
  workspaceId: string
  createdAt: string
  updatedAt: string
}

export interface ResumeClaimInput {
  quote: string
  skills: string[]
  hasNumber: boolean
  vague: boolean
}
export interface ResumeClaimRow extends ResumeClaimInput {
  id: string
  workspaceId: string
  createdAt: string
}

export interface GapMatchInput {
  targetId: string
  skill: string
  area: string
  weight: 'core' | 'nice'
  status: 'covered' | 'partial' | 'gap'
  claimQuote: string | null
  note: string
  probeQuestion: string | null
  source: 'ai' | 'fallback'
}
export interface GapMatchRow extends GapMatchInput {
  id: string
  workspaceId: string
  createdAt: string
}

/** A typed contract only; the first scheduler is stateless. */
export type ReplayItemKind = 'question' | 'pattern' | 'practice_item'
export interface ReplayItemInput {
  itemId: string
  /** What kind of thing is scheduled; the SQL practice schedule uses 'practice_item' (the default). */
  kind?: ReplayItemKind
  dueAt: string
  intervalDays: number
  rung: number
  lastResult: boolean | null
}
export interface ReplayItemRow extends ReplayItemInput {
  id: string
  workspaceId: string
  updatedAt: string
}

/** Everything stored for one user; what the export returns. */
export interface RepoExport {
  exportedAt: string
  workspace: string
  /** The mirror_workspaces row itself (it stays after Delete all my data). */
  workspaceRow: { slug: string; createdAt: string } | null
  profile: ProfileRow | null
  interviews: InterviewRow[]
  turns: TurnRow[]
  reflections: ReflectionRow[]
  targets: Target[]
  practiceAttempts: PracticeAttemptRow[]
  answerAttempts: AnswerAttemptRow[]
  stories: StoryRow[]
  resumeClaims: ResumeClaimRow[]
  gapMatches: GapMatchRow[]
  replaySchedule: ReplayItemRow[]
}

export interface Repository {
  ensureWorkspace(slug: string): Promise<void>
  createInterview(workspace: string, input: CreateInterviewInput): Promise<InterviewRow>
  getInterview(workspace: string, id: string): Promise<InterviewRow | null>
  updateInterviewStatus(workspace: string, id: string, status: InterviewStatus): Promise<void>
  appendAskedQuestion(workspace: string, id: string, question: string): Promise<InterviewRow | null>
  listInterviewsByRole(workspace: string, role: string): Promise<InterviewRow[]>
  /** Newest first. `before` is a createdAt cursor: only older rows. Without `limit`, memory returns all and Supabase 20. */
  listInterviews(workspace: string, page?: { limit?: number; before?: string }): Promise<InterviewRow[]>
  addTurn(workspace: string, interviewId: string, input: AddTurnInput): Promise<TurnRow>
  getTurns(workspace: string, interviewId: string): Promise<TurnRow[]>
  saveReflection(workspace: string, input: SaveReflectionInput): Promise<ReflectionRow>
  getReflection(workspace: string, interviewId: string): Promise<ReflectionRow | null>
  getProfile(workspace: string): Promise<ProfileRow | null>
  saveProfile(workspace: string, input: ProfileInput): Promise<ProfileRow>
  deleteProfile(workspace: string): Promise<void>
  createTarget(workspace: string, input: CreateTargetInput): Promise<Target>
  getTarget(workspace: string, id: string): Promise<Target | null>
  /** Newest first. */
  listTargets(workspace: string): Promise<Target[]>
  updateTarget(workspace: string, id: string, patch: TargetPatch): Promise<Target | null>
  deleteTarget(workspace: string, id: string): Promise<void>
  addPracticeAttempt(workspace: string, input: PracticeAttemptInput): Promise<PracticeAttemptRow>
  /** Oldest first, capped at 5000 rows. */
  getPracticeAttempts(workspace: string, sinceIso?: string): Promise<PracticeAttemptRow[]>

  /** Oldest first. */
  addAnswerAttempt(workspace: string, input: AnswerAttemptInput): Promise<AnswerAttemptRow>
  listAnswerAttempts(workspace: string, filter?: AnswerAttemptFilter): Promise<AnswerAttemptRow[]>
  deleteAnswerAttempts(workspace: string): Promise<void>
  createStory(workspace: string, input: StoryInput): Promise<StoryRow>
  /** Newest first. */
  listStories(workspace: string): Promise<StoryRow[]>
  getStory(workspace: string, id: string): Promise<StoryRow | null>
  updateStory(workspace: string, id: string, patch: Partial<StoryInput>): Promise<StoryRow | null>
  deleteStory(workspace: string, id: string): Promise<void>
  deleteAllStories(workspace: string): Promise<void>
  replaceResumeClaims(workspace: string, claims: ResumeClaimInput[]): Promise<ResumeClaimRow[]>
  listResumeClaims(workspace: string): Promise<ResumeClaimRow[]>
  deleteResumeClaims(workspace: string): Promise<void>
  replaceGapMatches(workspace: string, targetId: string, rows: Omit<GapMatchInput, 'targetId'>[]): Promise<GapMatchRow[]>
  listGapMatches(workspace: string, targetId: string): Promise<GapMatchRow[]>
  /** One row per itemId. */
  upsertReplayItem(workspace: string, input: ReplayItemInput): Promise<ReplayItemRow>
  /** Soonest due first. */
  listReplaySchedule(workspace: string): Promise<ReplayItemRow[]>
  deleteReplayItem(workspace: string, itemId: string): Promise<void>
  /** Clears every store above for the workspace (reset). */
  deleteAllNewData(workspace: string): Promise<void>
  /** Every row of this workspace, for the user's data export. */
  exportAllData(workspace: string): Promise<RepoExport>
  /** Removes everything of this workspace except the workspace row itself. */
  deleteAllData(workspace: string): Promise<void>
}
