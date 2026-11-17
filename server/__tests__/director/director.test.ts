import { describe, expect, it, vi } from 'vitest'
import { nextQuestion } from '../../domain/director/director.js'
import type { Interviewer, RoomTurnLog } from '../../domain/director/types.js'
import { state } from './fixtures.js'

const ok = (question: string): Interviewer => async () => ({ action: 'advance', targetSkill: null, question })

describe('Director.nextQuestion', () => {
  it('uses the model question when it comes back in time', async () => {
    const out = await nextQuestion(state(), { interviewer: ok('How did you decide on that pilot?') })
    expect(out).toMatchObject({ source: 'model', question: 'How did you decide on that pilot?', calls: 1, blockedRepeat: false })
  })

  it('falls to the bank on a model timeout, with no prefix', async () => {
    const out = await nextQuestion(state(), { interviewer: () => new Promise(() => {}), deadlineMs: 20 })
    expect(out.source).toBe('bank')
    expect(out.question).not.toMatch(/^You said/)
    expect(out.calls).toBe(1)
  })

  it('never waits past 2000 ms even if asked to', async () => {
    vi.useFakeTimers()
    try {
      const p = nextQuestion(state(), { interviewer: () => new Promise(() => {}), deadlineMs: 60_000 })
      await vi.advanceTimersByTimeAsync(2001)
      expect((await p).source).toBe('bank')
    } finally {
      vi.useRealTimers()
    }
  })

  it('falls to the bank on a throw or a schema miss', async () => {
    const boom = await nextQuestion(state(), {
      interviewer: async () => {
        throw new Error('nope')
      },
    })
    expect(boom.source).toBe('bank')
    const bad = await nextQuestion(state(), { interviewer: (async () => ({ action: 'dance', question: '' })) as unknown as Interviewer })
    expect(bad.source).toBe('bank')
  })

  it('blocks a repeat, retries once, then takes the bank when the retry repeats too', async () => {
    let calls = 0
    const interviewer: Interviewer = async () => {
      calls += 1
      return { action: 'probe', targetSkill: null, question: 'Tell me about a project you are proud of.' }
    }
    const out = await nextQuestion(state(), { interviewer })
    expect(calls).toBe(2)
    expect(out).toMatchObject({ source: 'bank', blockedRepeat: true, calls: 2 })
  })

  it('accepts a good question on the retry', async () => {
    let n = 0
    const interviewer: Interviewer = async () => ({
      action: 'probe',
      targetSkill: null,
      question: n++ === 0 ? 'Tell me about a project you are proud of.' : 'What did the team say when it shipped?',
    })
    const out = await nextQuestion(state(), { interviewer })
    expect(out).toMatchObject({ source: 'model', blockedRepeat: true, calls: 2, question: 'What did the team say when it shipped?' })
  })

  it('skips the model when the call budget is spent', async () => {
    const interviewer = vi.fn(ok('Something quite different here.'))
    const out = await nextQuestion(state(), { interviewer, callsUsed: 12 })
    expect(interviewer).not.toHaveBeenCalled()
    expect(out).toMatchObject({ source: 'bank', calls: 0 })
    await nextQuestion(state(), { interviewer, callsUsed: 11, callBudget: 12 })
    expect(interviewer).toHaveBeenCalledTimes(1)
  })

  it('answers from the bank with no interviewer, and never repeats history', async () => {
    const first = await nextQuestion(state())
    expect(first).toMatchObject({ source: 'bank', action: 'bank', calls: 0 })
    const second = await nextQuestion(state({ history: [first.question] }))
    expect(second.question).not.toBe(first.question)
  })

  it('emits one log line of the agreed shape', async () => {
    const lines: RoomTurnLog[] = []
    await nextQuestion(state(), { log: l => lines.push(l) })
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ event: 'room_turn', interviewId: 'i1', nextIndex: 1, source: 'bank', action: 'bank', blockedRepeat: false, calls: 0, reason: 'no_interviewer' })
    expect(typeof lines[0].latencyMs).toBe('number')
  })
})
