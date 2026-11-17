import { totalFor, fallbackQuestionAt } from './questions.js'
import { nextQuestion } from './director/director.js'
import { buildRoomState } from './director/state.js'
import type { Interviewer, RoomLog } from './director/types.js'
import { ProviderFailure } from '../providers/nim.js'
import { quotedFollowUp } from './fallbacks.js'
import type { InterviewRow, Repository, TurnRow } from '../repo/types.js'
import type { InterviewContext, ReflectionProvider } from '../providers/types.js'
import type { ProfileRow } from '../repo/types.js'

/** The server-side view of the profile an interviewer may use. The resume never leaves the server. */
export function interviewContext(profile: ProfileRow | null): InterviewContext | null {
  if (!profile) return null
  return {
    focus: profile.focus,
    primaryStory: profile.story,
    pressureAnswer: profile.pressureAnswer,
    resumeSummary: (profile.resumeText ?? '').slice(0, 1500), // ponytail: first 1.5k chars as context; summarise properly if resumes run long
  }
}

export type Source = 'ai' | 'fallback'

/** Never throws on the provider: a failure or a missed deadline falls back to the catalogue, led by their own words. */
export async function nextFollowUp(
  interview: InterviewRow,
  turns: TurnRow[],
  provider: ReflectionProvider | null,
  profile: InterviewContext | null = null,
): Promise<{ question: string; source: Source }> {
  const nextIndex = turns.length
  if (!provider?.generateFollowUp) return { question: fallbackQuestionAt(nextIndex), source: 'fallback' }
  try {
    const question = await provider.generateFollowUp({
      role: interview.role,
      industry: interview.industry,
      profile,
      turns: turns.map(t => ({ question: t.question, answer: t.answer })),
      nextIndex,
    })
    return { question, source: 'ai' }
  } catch (err) {
    if (!(err instanceof ProviderFailure)) throw err
    return { question: quotedFollowUp(fallbackQuestionAt(nextIndex), turns[turns.length - 1]?.answer), source: 'fallback' }
  }
}

export async function nextFollowUpQuestion(
  interview: InterviewRow,
  turns: TurnRow[],
  provider: ReflectionProvider | null,
  profile: InterviewContext | null = null,
): Promise<string> {
  return (await nextFollowUp(interview, turns, provider, profile)).question
}

// Model calls used per interview, for the Director's ceiling. In-process and bounded; a restart only resets the count.
const callsByInterview = new Map<string, number>()
const COUNTER_CAP = 500

/** The Room's deadline and call ceiling (INTERVIEWER_DEADLINE_MS, INTERVIEW_CALL_BUDGET). Set once by buildApp; REST and voice share it. */
const roomConfig: { deadlineMs?: number; callBudget?: number } = {}
export function configureRoom(opts: { deadlineMs?: number; callBudget?: number }): void {
  roomConfig.deadlineMs = opts.deadlineMs
  roomConfig.callBudget = opts.callBudget
}
const defaultLog: RoomLog = line => {
  if (process.env.NODE_ENV !== 'test') console.info(JSON.stringify(line))
}

// ponytail: a question already saved has no recorded source, so it reports 'ai'; store it on the interview if that matters.
/** The next question: the Director picks and guards it (model when it answers in time, else an unasked bank question) and it is saved on the interview. */
export async function persistFollowUp(
  repo: Repository,
  interview: InterviewRow,
  turns: TurnRow[],
  provider: ReflectionProvider | null,
  log: RoomLog = defaultLog,
): Promise<{ question: string; source: Source }> {
  const total = totalFor(interview)
  if (turns.length >= total) return { question: interview.askedQuestions[total - 1], source: 'ai' }
  if (interview.askedQuestions.length > turns.length) return { question: interview.askedQuestions[turns.length], source: 'ai' }
  let question: string
  let source: Source
  if (turns.length === 0) {
    question = fallbackQuestionAt(0)
    source = 'fallback'
  } else {
    const profile = interviewContext(await repo.getProfile(interview.workspaceId))
    const state = await buildRoomState(repo, interview.workspaceId, interview, turns, profile)
    // The Room's call when the provider has it; else the older one-shot follow-up (same guard and fallback around it).
    const room = provider?.generateNextQuestion
    const legacy = provider?.generateFollowUp
    const interviewer: Interviewer | null = room
      ? input => room.call(provider, input)
      : legacy
        ? async input => ({
            action: 'advance',
            targetSkill: null,
            question: await legacy.call(provider, {
              role: interview.role,
              industry: interview.industry,
              profile,
              turns: input.state.turns,
              nextIndex: input.state.nextIndex,
            }),
          })
        : null
    const out = await nextQuestion(state, { interviewer, log, deadlineMs: roomConfig.deadlineMs, callBudget: roomConfig.callBudget, callsUsed: callsByInterview.get(interview.id) ?? 0 })
    if (out.calls) {
      if (callsByInterview.size >= COUNTER_CAP) callsByInterview.delete(callsByInterview.keys().next().value as string)
      callsByInterview.set(interview.id, (callsByInterview.get(interview.id) ?? 0) + out.calls)
    }
    question = out.question
    source = out.source === 'model' ? 'ai' : 'fallback'
  }
  const updated = await repo.appendAskedQuestion(interview.workspaceId, interview.id, question)
  return { question: updated?.askedQuestions[turns.length] ?? question, source }
}

export async function persistFollowUpQuestion(
  repo: Repository,
  interview: InterviewRow,
  turns: TurnRow[],
  provider: ReflectionProvider | null,
): Promise<string> {
  return (await persistFollowUp(repo, interview, turns, provider)).question
}
