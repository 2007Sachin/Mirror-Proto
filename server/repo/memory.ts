import type {
  AddTurnInput,
  CreateInterviewInput,
  InterviewRow,
  ReflectionRow,
  Repository,
  SaveReflectionInput,
  TurnRow,
} from './types.js'

interface WorkspaceBucket {
  interviews: Map<string, InterviewRow>
  turns: Map<string, TurnRow[]>
  reflections: Map<string, ReflectionRow>
}

/**
 * In-memory repository. Everything is keyed workspace-first — a workspace
 * bucket owns its rows, so cross-workspace reads are structurally impossible.
 */
export function createMemoryRepository(): Repository {
  const workspaces = new Map<string, WorkspaceBucket>()

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
        createdAt: new Date().toISOString(),
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

    async listInterviewsByRole(workspace: string, role: string): Promise<InterviewRow[]> {
      const b = workspaces.get(workspace)
      if (!b) return []
      return [...b.interviews.values()].filter(i => i.role === role)
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
      const row: ReflectionRow = {
        id: crypto.randomUUID(),
        interviewId: input.interviewId,
        workspaceId: workspace,
        role: input.role,
        readinessLabel: input.readinessLabel,
        readinessRange: input.readinessRange,
        evidence: input.evidence,
        focus: input.focus,
        model: input.model,
        createdAt: new Date().toISOString(),
      }
      b.reflections.set(input.interviewId, row)
      return row
    },

    async getReflection(workspace: string, interviewId: string): Promise<ReflectionRow | null> {
      return workspaces.get(workspace)?.reflections.get(interviewId) ?? null
    },
  }
}
