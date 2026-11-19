// Typed client for the MIRROR Phase-1 backend (see server/).
// Same-origin by default: vite.config.ts proxies /api → http://localhost:8787.

import type { AttemptReport, PracticeSummary } from '../practice/types'

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

/** Where a piece of text came from: the assistant, or the plain fallback built from the learner's own words. */
export type Source = 'ai' | 'fallback'

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
  source: Source
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
  /** Set by the server; absent on older responses, which read as a practice interview. */
  kind?: 'practice' | 'screen'
  /** How many questions this interview asks. Absent or null means the practice default. */
  questionCap?: number | null
  timeCapSeconds?: number | null
  startedAt?: string | null
  targetId?: string | null
}

export interface TurnResponse {
  turn: Turn
  nextQuestion: string | null
  nextQuestionIndex: number | null
  status: InterviewStatus
  saved: boolean
  source: Source
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
  notes: { keepWorkingOn: string; quotes: string[]; source: Source } | null
}

/** The Overview's Coach's note. `practiceQuestion` opens the suggested practice. */
export interface CoachNote {
  observation: string
  nextPractice: string
  practiceQuestion: string
  basedOn: 'interview' | 'first-interview'
  source: Source
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
  debriefs: Debrief[]; nextStep: string | null; nextStepSource?: Source; createdAt: string
}
export type TargetSummary = Pick<Target, 'id' | 'company' | 'role' | 'interviewDate' | 'status' | 'nextStep' | 'nextStepSource' | 'createdAt'> & { skills?: Skill[] }
export interface SqlTurnBody {
  problem: { id: string; title: string; prompt: string }
  query: string; passed: boolean; error?: string; resultPreview?: string
}

/** The one fetch wrapper: session cookie, JSON in and out, ApiError on a non-2xx. A 401 on a data call tells the app to show sign-in. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await doRequest<T>(path, init)
  } catch (err: unknown) {
    if (!(err instanceof ApiError) || err.status !== 401 || path.startsWith('/auth/')) throw err
    // A 401 may only be an expired token: ask the server for the session once, and retry the call if it is still ours.
    try {
      const { session } = await authApi.getSession()
      if (session) return await doRequest<T>(path, init)
    } catch { /* refresh failed: fall through to sign-out */ }
    // Only now is the user really signed out.
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('mirror:unauthenticated'))
    throw err
  }
}

async function doRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
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

export type SessionInfo =
  | { demo: true }
  | { user: { id: string; email: string | null }; providers: { google: boolean } }
export interface Providers { google: boolean }

export const authApi = {
  /** Resolves with the session, or null when signed out. `providers` is read from the 401 body. */
  async getSession(): Promise<{ session: SessionInfo | null; providers: Providers }> {
    try {
      const s = await request<SessionInfo>('/auth/session')
      return { session: s, providers: 'providers' in s ? s.providers : { google: false } }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        const p = (e.body as { providers?: Providers } | null)?.providers
        return { session: null, providers: { google: Boolean(p?.google) } }
      }
      throw e
    }
  },
  requestMagicLink: (email: string) => request<{ ok: true }>('/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }) }),
  signOut: () => request<{ ok: true }>('/auth/signout', { method: 'POST' }),
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
  /** Newest first. No arguments gives the recent few; Sessions pages with limit and a `before` createdAt cursor. */
  listInterviews: (page?: { limit?: number; before?: string }) => {
    const q = new URLSearchParams()
    if (page?.limit) q.set('limit', String(page.limit))
    if (page?.before) q.set('before', page.before)
    return request<InterviewSummary[]>(`/interviews${q.size ? `?${q}` : ''}`)
  },
  coachNote: () => request<CoachNote>('/coach-note'),
  submitTurn: (interviewId: string, questionIndex: number, answer: string) =>
    request<TurnResponse>(
      `/interviews/${interviewId}/turns`,
      { method: 'POST', body: JSON.stringify({ questionIndex, answer, transcriptSource: 'text' }) },
    ),
  nextQuestion: (interviewId: string) =>
    request<{ nextQuestion: string; nextQuestionIndex: number; status: InterviewStatus; source: Source }>(
      `/interviews/${interviewId}/next-question`,
      { method: 'POST' },
    ),
  getInterview: (interviewId: string) => request<InterviewSession>(`/interviews/${interviewId}`),
  /** `early` ends a screening call at the time cap or when the learner ends it; practice interviews ignore it. */
  complete: (interviewId: string, opts?: { early?: boolean }) =>
    request<InterviewSession>(`/interviews/${interviewId}/complete`, { method: 'POST', ...(opts?.early ? { body: JSON.stringify({ early: true }) } : {}) }),
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
    request<Record<string, string> & { source?: Source }>('/onboarding/step', { method: 'POST', body: JSON.stringify(body) }),
  createTarget: (body: { company: string; role: string; interviewDate?: string; jd: string }) =>
    request<Target>('/targets', { method: 'POST', body: JSON.stringify(body) }),
  listTargets: () => request<TargetSummary[]>('/targets'),
  getTarget: (id: string) => request<Target>(`/targets/${id}`),
  recordAttempt: (report: AttemptReport) =>
    request<{ id: string }>('/practice/attempts', { method: 'POST', body: JSON.stringify(report) }),
  practiceSummary: () => request<PracticeSummary>('/practice/summary'),
  updateTarget: (id: string, interviewDate: string | null) =>
    request<TargetSummary>(`/targets/${id}`, { method: 'PATCH', body: JSON.stringify({ interviewDate }) }),
  deleteTarget: (id: string) => request<null>(`/targets/${id}`, { method: 'DELETE' }),
  sqlTurn: (id: string, body: SqlTurnBody) =>
    request<{ followUp: string; source: Source }>(`/targets/${id}/sql-turn`, { method: 'POST', body: JSON.stringify(body) }),
  sqlDebrief: (id: string, body: { attempts: { problemId: string; title: string; query: string; passed: boolean }[] }) =>
    request<Debrief & { source: Source; nextStepSource: Source }>(`/targets/${id}/sql-debrief`, { method: 'POST', body: JSON.stringify(body) }),
  /** Dictation: raw PCM16 16 kHz mono in, text out. */
  transcribe: (pcm: Uint8Array) =>
    request<{ text: string }>('/onboarding/transcribe', { method: 'POST', body: pcm as unknown as BodyInit }),
}
