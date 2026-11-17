import { buildCandidates } from './candidates.js'
import { isRepeat } from './guard.js'
import type { DirectorDeps, DirectorOutput, InterviewerResult, NextAction, RoomState } from './types.js'

const ACTIONS: readonly string[] = ['probe', 'advance', 'gap']
export const DEFAULT_DEADLINE_MS = 1500
export const MAX_DEADLINE_MS = 2000
export const DEFAULT_CALL_BUDGET = 12
const SPENT = 'Is there something about this work you would like to add before we move on?'

/** Rejects after `ms`; the timer is always cleared. */
function within<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  return Promise.race([p, late]).finally(() => clearTimeout(timer))
}

const wellFormed = (r: InterviewerResult | null | undefined): r is InterviewerResult =>
  !!r && typeof r.question === 'string' && r.question.trim().length > 0 && r.question.length <= 500 && ACTIONS.includes(r.action)

/**
 * Picks the next question. Plain code: builds 3 to 5 candidates, asks the interviewer (at most twice a turn, under a short deadline),
 * rejects repeats, and on any miss returns the best unasked candidate. Never throws, never prefixes the question.
 */
export async function nextQuestion(state: RoomState, deps: DirectorDeps = {}): Promise<DirectorOutput> {
  const started = Date.now()
  const candidates = buildCandidates(state)
  const deadlineMs = Math.min(Math.max(deps.deadlineMs ?? DEFAULT_DEADLINE_MS, 1), MAX_DEADLINE_MS)
  const budget = deps.callBudget ?? DEFAULT_CALL_BUDGET
  let calls = 0
  let blockedRepeat = false
  let reason: string | undefined

  const finish = (out: Omit<DirectorOutput, 'latencyMs' | 'blockedRepeat' | 'calls'>): DirectorOutput => {
    const result: DirectorOutput = { ...out, latencyMs: Date.now() - started, blockedRepeat, calls }
    deps.log?.({
      event: 'room_turn',
      interviewId: state.interviewId,
      nextIndex: state.nextIndex,
      source: result.source,
      latencyMs: result.latencyMs,
      action: result.action,
      blockedRepeat,
      calls,
      ...(reason ? { reason } : {}),
    })
    return result
  }

  if (!deps.interviewer) reason = 'no_interviewer'
  else {
    while (calls < 2) {
      if ((deps.callsUsed ?? 0) + calls >= budget) {
        reason = 'budget'
        break
      }
      calls += 1
      let res: InterviewerResult
      try {
        res = await within(deps.interviewer({ state, candidates, deadlineMs }), deadlineMs)
      } catch (err) {
        reason = err instanceof Error && err.message === 'timeout' ? 'timeout' : 'error'
        break
      }
      if (!wellFormed(res)) {
        reason = 'schema'
        break
      }
      const question = res.question.trim()
      if (isRepeat(question, state.asked, state.history)) {
        blockedRepeat = true
        reason = 'repeat'
        continue
      }
      reason = undefined
      return finish({ question, action: res.action as NextAction, targetSkill: res.targetSkill ?? null, source: 'model' })
    }
  }

  const best = candidates[0]
  // Only when the whole bank is spent for this user: one plain open line rather than a failure.
  return finish({ question: best?.text ?? SPENT, action: 'bank', targetSkill: best?.skill ?? null, source: 'bank' })
}
