import { describe, expect, it } from 'vitest'
import { createNimClient, ProviderFailure } from '../providers/nim.js'
import type { InterviewerInput } from '../domain/director/types.js'
import { makeEnv } from './helpers.js'

const res = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
const completion = (o: unknown) => res(200, { choices: [{ message: { content: JSON.stringify(o) } }] })
const Q = 'What did you personally change in that rollout?'

function input(deadlineMs = 1500): InterviewerInput {
  return {
    deadlineMs,
    candidates: [
      { id: 'a', text: 'Tell me about a time you led a migration.', source: 'bank' },
      { id: 'b', text: 'How have you used SQL window functions?', source: 'gap', skill: 'SQL' },
    ],
    state: {
      interviewId: 'i1', role: 'Data Analyst', industry: null, targetId: null,
      turns: [{ question: 'Q1?', answer: 'I cut churn by building a dashboard.' }],
      asked: ['Q1?'], history: ['Old question from before?'], gaps: [], storyThemes: [], covered: [],
      last: { words: 8, thin: true, strong: false }, nextIndex: 1, notes: [],
    },
  } as InterviewerInput
}
const client = (f: typeof fetch) => createNimClient(makeEnv({ nimApiKey: 'k' }), f, () => {}, 2000, 0)

describe('generateNextQuestion', () => {
  for (const action of ['probe', 'advance', 'gap'] as const) {
    it(`returns a valid ${action} result`, async () => {
      const f = (async () => completion({ action, target_skill: action === 'gap' ? 'SQL' : null, question: Q })) as typeof fetch
      expect(await client(f).generateNextQuestion(input())).toEqual({
        action, targetSkill: action === 'gap' ? 'SQL' : null, question: Q,
      })
    })
  }

  it('throws ProviderFailure on a schema miss', async () => {
    const f = (async () => completion({ action: 'nope', target_skill: null, question: Q })) as typeof fetch
    await expect(client(f).generateNextQuestion(input())).rejects.toBeInstanceOf(ProviderFailure)
  })

  it('retries once at most', async () => {
    let calls = 0
    const f = (async () => { calls++; return res(500, {}) }) as typeof fetch
    await expect(client(f).generateNextQuestion(input())).rejects.toBeInstanceOf(ProviderFailure)
    expect(calls).toBe(2)
    calls = 0
    const g = (async () => (++calls === 1 ? res(500, {}) : completion({ action: 'probe', target_skill: null, question: Q }))) as typeof fetch
    expect((await client(g).generateNextQuestion(input())).question).toBe(Q)
    expect(calls).toBe(2)
  })

  it('aborts within the deadline and does not retry past it', async () => {
    let calls = 0
    const f = ((_u: string, init?: RequestInit) => {
      calls++
      return new Promise<Response>((_, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))))
    }) as typeof fetch
    const t = Date.now()
    await expect(client(f).generateNextQuestion(input(300))).rejects.toBeInstanceOf(ProviderFailure)
    expect(Date.now() - t).toBeLessThan(700)
    expect(calls).toBe(1)
  })

  it('builds the prompt with candidates, asked, rules; role only, no company', async () => {
    let body = ''
    const f = (async (_u: string, init?: RequestInit) => {
      body = String(init?.body)
      return completion({ action: 'advance', target_skill: null, question: Q })
    }) as typeof fetch
    await client(f).generateNextQuestion(input())
    const msgs = (JSON.parse(body) as { messages: { content: string }[] }).messages
    const all = msgs.map(m => m.content).join('\n')
    expect(all).toContain('1. Tell me about a time you led a migration.')
    expect(all).toContain('2. How have you used SQL window functions? (source: gap, skill: SQL)')
    expect(all).toContain('asked:\n- Q1?')
    expect(all).toContain('Old question from before?')
    expect(all).toContain('more than six words')
    expect(all).toContain('Never mention scores or percentages. Never use the words "evaluation"')
    expect(all).toContain('words=8, thin=true, strong=false')
    expect(all).toContain('Role: Data Analyst')
    expect(all).not.toContain('Industry:')
  })
})

describe('interviewer config', () => {
  it('clamps the deadline and defaults the budget', async () => {
    const load = async (e: Record<string, string>) => {
      const old = { ...process.env }
      Object.assign(process.env, e)
      const { vi } = await import('vitest')
      vi.resetModules()
      try { return (await import('../config.js')).env } finally { process.env = old }
    }
    expect((await load({})).interviewerDeadlineMs).toBe(1500)
    expect((await load({ INTERVIEWER_DEADLINE_MS: '10' })).interviewerDeadlineMs).toBe(500)
    expect((await load({ INTERVIEWER_DEADLINE_MS: '9000' })).interviewerDeadlineMs).toBe(2000)
    expect((await load({})).interviewCallBudget).toBe(12)
    expect((await load({ INTERVIEW_CALL_BUDGET: '5' })).interviewCallBudget).toBe(5)
  })
})
