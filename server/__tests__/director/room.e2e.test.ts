import { describe, expect, it } from 'vitest'
import { OPENING_QUESTION } from '../../domain/questions.js'
import { isRepeat } from '../../domain/director/guard.js'
import { createMemoryRepository } from '../../repo/memory.js'
import { submitVoiceTurn } from '../../voice/interviewBridge.js'
import type { ReflectionProvider } from '../../providers/types.js'
import { j, makeApp, WS } from '../helpers.js'

const H = { ...WS, 'Content-Type': 'application/json' }
const ANSWER = 'I rebuilt the weekly report over two weeks and the Monday meeting got shorter as a result.'

describe('the Room with no provider and no key', () => {
  it('10 interviews finish with no repeated question within or across interviews', async () => {
    const { app, repo } = makeApp()
    const seen: string[] = []
    for (let n = 0; n < 10; n++) {
      const { id } = await j<{ id: string }>(await app.request('/interviews', { method: 'POST', headers: H, body: JSON.stringify({ role: 'Data Analyst' }) }))
      for (let i = 0; i < 4; i++) {
        const res = await app.request(`/interviews/${id}/turns`, { method: 'POST', headers: H, body: JSON.stringify({ questionIndex: i, answer: ANSWER }) })
        expect(res.status).toBe(201)
        expect((await j(res)).status).toBe(i === 3 ? 'completed' : 'in_progress')
      }
      const asked = (await repo.getInterview('dev', id))!.askedQuestions
      expect(asked).toHaveLength(4)
      expect(asked[0]).toContain(OPENING_QUESTION) // the one fixed opener, shared by design
      for (const q of asked.slice(1)) {
        expect(q).not.toMatch(/^You said/)
        expect(isRepeat(q, [], seen)).toBe(false)
        seen.push(q)
      }
    }
    expect(new Set(seen).size).toBe(30)
  })
})

describe('REST and voice both go through the Director', () => {
  const calls: string[] = []
  const provider: ReflectionProvider = {
    async generateReflection() {
      throw new Error('unused')
    },
    async generateNextQuestion(input) {
      calls.push(`${input.state.nextIndex}:${input.candidates.length}`)
      return { action: 'advance', targetSkill: null, question: `Model question number ${input.state.nextIndex} about the report?` }
    },
  }

  it('REST /turns takes the model question the Director guards', async () => {
    calls.length = 0
    const { app } = makeApp({ provider })
    const { id } = await j<{ id: string }>(await app.request('/interviews', { method: 'POST', headers: H, body: JSON.stringify({ role: 'Data Analyst' }) }))
    const res = await app.request(`/interviews/${id}/turns`, { method: 'POST', headers: H, body: JSON.stringify({ questionIndex: 0, answer: ANSWER }) })
    const body = await j(res)
    expect(body.nextQuestion).toContain('Model question number 1 about the report?')
    expect(body.source).toBe('ai')
    expect(calls).toHaveLength(1)
    expect(Number(calls[0].split(':')[1])).toBeGreaterThanOrEqual(3)
  })

  it('voice submitVoiceTurn takes it too', async () => {
    calls.length = 0
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('dev')
    const interview = await repo.createInterview('dev', { role: 'Data Analyst', openingQuestion: OPENING_QUESTION })
    const r = await submitVoiceTurn(repo, 'dev', interview.id, 0, ANSWER, provider)
    expect(r.ok && r.nextQuestion).toContain('Model question number 1 about the report?')
    expect(calls).toHaveLength(1)
  })

  it('a model that repeats an earlier interview question gets the bank instead', async () => {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('dev')
    const old = await repo.createInterview('dev', { role: 'Data Analyst', openingQuestion: OPENING_QUESTION })
    await repo.appendAskedQuestion('dev', old.id, 'What did the team say when it shipped?')
    const interview = await repo.createInterview('dev', { role: 'Data Analyst', openingQuestion: OPENING_QUESTION })
    const repeating: ReflectionProvider = {
      async generateReflection() {
        throw new Error('unused')
      },
      async generateNextQuestion() {
        return { action: 'probe', targetSkill: null, question: 'What did the team say when it shipped?' }
      },
    }
    const r = await submitVoiceTurn(repo, 'dev', interview.id, 0, ANSWER, repeating)
    expect(r.ok && r.nextQuestion).not.toBe('What did the team say when it shipped?')
  })
})
