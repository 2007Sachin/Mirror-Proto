import { beforeEach, describe, expect, it, vi } from 'vitest'

const createClient = vi.hoisted(() => vi.fn())
vi.mock('@supabase/supabase-js', () => ({ createClient }))

import { createRepoFactory } from '../repo/factory.js'
import { createMemoryRepository } from '../repo/memory.js'
import { createUserRepository, PersistenceError } from '../repo/supabase.js'
import { AppError } from '../middleware/errors.js'
import { eqOf, fakeClient, rowsOf, type Call, type Handler } from './fakeSupabase.js'
import { j, makeApp, makeEnv } from './helpers.js'

const U = 'user-1'
const repoWith = (handler?: Handler, rows?: Record<string, unknown[]>, opts?: { screenDbReady?: boolean }) => {
  const f = fakeClient(handler, rows)
  return { ...f, repo: createUserRepository(f.client, U, opts) }
}
const inserts = (calls: Call[]) => calls.filter(c => c.op === 'insert' || c.op === 'upsert')

describe('user_id and workspace_id on every write', () => {
  it('the five newer tables and mirror_workspaces carry user_id; the seven older ones also workspace_id', async () => {
    const { repo, calls } = repoWith()
    await repo.ensureWorkspace(U)
    const iv = await repo.createInterview(U, { role: 'Analyst', openingQuestion: 'Opening question here?' })
    await repo.addTurn(U, iv.id, { questionIndex: 0, question: 'q?', answer: 'a', transcriptSource: 'text' })
    await repo.saveReflection(U, { interviewId: iv.id, role: 'Analyst', readinessLabel: null, readinessRange: null, evidence: [], focus: 'f', suggestion: null, model: 'm' })
    await repo.saveProfile(U, { role: 'r', story: 's', pressureQuestion: 'p', pressureAnswer: 'a', summary: 's', focus: 'f', firstQuestion: 'q', resumeText: null, resumeName: null, mode: 'text' })
    await repo.createTarget(U, { company: 'c', role: 'r', interviewDate: null, jd: 'jd' })
    await repo.addPracticeAttempt(U, { itemId: 'i', track: 'sql', topic: 't', level: 1, correct: true, seconds: 5, hintsUsed: 0 })
    await repo.addAnswerAttempt(U, { interviewId: iv.id, questionIndex: 1, question: 'q', attempt: 1, answer: 'a b', kind: 'retry', transcriptSource: 'text' })
    await repo.createStory(U, { title: 't', themes: [], situation: 's', task: 't', action: 'a', result: 'r', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null })
    await repo.replaceResumeClaims(U, [{ quote: 'Built SQL dashboards', skills: ['SQL'], hasNumber: false, vague: false }])
    await repo.replaceGapMatches(U, 't1', [{ skill: 'SQL', area: 'sql', weight: 'core', status: 'gap', claimQuote: null, note: 'n', probeQuestion: null, source: 'fallback' }])
    await repo.upsertReplayItem(U, { itemId: 'i', dueAt: '2026-01-01T00:00:00.000Z', intervalDays: 1, rung: 0, lastResult: null })

    const written = inserts(calls)
    expect(new Set(written.map(c => c.table))).toEqual(
      new Set(['mirror_workspaces', 'mirror_interviews', 'mirror_turns', 'mirror_reflections', 'mirror_profiles', 'mirror_targets', 'mirror_practice_attempts', 'mirror_answer_attempts', 'mirror_stories', 'mirror_resume_claims', 'mirror_target_gap_matches', 'mirror_replay_schedule']),
    )
    const withWorkspace = new Set(['mirror_interviews', 'mirror_turns', 'mirror_reflections', 'mirror_profiles', 'mirror_targets', 'mirror_practice_attempts'])
    for (const c of written) {
      for (const row of rowsOf(c)) {
        expect(row.user_id, c.table).toBe(U)
        if (withWorkspace.has(c.table)) expect(row.workspace_id, c.table).toBe(U)
        else expect(row, c.table).not.toHaveProperty('workspace_id')
      }
    }
    expect(calls.find(c => c.table === 'mirror_workspaces')?.options).toMatchObject({ onConflict: 'slug' })
  })
})

describe('new-table mappings through the repository', () => {
  it('answer attempts: key encoding, filters, oldest first', async () => {
    const { repo, calls } = repoWith()
    await repo.addAnswerAttempt(U, { interviewId: null, questionIndex: null, question: 'q', attempt: 2, answer: 'one two', kind: 'explain', itemId: 'sql-1', transcriptSource: 'voice' })
    expect(rowsOf(calls[0])[0]).toMatchObject({ question_key: 'sql-1:0', kind: 'explain', item_id: 'sql-1', attempt_no: 2, answer_text: 'one two', word_count: 2, turn_id: null, interview_id: null })
    await repo.listAnswerAttempts(U, { kind: 'retry', interviewId: 'iv1' })
    const q = calls[1]
    expect(q.filters).toEqual(expect.arrayContaining([['eq', 'user_id', U], ['eq', 'interview_id', 'iv1'], ['eq', 'kind', 'retry']]))
    expect(q.order).toEqual(['created_at', true])
  })

  it('stories: quote, question, source and source turn are stored, archived hidden, newest first, hard delete', async () => {
    const { repo, calls } = repoWith()
    const s = await repo.createStory(U, { title: 't', themes: ['x'], situation: 's', task: 't', action: 'a', result: 'r', quote: 'q', question: 'qq', sourceInterviewId: null, sourceTurnId: 'tu' })
    expect(Object.keys(rowsOf(calls[0])[0]).sort()).toEqual(['action', 'archived_at', 'question', 'quote', 'result', 'situation', 'source', 'source_interview_id', 'source_turn_id', 'task', 'themes', 'title', 'user_id'])
    expect(rowsOf(calls[0])[0]).toMatchObject({ quote: 'q', question: 'qq', source: 'manual', source_turn_id: 'tu' })
    expect(s).toMatchObject({ quote: 'q', question: 'qq', sourceTurnId: 'tu', workspaceId: U })
    await repo.listStories(U)
    expect(calls[1].filters).toEqual(expect.arrayContaining([['eq', 'user_id', U], ['is', 'archived_at', null]]))
    expect(calls[1].order).toEqual(['created_at', false])
    await repo.updateStory(U, 's1', { title: 'new', quote: 'ignored' })
    expect(Object.keys(calls[2].payload as object).sort()).toEqual(['quote', 'title', 'updated_at'])
    expect(eqOf(calls[2], 'user_id')).toBe(U)
    await repo.deleteStory(U, 's1')
    expect(calls[3]).toMatchObject({ op: 'delete', table: 'mirror_stories' })
  })

  it('claims: replace = detach, delete the user rows, insert; flags recomputed on read', async () => {
    const { repo, calls } = repoWith(undefined, { mirror_resume_claims: [{ id: 'c1', user_id: U, claim: 'x', source_quote: 'Cut SQL runtime by 40%', category: 'other', resume_name: null, skills: [], has_number: null, is_vague: null, created_at: 't', updated_at: 't' }] })
    await repo.replaceResumeClaims(U, [{ quote: 'a quote that is long', skills: [], hasNumber: false, vague: false }])
    expect(calls.map(c => `${c.op}:${c.table}`)).toEqual(['update:mirror_target_gap_matches', 'delete:mirror_resume_claims', 'insert:mirror_resume_claims'])
    expect(eqOf(calls[1], 'user_id')).toBe(U)
    expect(rowsOf(calls[2])[0]).toMatchObject({ claim: 'a quote that is long', source_quote: 'a quote that is long' })
    const claims = await repo.listResumeClaims(U)
    expect(claims[0]).toMatchObject({ quote: 'Cut SQL runtime by 40%', skills: ['SQL'], hasNumber: true, vague: false, workspaceId: U })
  })

  it('gap matches: claim_id looked up by quote; claim quote rebuilt from the joined claim', async () => {
    const claim = { id: 'c1', user_id: U, claim: 'x', source_quote: 'Built SQL dashboards', category: 'other', resume_name: null, skills: [], has_number: null, is_vague: null, created_at: 't', updated_at: 't' }
    const match = { id: 'm1', user_id: U, target_id: 't1', skill_name: 'SQL', skill_weight: 'core', jd_quote: null, claim_id: 'c1', match_status: 'covered', note: 'n', created_at: 't', updated_at: 't' }
    const { repo, calls } = repoWith(undefined, { mirror_resume_claims: [claim], mirror_target_gap_matches: [match] })
    const saved = await repo.replaceGapMatches(U, 't1', [{ skill: 'SQL', area: 'sql', weight: 'core', status: 'covered', claimQuote: 'Built SQL dashboards', note: 'n', probeQuestion: 'p?', source: 'ai' }])
    expect(calls.map(c => `${c.op}:${c.table}`)).toEqual(['select:mirror_resume_claims', 'delete:mirror_target_gap_matches', 'insert:mirror_target_gap_matches'])
    expect(eqOf(calls[1], 'target_id')).toBe('t1')
    expect(eqOf(calls[1], 'user_id')).toBe(U)
    expect(rowsOf(calls[2])[0]).toMatchObject({ target_id: 't1', skill_name: 'SQL', skill_weight: 'core', jd_quote: null, claim_id: 'c1', match_status: 'covered', note: 'n', probe_question: 'p?', area: 'sql', source: 'ai' })
    expect(saved[0]).toMatchObject({ probeQuestion: 'p?', source: 'ai', area: 'sql' })
    const read = await repo.listGapMatches(U, 't1')
    expect(read[0]).toMatchObject({ skill: 'SQL', claimQuote: 'Built SQL dashboards', probeQuestion: null, source: 'fallback', area: 'sql', status: 'covered' })
  })

  it('replay: ease and numbers arrive as strings and are coerced; an existing item is updated, not inserted', async () => {
    const row = { id: 'r1', user_id: U, item_kind: 'practice_item', item_key: 'sql-1', track: null, due_at: 'd', interval_days: '6', ease: '2.50', repetitions: '2', last_recall: 'again', last_reviewed_at: null, created_at: 't', updated_at: 'u' }
    const { repo, calls } = repoWith(undefined, { mirror_replay_schedule: [row] })
    expect((await repo.listReplaySchedule(U))[0]).toMatchObject({ itemId: 'sql-1', intervalDays: 6, rung: 2, lastResult: false })
    const saved = await repo.upsertReplayItem(U, { itemId: 'sql-1', dueAt: 'd2', intervalDays: 3, rung: 1, lastResult: true })
    expect(calls.map(c => c.op)).toEqual(['select', 'select', 'update'])
    expect(calls[2].payload).toMatchObject({ item_kind: 'practice_item', item_key: 'sql-1', repetitions: 1, last_recall: 'good', interval_days: 3 })
    expect(eqOf(calls[2], 'id')).toBe('r1')
    expect(saved.itemId).toBe('sql-1')
  })

  it('replay: a new item is inserted with user_id', async () => {
    const { repo, calls } = repoWith()
    await repo.upsertReplayItem(U, { itemId: 'new', dueAt: 'd', intervalDays: 1, rung: 0, lastResult: null })
    expect(calls.map(c => c.op)).toEqual(['select', 'insert'])
    expect(rowsOf(calls[1])[0]).toMatchObject({ user_id: U, item_key: 'new', last_recall: null })
  })
})

describe('deleting', () => {
  it('deleteAllNewData removes only this user rows from the five tables, children first', async () => {
    const { repo, calls } = repoWith()
    await repo.deleteAllNewData(U)
    expect(calls.map(c => c.table)).toEqual(['mirror_target_gap_matches', 'mirror_resume_claims', 'mirror_answer_attempts', 'mirror_stories', 'mirror_replay_schedule'])
    for (const c of calls) {
      expect(c.op).toBe('delete')
      expect(eqOf(c, 'user_id')).toBe(U)
    }
  })

  it('deleteAllData deletes in dependency order, scoped by user, and keeps the workspace row', async () => {
    const { repo, calls } = repoWith()
    await repo.deleteAllData(U)
    expect(calls.map(c => c.table)).toEqual([
      'mirror_target_gap_matches', 'mirror_resume_claims', 'mirror_answer_attempts', 'mirror_stories', 'mirror_replay_schedule',
      'mirror_reflections', 'mirror_turns', 'mirror_interviews', 'mirror_practice_attempts', 'mirror_targets', 'mirror_profiles',
    ])
    expect(calls.some(c => c.table === 'mirror_workspaces')).toBe(false)
    for (const c of calls) {
      expect(c.op).toBe('delete')
      expect(eqOf(c, 'user_id')).toBe(U)
    }
    for (const c of calls.slice(5)) expect(eqOf(c, 'workspace_id')).toBe(U)
  })

  it('deleteAllData stops at the first failure', async () => {
    const { repo, calls } = repoWith(c => (c.table === 'mirror_stories' ? { error: { message: 'rls denied' } } : undefined))
    await expect(repo.deleteAllData(U)).rejects.toThrow(PersistenceError)
    expect(calls.map(c => c.table)).toEqual(['mirror_target_gap_matches', 'mirror_resume_claims', 'mirror_answer_attempts', 'mirror_stories'])
  })
})

describe('export', () => {
  it('reads every table for this user into the RepoExport shape', async () => {
    const now = '2026-01-01T00:00:00.000Z'
    const rows = {
      mirror_workspaces: [{ slug: U, user_id: U, created_at: now }],
      mirror_interviews: [{ id: 'iv1', workspace_id: U, user_id: U, role: 'Analyst', industry: null, status: 'completed', asked_questions: ['q?'], created_at: now }],
      mirror_turns: [{ id: 'tu1', workspace_id: U, user_id: U, interview_id: 'iv1', question_index: 0, question: 'q?', answer: 'a', transcript_source: 'text', created_at: now }],
      mirror_stories: [{ id: 's1', user_id: U, title: 'T', situation: null, task: null, action: null, result: null, themes: ['a'], source: 'x', source_interview_id: null, archived_at: null, created_at: now, updated_at: now }],
      mirror_replay_schedule: [{ id: 'r1', user_id: U, item_kind: 'question', item_key: 'i', track: null, due_at: now, interval_days: 1, ease: '2.5', repetitions: 0, last_recall: null, last_reviewed_at: null, created_at: now, updated_at: now }],
    }
    const { repo, calls } = repoWith(undefined, rows)
    const out = await repo.exportAllData(U)
    expect(Object.keys(out).sort()).toEqual(['answerAttempts', 'exportedAt', 'gapMatches', 'interviews', 'practiceAttempts', 'profile', 'reflections', 'replaySchedule', 'resumeClaims', 'stories', 'targets', 'turns', 'workspace', 'workspaceRow'])
    expect(out.workspace).toBe(U)
    expect(out.workspaceRow).toEqual({ slug: U, createdAt: now })
    expect(out.profile).toBeNull()
    expect(out.interviews).toHaveLength(1)
    expect(out.turns[0]).toMatchObject({ interviewId: 'iv1', transcriptSource: 'text' })
    expect(out.stories[0]).toMatchObject({ title: 'T', situation: '', workspaceId: U })
    expect(out.replaySchedule[0]).toMatchObject({ itemId: 'i', workspaceId: U })
    expect(new Set(calls.map(c => c.table)).size).toBe(12)
    for (const c of calls) {
      expect(c.op).toBe('select')
      expect(eqOf(c, c.table.startsWith('mirror_') && ['mirror_answer_attempts', 'mirror_stories', 'mirror_resume_claims', 'mirror_target_gap_matches', 'mirror_replay_schedule'].includes(c.table) ? 'user_id' : c.table === 'mirror_workspaces' ? 'slug' : 'workspace_id')).toBeDefined()
      expect(eqOf(c, 'user_id')).toBe(U)
    }
  })

  it('a failed read fails the export', async () => {
    const { repo } = repoWith(c => (c.table === 'mirror_targets' ? { error: { message: 'boom' } } : undefined))
    await expect(repo.exportAllData(U)).rejects.toThrow(/export targets/)
  })
})

describe('errors', () => {
  it('writes and lists map to PersistenceError, never to an empty list', async () => {
    const { repo } = repoWith(() => ({ error: { message: 'permission denied' } }))
    await expect(repo.ensureWorkspace(U)).rejects.toThrow(PersistenceError)
    await expect(repo.createInterview(U, { role: 'r', openingQuestion: 'q?' })).rejects.toThrow('failed to create interview: permission denied')
    await expect(repo.listInterviews(U)).rejects.toThrow(PersistenceError)
    await expect(repo.listStories(U)).rejects.toThrow(PersistenceError)
    await expect(repo.listResumeClaims(U)).rejects.toThrow(PersistenceError)
    await expect(repo.getPracticeAttempts(U)).rejects.toThrow(PersistenceError)
    await expect(repo.getProfile(U)).rejects.toThrow(PersistenceError)
  })

  it('a getter returns null for no rows or a malformed id, and throws for anything else', async () => {
    expect(await repoWith().repo.getInterview(U, 'x')).toBeNull()
    expect(await repoWith(() => ({ error: { message: 'invalid input syntax for type uuid', code: '22P02' } })).repo.getTarget(U, 'nope')).toBeNull()
    await expect(repoWith(() => ({ error: { message: 'down', code: '500' } })).repo.getTarget(U, 'x')).rejects.toThrow(PersistenceError)
  })
})

describe('screen metadata (migration 0009)', () => {
  const QS = ['One here is?', 'Two here is?', 'Three here is?', 'Four here is?', 'Five here is?', 'Six here is?']
  const screen = { role: 'Analyst', openingQuestion: QS[0], askedQuestions: QS, kind: 'screen' as const, questionCap: 6, timeCapSeconds: 480, startedAt: '2026-01-01T00:00:00.000Z', targetId: 't1' }

  it('not ready: no new columns, four questions, metadata kept server-side across repositories', async () => {
    const a = repoWith()
    const row = await a.repo.createInterview(U, screen)
    expect(Object.keys(rowsOf(a.calls[0])[0]).sort()).toEqual(['asked_questions', 'industry', 'role', 'status', 'user_id', 'workspace_id'])
    expect(rowsOf(a.calls[0])[0].asked_questions).toEqual(QS.slice(0, 4))
    expect(row).toMatchObject({ kind: 'screen', questionCap: 4, timeCapSeconds: 480, targetId: 't1' })
    // A later request builds a new repository; the metadata is still there.
    const b = repoWith(undefined, { mirror_interviews: [{ ...rowsOf(a.calls[0])[0], id: row.id, created_at: 'now' }] })
    expect((await b.repo.getInterview(U, row.id))?.questionCap).toBe(4)
  })

  it('ready: writes and reads the new columns', async () => {
    const { repo, calls } = repoWith(undefined, undefined, { screenDbReady: true })
    const row = await repo.createInterview(U, screen)
    expect(rowsOf(calls[0])[0]).toMatchObject({ kind: 'screen', question_cap: 6, time_cap_seconds: 480, started_at: '2026-01-01T00:00:00.000Z', target_id: 't1', user_id: U })
    expect(rowsOf(calls[0])[0].asked_questions).toEqual(QS)
    expect(row).toMatchObject({ kind: 'screen', questionCap: 6 })
  })
})

describe('createRepoFactory', () => {
  const supa = makeEnv({ supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'anon-key' })
  beforeEach(() => createClient.mockReset())

  it('builds the client from the anon key and the user token, per request, never the service key', async () => {
    const f = fakeClient()
    createClient.mockReturnValue(f.client)
    const repoFor = createRepoFactory(makeEnv({ ...supa, supabaseSecretKey: 'service-key' }))
    await repoFor({ id: U, email: null, accessToken: 'tok-1' }).listStories(U)
    await repoFor({ id: 'user-2', email: null, accessToken: 'tok-2' }).listStories('user-2')
    expect(createClient).toHaveBeenCalledTimes(2)
    const [url, key, options] = createClient.mock.calls[0]
    expect([url, key]).toEqual(['https://example.supabase.co', 'anon-key'])
    expect(options).toEqual({ global: { headers: { Authorization: 'Bearer tok-1' } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    expect(createClient.mock.calls[1][2].global.headers.Authorization).toBe('Bearer tok-2')
    expect(createClient.mock.calls.flat().some(a => a === 'service-key')).toBe(false)
    expect(eqOf(f.calls[1], 'user_id')).toBe('user-2')
  })

  it('refuses a user without a token (401 unauthenticated)', () => {
    const repoFor = createRepoFactory(supa)
    expect.assertions(3)
    try {
      repoFor({ id: U, email: null, accessToken: null })
    } catch (e) {
      expect(e).toBeInstanceOf(AppError)
      expect((e as AppError).status).toBe(401)
      expect((e as AppError).code).toBe('unauthenticated')
    }
  })

  it('accepts an injected client factory', async () => {
    const f = fakeClient()
    const seen: string[] = []
    const repoFor = createRepoFactory(supa, { clientFactory: u => (seen.push(u.accessToken), f.client) })
    await repoFor({ id: U, email: null, accessToken: 'tok' }).deleteAllStories(U)
    expect(seen).toEqual(['tok'])
    expect(createClient).not.toHaveBeenCalled()
  })

  it('demo mode or no Supabase gives one shared memory repository', () => {
    for (const env of [makeEnv({ ...supa, demoMode: true }), makeEnv()]) {
      const repoFor = createRepoFactory(env)
      const a = repoFor({ id: 'a', email: null, accessToken: null })
      expect(repoFor({ id: 'b', email: null, accessToken: null })).toBe(a)
      expect(Object.keys(a).sort()).toEqual(Object.keys(createMemoryRepository()).sort())
    }
  })
})

describe('repository surface and /capabilities', () => {
  it('exposes exactly the memory repository methods', () => {
    expect(Object.keys(repoWith().repo).sort()).toEqual(Object.keys(createMemoryRepository()).sort())
  })

  it('newData is server in Supabase mode too; screenLongCalls needs SCREEN_DB_READY', async () => {
    const env = makeEnv({ supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'k' })
    expect(await j(await makeApp({ env }).app.request('/capabilities'))).toEqual({ newData: 'server', screenLongCalls: false })
    expect(await j(await makeApp({ env: { ...env, screenDbReady: true } }).app.request('/api/capabilities'))).toEqual({ newData: 'server', screenLongCalls: true })
    expect(await j(await makeApp().app.request('/capabilities'))).toEqual({ newData: 'server', screenLongCalls: true })
  })
})
