// Shared types for the Room: the Director (plain code) picks and guards the next question, an Interviewer model call writes it.
// The Director owns the plan, the asked-history and the repeat guard; the model only chooses among candidates or probes the last answer.
// The silent Observer (RoomState.notes) is specified here but NOT built: it starts only after tester evidence (docs/roast-room/2026-11-17-room-agents/verdict.md).

export type NextAction = 'probe' | 'advance' | 'gap'
export type CandidateSource = 'gap' | 'story' | 'bank'

/** One question the model may choose (or reword). Code builds 3 to 5 of these. */
export interface Candidate {
  id: string
  text: string
  source: CandidateSource
  /** The target skill a gap candidate is about. */
  skill?: string
  /** A story theme or a bank competency tag. */
  competency?: string
}

/** What the last answer looked like. Computed in code, never by a model. */
export interface AnswerSignals {
  words: number
  /** Few words or no outcome. */
  thin: boolean
  /** Specific, with an outcome. */
  strong: boolean
}

export interface GapSkill {
  skill: string
  weight: 'core' | 'nice'
  /** A ready probe question for the gap, when the résumé match made one. */
  probeQuestion: string | null
}

/** Observer notes (specified, not built; always empty until the evidence gate is met). */
export interface ObserverNote {
  at: string
  kind: 'thin' | 'no_result' | 'contradiction' | 'covered'
  skill?: string
  text: string
}

/** Everything the Director knows about one live interview. Plain data, per interview. */
export interface RoomState {
  interviewId: string
  role: string
  industry: string | null
  targetId: string | null
  /** The turns answered so far, oldest first. */
  turns: { question: string; answer: string }[]
  /** Questions already asked in THIS interview (including the one just answered). */
  asked: string[]
  /** Questions asked in the user's earlier interviews (cross-session, read from saved interviews; no new table). */
  history: string[]
  /** The target's skills the résumé does not (fully) back, core first. Empty with no target. */
  gaps: GapSkill[]
  storyThemes: string[]
  /** Skills already asked about in this interview. */
  covered: string[]
  last: AnswerSignals | null
  /** Index of the question being chosen (0 is the opener). */
  nextIndex: number
  /** Always [] for now. */
  notes: ObserverNote[]
}

export interface InterviewerInput {
  state: RoomState
  candidates: Candidate[]
  /** The model has this long; past it the Director falls back to the bank. */
  deadlineMs: number
}

export interface InterviewerResult {
  action: NextAction
  targetSkill: string | null
  question: string
}

/** The one model call. Implemented by the provider (server/providers/nim.ts); injected into the Director so it stays testable. */
export type Interviewer = (input: InterviewerInput) => Promise<InterviewerResult>

/** One log line per turn: source, latency, branch decision, whether the guard blocked a repeat, model calls used. */
export interface RoomTurnLog {
  event: 'room_turn'
  interviewId: string
  nextIndex: number
  source: 'model' | 'bank'
  latencyMs: number
  action: NextAction | 'bank'
  blockedRepeat: boolean
  calls: number
  reason?: string
}
export type RoomLog = (line: RoomTurnLog) => void

export interface DirectorDeps {
  /** Absent (no key, or provider without the method): the bank answers. */
  interviewer?: Interviewer | null
  log?: RoomLog
  /** Default 1500 ms; never above 2000. */
  deadlineMs?: number
  /** Hard ceiling of model calls for one interview (default 12). */
  callBudget?: number
  /** Model calls already used in this interview, if known (a per-process counter keyed by interview id is fine). */
  callsUsed?: number
}

export interface DirectorOutput {
  question: string
  action: NextAction | 'bank'
  targetSkill: string | null
  source: 'model' | 'bank'
  latencyMs: number
  blockedRepeat: boolean
  /** Model calls this turn used (0 to 2: first try plus one retry after a blocked repeat). */
  calls: number
}
