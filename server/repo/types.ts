export type InterviewStatus = 'in_progress' | 'completed' | 'abandoned'
export type TranscriptSource = 'text' | 'voice'

export interface InterviewRow {
  id: string
  workspaceId: string
  role: string
  industry: string | null
  status: InterviewStatus
  askedQuestions: string[]
  createdAt: string
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

export interface Repository {
  ensureWorkspace(slug: string): Promise<void>
  createInterview(workspace: string, input: CreateInterviewInput): Promise<InterviewRow>
  getInterview(workspace: string, id: string): Promise<InterviewRow | null>
  updateInterviewStatus(workspace: string, id: string, status: InterviewStatus): Promise<void>
  appendAskedQuestion(workspace: string, id: string, question: string): Promise<InterviewRow | null>
  listInterviewsByRole(workspace: string, role: string): Promise<InterviewRow[]>
  /** Newest first. */
  listInterviews(workspace: string): Promise<InterviewRow[]>
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
}
