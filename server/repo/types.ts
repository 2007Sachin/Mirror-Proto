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
  readinessLabel: 'emerging' | 'solid' | 'strong'
  readinessRange: { low: number; high: number } | null
  evidence: EvidenceItem[]
  focus: string
  model: string
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
  readinessLabel: 'emerging' | 'solid' | 'strong'
  readinessRange: { low: number; high: number } | null
  evidence: EvidenceItem[]
  focus: string
  model: string
}

export interface Repository {
  ensureWorkspace(slug: string): Promise<void>
  createInterview(workspace: string, input: CreateInterviewInput): Promise<InterviewRow>
  getInterview(workspace: string, id: string): Promise<InterviewRow | null>
  updateInterviewStatus(workspace: string, id: string, status: InterviewStatus): Promise<void>
  appendAskedQuestion(workspace: string, id: string, question: string): Promise<InterviewRow | null>
  listInterviewsByRole(workspace: string, role: string): Promise<InterviewRow[]>
  addTurn(workspace: string, interviewId: string, input: AddTurnInput): Promise<TurnRow>
  getTurns(workspace: string, interviewId: string): Promise<TurnRow[]>
  saveReflection(workspace: string, input: SaveReflectionInput): Promise<ReflectionRow>
  getReflection(workspace: string, interviewId: string): Promise<ReflectionRow | null>
}
