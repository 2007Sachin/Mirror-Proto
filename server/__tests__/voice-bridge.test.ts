import { describe, expect, it } from 'vitest'
import { OPENING_QUESTION } from '../domain/questions.js'
import { createMemoryRepository } from '../repo/memory.js'
import { submitVoiceTurn } from '../voice/interviewBridge.js'

describe('submitVoiceTurn', () => {
  it('persists a voice transcript through the same domain rules as REST', async () => {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('dev')
    const interview = await repo.createInterview('dev', {
      role: 'Product Analyst',
      industry: 'Technology / SaaS',
      openingQuestion: OPENING_QUESTION,
    })
    const result = await submitVoiceTurn(
      repo,
      'dev',
      interview.id,
      0,
      'I led a messy onboarding redesign after a product update.',
      {
        async generateFollowUp() {
          return 'What was specifically yours to own?'
        },
        async generateReflection() {
          throw new Error('unused')
        },
      },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.turn.transcriptSource).toBe('voice')
    expect(result.turn.answer).toContain('onboarding')
    expect(result.nextQuestion).toContain('What was specifically yours to own?')
    const stored = await repo.getTurns('dev', interview.id)
    expect(stored).toHaveLength(1)
    expect(stored[0].transcriptSource).toBe('voice')
    const reloaded = await repo.getInterview('dev', interview.id)
    expect(reloaded?.askedQuestions[0]).toContain(OPENING_QUESTION); expect(reloaded?.askedQuestions[1]).toContain('What was specifically yours to own?')
  })

  it('retry after a follow-up failure does not save the answer twice', async () => {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('dev')
    const interview = await repo.createInterview('dev', { role: 'Product Analyst', openingQuestion: OPENING_QUESTION })
    const { ProviderFailure } = await import('../providers/nim.js')
    // A failing follow-up never fails the turn any more (the question falls back to the catalogue), and a
    // retry of the same answer index must not add the answer a second time.
    const provider = {
      async generateFollowUp() {
        throw new ProviderFailure('provider_unavailable')
      },
      async generateReflection() {
        throw new Error('unused')
      },
    }
    const first = await submitVoiceTurn(repo, 'dev', interview.id, 0, 'I led the redesign.', provider as never)
    expect(first).toMatchObject({ ok: true, nextQuestionIndex: 1 })
    const retry = await submitVoiceTurn(repo, 'dev', interview.id, 0, 'I led the redesign again.', provider as never)
    expect(retry).toMatchObject({ ok: true, nextQuestionIndex: 1 })
    expect(await repo.getTurns('dev', interview.id)).toHaveLength(1)
  })

  it('rejects empty transcripts using the interview state machine', async () => {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('dev')
    const interview = await repo.createInterview('dev', {
      role: 'Product Analyst',
      openingQuestion: OPENING_QUESTION,
    })
    const result = await submitVoiceTurn(repo, 'dev', interview.id, 0, '   ', null)
    expect(result).toEqual({ ok: false, code: 'empty_answer', status: 400 })
  })
})
