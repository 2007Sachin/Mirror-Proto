import { TOTAL_QUESTIONS, fallbackQuestionAt } from './questions.js'
import type { InterviewRow, Repository, TurnRow } from '../repo/types.js'
import type { ReflectionProvider } from '../providers/types.js'

export async function nextFollowUpQuestion(
  interview: InterviewRow,
  turns: TurnRow[],
  provider: ReflectionProvider | null,
): Promise<string> {
  const nextIndex = turns.length
  if (provider?.generateFollowUp) {
    return provider.generateFollowUp({
      role: interview.role,
      industry: interview.industry,
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
  const question = await nextFollowUpQuestion(interview, turns, provider)
  const updated = await repo.appendAskedQuestion(interview.workspaceId, interview.id, question)
  return updated?.askedQuestions[turns.length] ?? question
}
