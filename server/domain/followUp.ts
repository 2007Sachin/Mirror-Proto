import { TOTAL_QUESTIONS, fallbackQuestionAt } from './questions.js'
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

export async function nextFollowUpQuestion(
  interview: InterviewRow,
  turns: TurnRow[],
  provider: ReflectionProvider | null,
  profile: InterviewContext | null = null,
): Promise<string> {
  const nextIndex = turns.length
  if (provider?.generateFollowUp) {
    return provider.generateFollowUp({
      role: interview.role,
      industry: interview.industry,
      profile,
      turns: turns.map(t => ({ question: t.question, answer: t.answer })),
      nextIndex,
    })
  }
  return fallbackQuestionAt(nextIndex)
}

export async function persistFollowUpQuestion(
  repo: Repository,
  interview: InterviewRow,
  turns: TurnRow[],
  provider: ReflectionProvider | null,
): Promise<string> {
  if (turns.length >= TOTAL_QUESTIONS) return interview.askedQuestions[TOTAL_QUESTIONS - 1]
  if (interview.askedQuestions.length > turns.length) return interview.askedQuestions[turns.length]
  const profile = interviewContext(await repo.getProfile(interview.workspaceId))
  const question = await nextFollowUpQuestion(interview, turns, provider, profile)
  const updated = await repo.appendAskedQuestion(interview.workspaceId, interview.id, question)
  return updated?.askedQuestions[turns.length] ?? question
}
