import { describe, expect, it } from 'vitest'
import { createMemoryRepository } from '../repo/memory.js'
import { createSupabaseRepository } from '../repo/supabase.js'
import type { StoryInput } from '../repo/types.js'

const story = (title: string): StoryInput => ({
  title, themes: ['conflict'], situation: 's', task: 't', action: 'a', result: 'r', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null,
})

describe('memory repository: new stores', () => {
  it('answer attempts: oldest first, filtered, scoped, deletable', async () => {
    const repo = createMemoryRepository()
    const base = { interviewId: 'i1', questionIndex: 0, question: 'Why?', transcriptSource: 'text' as const }
    const a = await repo.addAnswerAttempt('w1', { ...base, attempt: 2, answer: 'first', kind: 'retry' })
    await repo.addAnswerAttempt('w1', { ...base, interviewId: null, questionIndex: null, attempt: 1, answer: 'second', kind: 'explain', itemId: 'sql-1' })
    await repo.addAnswerAttempt('w2', { ...base, attempt: 2, answer: 'other', kind: 'retry' })
    expect(a.workspaceId).toBe('w1')
    expect(a.itemId).toBeNull()
    expect((await repo.listAnswerAttempts('w1')).map(x => x.answer)).toEqual(['first', 'second'])
    expect(await repo.listAnswerAttempts('w1', { interviewId: 'i1' })).toHaveLength(1)
    expect(await repo.listAnswerAttempts('w1', { itemId: 'sql-1' })).toHaveLength(1)
    expect(await repo.listAnswerAttempts('w1', { kind: 'explain' })).toHaveLength(1)
    await repo.deleteAnswerAttempts('w1')
    expect(await repo.listAnswerAttempts('w1')).toEqual([])
    expect(await repo.listAnswerAttempts('w2')).toHaveLength(1)
  })

  it('stories: newest first, update keeps id and createdAt, delete one and all', async () => {
    const repo = createMemoryRepository()
    const first = await repo.createStory('w1', story('One'))
    await repo.createStory('w1', story('Two'))
    await repo.createStory('w2', story('Foreign'))
    expect((await repo.listStories('w1')).map(s => s.title)).toEqual(['Two', 'One'])
    expect(await repo.getStory('w2', first.id)).toBeNull()
    const updated = await repo.updateStory('w1', first.id, { title: 'Renamed', themes: ['a', 'b'] })
    expect(updated).toMatchObject({ id: first.id, title: 'Renamed', themes: ['a', 'b'], createdAt: first.createdAt })
    expect(updated!.updatedAt >= first.updatedAt).toBe(true)
    expect(await repo.updateStory('w1', 'missing', { title: 'x' })).toBeNull()
    await repo.deleteStory('w1', first.id)
    expect(await repo.listStories('w1')).toHaveLength(1)
    await repo.deleteAllStories('w1')
    expect(await repo.listStories('w1')).toEqual([])
    expect(await repo.listStories('w2')).toHaveLength(1)
  })

  it('resume claims: replace swaps the whole set', async () => {
    const repo = createMemoryRepository()
    await repo.replaceResumeClaims('w1', [{ quote: 'Built a dashboard', skills: ['SQL'], hasNumber: false, vague: false }])
    const rows = await repo.replaceResumeClaims('w1', [
      { quote: 'Cut churn by 12', skills: [], hasNumber: true, vague: false },
      { quote: 'Helped with reports', skills: [], hasNumber: false, vague: true },
    ])
    expect(rows).toHaveLength(2)
    expect((await repo.listResumeClaims('w1')).map(c => c.quote)).toEqual(['Cut churn by 12', 'Helped with reports'])
    expect(await repo.listResumeClaims('w2')).toEqual([])
    await repo.deleteResumeClaims('w1')
    expect(await repo.listResumeClaims('w1')).toEqual([])
  })

  const match = (skill: string) => ({ skill, area: 'sql', weight: 'core' as const, status: 'gap' as const, claimQuote: null, note: 'n', probeQuestion: null, source: 'fallback' as const })

  it('gap matches: replace per target, and deleting a target drops its matches', async () => {
    const repo = createMemoryRepository()
    const t1 = await repo.createTarget('w1', { company: 'A', role: 'r', interviewDate: null, jd: 'x'.repeat(30) })
    const t2 = await repo.createTarget('w1', { company: 'B', role: 'r', interviewDate: null, jd: 'x'.repeat(30) })
    await repo.replaceGapMatches('w1', t1.id, [match('SQL'), match('Python')])
    await repo.replaceGapMatches('w1', t2.id, [match('Tableau')])
    await repo.replaceGapMatches('w1', t1.id, [match('Excel')])
    expect((await repo.listGapMatches('w1', t1.id)).map(m => m.skill)).toEqual(['Excel'])
    expect((await repo.listGapMatches('w1', t2.id)).map(m => m.skill)).toEqual(['Tableau'])
    expect((await repo.listGapMatches('w1', t1.id))[0].targetId).toBe(t1.id)
    await repo.deleteTarget('w1', t1.id)
    expect(await repo.listGapMatches('w1', t1.id)).toEqual([])
    expect(await repo.listGapMatches('w1', t2.id)).toHaveLength(1)
  })

  it('replay schedule: one row per item, soonest due first, deletable', async () => {
    const repo = createMemoryRepository()
    const item = { itemId: 'sql-1', dueAt: '2026-02-05T00:00:00.000Z', intervalDays: 3, rung: 1, lastResult: true }
    const a = await repo.upsertReplayItem('w1', item)
    await repo.upsertReplayItem('w1', { ...item, itemId: 'sql-2', dueAt: '2026-02-01T00:00:00.000Z' })
    const again = await repo.upsertReplayItem('w1', { ...item, rung: 2, lastResult: null })
    expect(again.id).toBe(a.id)
    const list = await repo.listReplaySchedule('w1')
    expect(list.map(r => r.itemId)).toEqual(['sql-2', 'sql-1'])
    expect(list[1].rung).toBe(2)
    await repo.deleteReplayItem('w1', 'sql-1')
    expect(await repo.listReplaySchedule('w1')).toHaveLength(1)
    expect(await repo.listReplaySchedule('w2')).toEqual([])
  })

  it('deleteAllNewData and deleteProfile clear every new store for that workspace only', async () => {
    const repo = createMemoryRepository()
    for (const ws of ['w1', 'w2']) {
      await repo.createStory(ws, story('S'))
      await repo.replaceResumeClaims(ws, [{ quote: 'q', skills: [], hasNumber: false, vague: false }])
      await repo.upsertReplayItem(ws, { itemId: 'x', dueAt: '2026-01-01T00:00:00.000Z', intervalDays: 1, rung: 0, lastResult: null })
      await repo.addAnswerAttempt(ws, { interviewId: null, questionIndex: null, question: 'q', attempt: 1, answer: 'a', kind: 'explain', transcriptSource: 'text' })
    }
    await repo.deleteAllNewData('w1')
    expect(await repo.listStories('w1')).toEqual([])
    expect(await repo.listResumeClaims('w1')).toEqual([])
    expect(await repo.listReplaySchedule('w1')).toEqual([])
    expect(await repo.listAnswerAttempts('w1')).toEqual([])
    expect(await repo.listStories('w2')).toHaveLength(1)
    await repo.deleteProfile('w2')
    expect(await repo.listStories('w2')).toEqual([])
    expect(await repo.listAnswerAttempts('w2')).toEqual([])
  })

  it('a screen seeds all its questions and stores its metadata', async () => {
    const repo = createMemoryRepository()
    const qs = ['Q one here?', 'Q two here?', 'Q three here?', 'Q four here?', 'Q five here?']
    const row = await repo.createInterview('w1', {
      role: 'Analyst', openingQuestion: qs[0], askedQuestions: qs, kind: 'screen', questionCap: 5, timeCapSeconds: 480, startedAt: '2026-01-01T00:00:00.000Z', targetId: 't',
    })
    expect(row).toMatchObject({ kind: 'screen', questionCap: 5, timeCapSeconds: 480, startedAt: '2026-01-01T00:00:00.000Z', targetId: 't' })
    expect(row.askedQuestions).toEqual(qs)
    const practice = await repo.createInterview('w1', { role: 'Analyst', openingQuestion: 'Opening question here?' })
    expect(practice).toMatchObject({ kind: 'practice', questionCap: null })
  })
})

describe('supabase repository: new stores are not ready', () => {
  it('every new method throws storage_not_ready', async () => {
    const repo = createSupabaseRepository('https://example.supabase.co', 'key')
    const calls: Promise<unknown>[] = [
      repo.addAnswerAttempt('w', {} as never),
      repo.listAnswerAttempts('w'),
      repo.deleteAnswerAttempts('w'),
      repo.createStory('w', {} as never),
      repo.listStories('w'),
      repo.getStory('w', 'x'),
      repo.updateStory('w', 'x', {}),
      repo.deleteStory('w', 'x'),
      repo.deleteAllStories('w'),
      repo.replaceResumeClaims('w', []),
      repo.listResumeClaims('w'),
      repo.deleteResumeClaims('w'),
      repo.replaceGapMatches('w', 't', []),
      repo.listGapMatches('w', 't'),
      repo.upsertReplayItem('w', {} as never),
      repo.listReplaySchedule('w'),
      repo.deleteReplayItem('w', 'x'),
      repo.deleteAllNewData('w'),
    ]
    for (const c of calls) await expect(c).rejects.toThrow('storage_not_ready')
  })
})
