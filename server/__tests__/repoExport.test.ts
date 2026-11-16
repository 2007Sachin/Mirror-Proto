import { describe, expect, it } from 'vitest'
import { createMemoryRepository } from '../repo/memory.js'

const story = { title: 'T', themes: [], situation: '', task: '', action: '', result: '', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null }

async function seed(repo: ReturnType<typeof createMemoryRepository>, ws: string) {
  await repo.ensureWorkspace(ws)
  const i = await repo.createInterview(ws, { role: 'Analyst', openingQuestion: 'Q1' })
  await repo.addTurn(ws, i.id, { questionIndex: 0, question: 'Q1', answer: 'A1', transcriptSource: 'text' })
  const t = await repo.createTarget(ws, { company: 'Acme', role: 'Analyst', interviewDate: null, jd: 'x'.repeat(30) })
  await repo.addPracticeAttempt(ws, { itemId: 'p', track: 'sql', topic: 't', level: 1, correct: true, seconds: 5, hintsUsed: 0 })
  await repo.addAnswerAttempt(ws, { interviewId: i.id, questionIndex: 0, question: 'Q1', attempt: 1, answer: 'A', kind: 'retry', transcriptSource: 'text' })
  await repo.createStory(ws, story)
  await repo.replaceResumeClaims(ws, [{ quote: 'q', skills: [], hasNumber: false, vague: false }])
  await repo.replaceGapMatches(ws, t.id, [{ skill: 's', area: 'a', weight: 'core', status: 'gap', claimQuote: null, note: '', probeQuestion: null, source: 'fallback' }])
  await repo.upsertReplayItem(ws, { itemId: 'r', dueAt: '2026-01-01', intervalDays: 1, rung: 0, lastResult: null })
}

describe('memory exportAllData / deleteAllData', () => {
  it('exports every store of one workspace and nothing of another', async () => {
    const repo = createMemoryRepository()
    await seed(repo, 'ann')
    await seed(repo, 'bob')
    const out = await repo.exportAllData('ann')
    expect(out.workspace).toBe('ann')
    expect(out.interviews).toHaveLength(1)
    for (const k of ['turns', 'targets', 'practiceAttempts', 'answerAttempts', 'stories', 'resumeClaims', 'gapMatches', 'replaySchedule'] as const) {
      expect(out[k], k).toHaveLength(1)
    }
    expect(JSON.stringify(out)).not.toContain('bob')
    expect(Number.isNaN(Date.parse(out.exportedAt))).toBe(false)
  })

  it('deletes everything of the workspace and keeps the other one', async () => {
    const repo = createMemoryRepository()
    await seed(repo, 'ann')
    await seed(repo, 'bob')
    await repo.saveProfile('ann', { role: 'Analyst', story: 's', pressureQuestion: 'q', pressureAnswer: 'a', focus: 'f', firstQuestion: 'fq' } as never)
    await repo.deleteAllData('ann')
    const gone = await repo.exportAllData('ann')
    expect(gone.profile).toBeNull()
    for (const [k, v] of Object.entries(gone)) if (Array.isArray(v)) expect(v, k).toHaveLength(0)
    expect((await repo.exportAllData('bob')).interviews).toHaveLength(1)
    await repo.deleteAllData('nobody')
  })
})
