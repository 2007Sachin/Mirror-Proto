import { z } from 'zod'
import type { InterviewerInput, InterviewerResult } from '../domain/director/types.js'

/** What stood out (verbatim quotes), the gap still open, one concrete suggestion. No scores. */
export const ReflectionOutputSchema = z.object({
  whatStoodOut: z.array(z.object({ turnId: z.string().min(1), quote: z.string().min(1).max(200) })).min(1).max(3),
  keepWorkingOn: z.string().trim().min(8).max(300),
  suggestion: z.string().trim().min(8).max(400),
})

export const FollowUpOutputSchema = z.object({
  question: z.string().trim().min(8).max(500),
})

export const InterviewerOutputSchema = z.object({
  action: z.enum(['probe', 'advance', 'gap']),
  target_skill: z.string().nullable(),
  question: z.string().trim().min(8).max(500),
})

export type ReflectionOutput = z.infer<typeof ReflectionOutputSchema>
export type FollowUpOutput = z.infer<typeof FollowUpOutputSchema>

/** What The First Interview gave us. Story and pressure answer are verbatim; the resume is context only. */
export interface InterviewContext {
  focus: string
  primaryStory: string
  pressureAnswer: string
  resumeSummary: string
}

export interface ProviderRequest {
  role: string
  questions: string[]
  turns: { id: string; question: string; answer: string }[]
  industry?: string | null
  /** Focus and story, so the reflection is read against what they agreed to work on. */
  context?: { focus: string; primaryStory: string } | null
  /** The last completed session's "keep working on", if any. */
  previousFocus?: string | null
}

/** The three moments of The First Interview. Each returns one short piece of agent speech. */
export type OnboardingRequest =
  | { step: 'opening'; resume: string }
  | { step: 'pressure'; story: string; resume?: string }
  | { step: 'contract'; story: string; question: string; answer: string; resume?: string }
  /** The Overview's Coach's note, from the latest completed session or The First Interview. */
  | {
      step: 'coach'
      role: string
      focus: string
      transcript: { question: string; answer: string }[]
      inProgress: boolean
      /** The nearest target (soonest interview date, else most recent), when there is one. */
      target?: { company: string; role: string }
      /** The latest session's reflection focus, when there is one. */
      reflectionFocus?: string
    }
  /** The Loop: the Planner's one sentence on what to do next. */
  | {
      step: 'planner'
      company: string
      role: string
      skills: string[]
      rounds: { title: string; available: boolean }[]
      interviewDate?: string | null
      /** Set after a SQL debrief: the gap still open. */
      keepWorkingOn?: string
    }
  /** The Loop: the interviewer's one question about the candidate's approach to this query. */
  | {
      step: 'sqlFollowUp'
      problem: { title: string; prompt: string }
      query: string
      passed: boolean
      error?: string
      resultPreview?: string
    }
  /** The Loop: the Coach's debrief of a SQL round. Only the attempts given. */
  | { step: 'sqlDebrief'; role: string; attempts: { title: string; query: string; passed: boolean }[] }
  /** The Loop: up to three résumé probe questions, rewritten more naturally. `quote` is the learner's own résumé line. */
  | { step: 'resumeProbe'; role: string; probes: { skill: string; quote: string | null; question: string }[] }

const question = (min: number, max: number) =>
  z.string().trim().min(min).max(max).refine(q => q.endsWith('?'), 'must be a question')

export const OnboardingOutputSchemas = {
  opening: z.object({ text: z.string().trim().min(8).max(400) }),
  pressure: z.object({ question: question(8, 300) }),
  contract: z.object({
    summary: z.string().trim().min(8).max(800),
    gap: z.string().trim().min(3).max(200),
    role: z.string().trim().min(2).max(120),
    firstQuestion: question(8, 300),
  }),
  coach: z.object({
    observation: z.string().trim().min(20).max(700),
    nextPractice: z.string().trim().min(8).max(300),
    practiceQuestion: question(8, 300),
  }),
  planner: z.object({ nextStep: z.string().trim().min(8).max(300) }),
  sqlFollowUp: z.object({ question: question(8, 300) }),
  sqlDebrief: z.object({
    wentWell: z.string().trim().min(8).max(300),
    keepWorkingOn: z.string().trim().min(8).max(300),
    suggestion: z.string().trim().min(8).max(400).refine(t => t.startsWith('Next time'), 'must start with "Next time"'),
  }),
  resumeProbe: z.object({ q1: question(8, 300), q2: z.string().trim().max(300).default(''), q3: z.string().trim().max(300).default('') }),
} as const

export interface FollowUpRequest {
  role: string
  industry: string | null
  /** What The First Interview learned; personalises follow-ups. */
  profile?: InterviewContext | null
  turns: { question: string; answer: string }[]
  nextIndex: number
}

export interface ReflectionProvider {
  generateReflection(request: ProviderRequest): Promise<ReflectionOutput>
  generateFollowUp?(request: FollowUpRequest): Promise<string>
  /** The Room's one live Interviewer call (chooses among the Director's candidates or probes the last answer). Absent: the bank answers. */
  generateNextQuestion?(input: InterviewerInput): Promise<InterviewerResult>
  generateOnboarding?(request: OnboardingRequest): Promise<Record<string, string>>
}
