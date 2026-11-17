import { describe, expect, it } from 'vitest'
import { answerSignals, buildRoomState } from '../../domain/director/state.js'
import { createMemoryRepository } from '../../repo/memory.js'

const match = (skill: string, weight: 'core' | 'nice', status: 'covered' | 'partial' | 'gap') => ({
  skill, area: 'sql', weight, status, claimQuote: null, note: 'n', probeQuestion: `Probe ${skill}?`, source: 'fallback' as const,
})

describe('answerSignals', () => {
  it('flags a short answer as thin and a specific one with a number as strong', () => {
    expect(answerSignals('It went fine.')).toMatchObject({ words: 3, thin: true, strong: false })
    const long = 'I rebuilt the weekly report over two weeks, owned the data model, and as a result the Monday meeting dropped from 60 to 40 minutes for the whole team.'
    expect(answerSignals(long)).toMatchObject({ thin: false, strong: true })
    expect(answerSignals('word '.repeat(40)).thin).toBe(true)
  })
})

describe('buildRoomState', () => {
  it('unions earlier interviews asked questions, excluding the current one', async () => {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('w')
    const a = await repo.createInterview('w', { role: 'Data Analyst', openingQuestion: 'Opener' })
    await repo.appendAskedQuestion('w', a.id, 'Earlier question one?')
    const b = await repo.createInterview('w', { role: 'Data Analyst', openingQuestion: 'Opener' })
    await repo.appendAskedQuestion('w', b.id, 'Current question?')
    const fresh = (await repo.getInterview('w', b.id))!
    const s = await buildRoomState(repo, 'w', fresh, [])
    expect(s.history).toContain('Earlier question one?')
    expect(s.history).not.toContain('Current question?')
    expect(s.asked).toEqual(['Opener', 'Current question?'])
    expect(s.notes).toEqual([])
    expect(s.last).toBeNull()
  })

  it('reads non-covered gaps (core first) for the target, story themes, and covered skills', async () => {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('w')
    const t = await repo.createTarget('w', { company: 'A', role: 'r', interviewDate: null, jd: 'x'.repeat(30) })
    await repo.replaceGapMatches('w', t.id, [match('Tableau', 'nice', 'gap'), match('SQL', 'core', 'partial'), match('Python', 'core', 'covered')])
    await repo.createStory('w', {
      title: 's', themes: ['ownership', 'conflict'], situation: '', task: '', action: '', result: '', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null,
    })
    const i = await repo.createInterview('w', { role: 'Data Analyst', openingQuestion: 'Opener', targetId: t.id })
    await repo.appendAskedQuestion('w', i.id, 'Probe SQL?')
    const fresh = (await repo.getInterview('w', i.id))!
    const turn = await repo.addTurn('w', i.id, { questionIndex: 0, question: 'Opener', answer: 'Short.', transcriptSource: 'text' })
    const s = await buildRoomState(repo, 'w', fresh, [turn])
    expect(s.gaps.map(g => g.skill)).toEqual(['SQL', 'Tableau'])
    expect(s.storyThemes).toEqual(['ownership', 'conflict'])
    expect(s.covered).toEqual(['SQL'])
    expect(s.last?.thin).toBe(true)
    expect(s.nextIndex).toBe(1)
  })

  it('has no gaps without a target', async () => {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('w')
    const i = await repo.createInterview('w', { role: 'Data Analyst', openingQuestion: 'Opener' })
    expect((await buildRoomState(repo, 'w', i, [])).gaps).toEqual([])
  })
})
