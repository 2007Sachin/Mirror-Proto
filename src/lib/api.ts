// Typed client for the MIRROR Phase-1 backend (see server/).
// Same-origin by default: vite.config.ts proxies /api → http://localhost:8787.

import type { AttemptReport, PracticeSummary } from '../practice/types'

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
  readinessLabel: 'emerging' | 'solid' | 'strong' | null
  readinessRange: { low: number; high: number } | null
  evidence: EvidenceItem[]
  /** "Keep working on". */
  focus: string
  suggestion: string | null
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

/** What The First Interview learned. Saved once; the agent reads it for every later interview. */
export interface Profile {
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

/** One row of "Recent practice" on the Overview. */
export interface InterviewSummary {
  id: string
  role: string
  status: InterviewStatus
  createdAt: string
  answered: number
  /** Present once a finished session has its notes. */
  notes: { keepWorkingOn: string; quotes: string[] } | null
}

/** The Overview's Coach's note. `practiceQuestion` opens the suggested practice. */
export interface CoachNote {
  observation: string
  nextPractice: string
  practiceQuestion: string
  basedOn: 'interview' | 'first-interview'
}

export type OnboardingStep =
  | { step: 'opening'; resume: string }
  | { step: 'pressure'; story: string; resume?: string }
  | { step: 'contract'; story: string; question: string; answer: string; resume?: string }

// The Loop (docs/LOOP-CONTRACT.md): targets, Scout's skill map, rounds, debriefs.
export type SkillArea = 'sql' | 'python' | 'tools' | 'analytics' | 'behavioural'
export type RoundKind = 'sql' | 'python' | 'tools' | 'behavioural'
export interface Skill { name: string; area: SkillArea; weight: 'core' | 'nice'; quote: string }
export interface Round { id: string; kind: RoundKind; title: string; why: string; available: boolean }
export interface AgentEvent { at: string; agent: 'Scout' | 'Planner' | 'Interviewer' | 'Coach'; text: string }
export interface Debrief {
  id: string; kind: 'sql'; createdAt: string; solved: number; total: number
  wentWell: string; keepWorkingOn: string; suggestion: string
}
export interface Target {
  id: string; company: string; role: string; interviewDate: string | null; jd: string
  status: 'scouting' | 'ready'; skills: Skill[]; rounds: Round[]; events: AgentEvent[]
  debriefs: Debrief[]; nextStep: string | null; createdAt: string
}
export type TargetSummary = Pick<Target, 'id' | 'company' | 'role' | 'interviewDate' | 'status' | 'nextStep' | 'createdAt'>
export interface SqlTurnBody {
  problem: { id: string; title: string; prompt: string }
  query: string; passed: boolean; error?: string; resultPreview?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'X-Dev-Workspace': DEV_WORKSPACE,
      ...(typeof init?.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
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
  createInterview: (role: string, industry?: string, openingQuestion?: string) =>
    request<InterviewSession>('/interviews', { method: 'POST', body: JSON.stringify({ role, industry, openingQuestion }) }),
  listInterviews: () => request<InterviewSummary[]>('/interviews'),
  coachNote: () => request<CoachNote>('/coach-note'),
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
  getProfile: () => request<Profile>('/profile'),
  deleteProfile: () => request<null>('/profile', { method: 'DELETE' }),
  saveProfile: (profile: Profile) => request<Profile>('/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  resume: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ text: string }>('/onboarding/resume', { method: 'POST', body: form })
  },
  onboardingStep: (body: OnboardingStep) =>
    request<Record<string, string>>('/onboarding/step', { method: 'POST', body: JSON.stringify(body) }),
  createTarget: (body: { company: string; role: string; interviewDate?: string; jd: string }) =>
    request<Target>('/targets', { method: 'POST', body: JSON.stringify(body) }),
  listTargets: () => request<TargetSummary[]>('/targets'),
  getTarget: (id: string) => request<Target>(`/targets/${id}`),
  recordAttempt: (report: AttemptReport) =>
    request<{ id: string }>('/practice/attempts', { method: 'POST', body: JSON.stringify(report) }),
  practiceSummary: () => request<PracticeSummary>('/practice/summary'),
  deleteTarget: (id: string) => request<null>(`/targets/${id}`, { method: 'DELETE' }),
  sqlTurn: (id: string, body: SqlTurnBody) =>
    request<{ followUp: string }>(`/targets/${id}/sql-turn`, { method: 'POST', body: JSON.stringify(body) }),
  sqlDebrief: (id: string, body: { attempts: { problemId: string; title: string; query: string; passed: boolean }[] }) =>
    request<Debrief>(`/targets/${id}/sql-debrief`, { method: 'POST', body: JSON.stringify(body) }),
  /** Dictation: raw PCM16 16 kHz mono in, text out. */
  transcribe: (pcm: Uint8Array) =>
    request<{ text: string }>('/onboarding/transcribe', { method: 'POST', body: pcm as unknown as BodyInit }),
}
