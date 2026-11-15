import { TOTAL_QUESTIONS, fallbackQuestionAt } from './questions.js'
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

// ponytail: a question already saved has no recorded source, so it reports 'ai'; store it on the interview if that matters.
export async function persistFollowUp(
  repo: Repository,
  interview: InterviewRow,
  turns: TurnRow[],
  provider: ReflectionProvider | null,
): Promise<{ question: string; source: Source }> {
  if (turns.length >= TOTAL_QUESTIONS) return { question: interview.askedQuestions[TOTAL_QUESTIONS - 1], source: 'ai' }
  if (interview.askedQuestions.length > turns.length) return { question: interview.askedQuestions[turns.length], source: 'ai' }
  const profile = interviewContext(await repo.getProfile(interview.workspaceId))
  const next = await nextFollowUp(interview, turns, provider, profile)
  const updated = await repo.appendAskedQuestion(interview.workspaceId, interview.id, next.question)
  return { question: updated?.askedQuestions[turns.length] ?? next.question, source: next.source }
}

export async function persistFollowUpQuestion(
  repo: Repository,
  interview: InterviewRow,
  turns: TurnRow[],
  provider: ReflectionProvider | null,
): Promise<string> {
  return (await persistFollowUp(repo, interview, turns, provider)).question
}
