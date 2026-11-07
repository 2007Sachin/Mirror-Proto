// Typed client for the MIRROR Phase-1 backend (see server/).
// Same-origin by default: vite.config.ts proxies /api → http://localhost:8787.

export const DEV_WORKSPACE = 'dev'

const BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

export type TranscriptSource = 'text' | 'voice'
export type InterviewStatus = 'in_progress' | 'completed' | 'abandoned'

export interface Turn {
  id: string
  questionIndex: number
  question: string
  answer: string
  transcriptSource: TranscriptSource
  createdAt?: string
}

export interface EvidenceItem {
  turnId: string
  quote: string
  observation: string
  competency: string
}

export interface Reflection {
  id: string
  interviewId: string
  readinessLabel: 'emerging' | 'solid' | 'strong'
  readinessRange: { low: number; high: number } | null
  evidence: EvidenceItem[]
  focus: string
  model: string
  createdAt?: string
}

export interface InterviewSession {
  id: string
  workspace: string
  role: string
  industry: string | null
  status: InterviewStatus
  questions: string[]
  currentQuestion: string | null
  pendingFollowUp: boolean
  nextQuestionIndex: number | null
  turns: Turn[]
  reflection: Reflection | null
  createdAt: string
}

export interface TurnResponse {
  turn: Turn
  nextQuestion: string | null
  nextQuestionIndex: number | null
  status: InterviewStatus
  saved: boolean
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'X-Dev-Workspace': DEV_WORKSPACE,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : `request_failed_${res.status}`
    throw new ApiError(res.status, message, body)
  }
  return body as T
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly body: unknown

  constructor(status: number, code: string, body: unknown) {
    super(code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.body = body
  }
}

export const api = {
  health: () => request<{ status: string; mode: string; uptime: number }>('/health'),
  createInterview: (role: string, industry?: string) =>
    request<InterviewSession>('/interviews', { method: 'POST', body: JSON.stringify({ role, industry }) }),
  submitTurn: (interviewId: string, questionIndex: number, answer: string) =>
    request<TurnResponse>(
      `/interviews/${interviewId}/turns`,
      { method: 'POST', body: JSON.stringify({ questionIndex, answer, transcriptSource: 'text' }) },
    ),
  nextQuestion: (interviewId: string) =>
    request<{ nextQuestion: string; nextQuestionIndex: number; status: InterviewStatus }>(
      `/interviews/${interviewId}/next-question`,
      { method: 'POST' },
    ),
  getInterview: (interviewId: string) => request<InterviewSession>(`/interviews/${interviewId}`),
  complete: (interviewId: string) =>
    request<InterviewSession>(`/interviews/${interviewId}/complete`, { method: 'POST' }),
  abandon: (interviewId: string) =>
    request<InterviewSession>(`/interviews/${interviewId}/abandon`, { method: 'POST' }),
  reflect: (interviewId: string) =>
    request<Reflection>(`/interviews/${interviewId}/reflect`, { method: 'POST' }),
}
