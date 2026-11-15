import { describe, expect, it } from 'vitest'
import {
  answerAttemptFromRow,
  answerAttemptInsert,
  answerAttemptKey,
  answerAttemptQuery,
  claimFromRow,
  claimInsert,
  easeOf,
  gapMatchFromRow,
  gapMatchInsert,
  replayFromRow,
  replayInsert,
  storyFromRow,
  storyInsert,
  storyPatch,
  type Row,
} from '../repo/adapters.js'

const U = 'user-1'
const T = '2026-01-01T00:00:00.000Z'
const base = { interviewId: 'iv1', questionIndex: 2, question: 'Why?', attempt: 3, answer: 'one two three', kind: 'retry' as const, transcriptSource: 'voice' as const }

describe('answer attempts', () => {
  it.each([
    [{ kind: 'retry' as const, interviewId: 'iv1', itemId: null, questionIndex: 2 }, 'retry:iv1:2'],
    [{ kind: 'explain' as const, interviewId: null, itemId: 'sql-1', questionIndex: null }, 'explain:sql-1:0'],
    [{ kind: 'explain' as const, interviewId: null, itemId: undefined, questionIndex: null }, 'explain:x:0'],
    [{ kind: 'retry' as const, interviewId: 'iv1', itemId: 'ignored', questionIndex: null }, 'retry:iv1:0'],
  ])('key %j -> %s', (input, key) => {
    expect(answerAttemptKey(input)).toBe(key)
  })

  it('maps the insert to the live columns', () => {
    expect(answerAttemptInsert(U, base)).toEqual({
      user_id: U, interview_id: 'iv1', turn_id: null, question_key: 'retry:iv1:2', question: 'Why?', attempt_no: 3, answer_text: 'one two three', transcript_source: 'voice', word_count: 3,
    })
    expect(answerAttemptInsert(U, { ...base, answer: '   ' }).word_count).toBe(0)
  })

  const row = (over: Partial<Row<'mirror_answer_attempts'>>): Row<'mirror_answer_attempts'> => ({
    id: 'a1', user_id: U, interview_id: 'iv1', turn_id: null, question_key: 'retry:iv1:2', question: 'Why?', attempt_no: 3, answer_text: 'x', transcript_source: 'text',
    duration_seconds: null, word_count: null, created_at: T, ...over,
  })

  it.each([
    [{}, { kind: 'retry', itemId: null, questionIndex: 2, interviewId: 'iv1', transcriptSource: 'text' }],
    [{ interview_id: null, question_key: 'explain:sql-1:0', transcript_source: 'voice' }, { kind: 'explain', itemId: 'sql-1', questionIndex: null, interviewId: null, transcriptSource: 'voice' }],
    [{ interview_id: null, question_key: 'explain:x:0' }, { kind: 'explain', itemId: null, questionIndex: null }],
    [{ attempt_no: '4' as unknown as number }, { attempt: 4 }],
    [{ question_key: 'garbage' }, { kind: 'retry', itemId: null }],
  ])('rebuilds %j', (over, expected) => {
    const out = answerAttemptFromRow(U, row(over))
    expect(out).toMatchObject({ id: 'a1', workspaceId: U, createdAt: T, ...expected })
  })

  it.each([
    [undefined, { like: null, interviewId: null }],
    [{ kind: 'retry' as const, interviewId: 'iv1' }, { like: 'retry:iv1:%', interviewId: 'iv1' }],
    [{ kind: 'explain' as const, itemId: 'sql_1' }, { like: 'explain:sql\\_1:%', interviewId: null }],
    [{ kind: 'retry' as const }, { like: 'retry:%', interviewId: null }],
    [{ interviewId: 'iv1' }, { like: '%:iv1:%', interviewId: 'iv1' }],
    [{ itemId: 'a%b' }, { like: '%:a\\%b:%', interviewId: null }],
  ])('filter %j', (filter, expected) => {
    expect(answerAttemptQuery(filter)).toEqual(expected)
  })
})

describe('stories', () => {
  const input = { title: 'T', themes: ['a'], situation: 's', task: 't', action: 'a', result: 'r', quote: 'q', question: 'qq', sourceInterviewId: 'iv1', sourceTurnId: 'tu1' }

  it('insert drops quote/question/sourceTurnId and never sends source', () => {
    const out = storyInsert(U, input)
    expect(out).toEqual({ user_id: U, title: 'T', situation: 's', task: 't', action: 'a', result: 'r', themes: ['a'], source_interview_id: 'iv1', archived_at: null })
    expect(out).not.toHaveProperty('source')
  })

  it.each([
    [{}, { updated_at: T }],
    [{ title: 'N', quote: 'ignored', question: 'ignored', sourceTurnId: 'x' }, { updated_at: T, title: 'N' }],
    [{ themes: ['z'], sourceInterviewId: null, result: '' }, { updated_at: T, themes: ['z'], source_interview_id: null, result: '' }],
  ])('patch %j', (patch, expected) => {
    expect(storyPatch(patch, T)).toEqual(expected)
  })

  it('reads nulls as empty text and reports the unstored fields as null', () => {
    const r: Row<'mirror_stories'> = { id: 's1', user_id: U, title: 'T', situation: null, task: null, action: null, result: null, themes: [], source: 'manual', source_interview_id: null, archived_at: null, created_at: T, updated_at: '2026-02-01T00:00:00.000Z' }
    expect(storyFromRow(U, r)).toEqual({
      id: 's1', workspaceId: U, title: 'T', themes: [], situation: '', task: '', action: '', result: '', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null, createdAt: T, updatedAt: '2026-02-01T00:00:00.000Z',
    })
  })
})

describe('resume claims', () => {
  it('insert stores the quote as claim and source_quote', () => {
    expect(claimInsert(U, { quote: 'Built SQL dashboards', skills: ['SQL'], hasNumber: false, vague: false })).toEqual({
      user_id: U, claim: 'Built SQL dashboards', source_quote: 'Built SQL dashboards', resume_name: null,
    })
    expect(claimInsert(U, { quote: 'q', skills: [], hasNumber: false, vague: false }, 'cv.pdf').resume_name).toBe('cv.pdf')
  })

  const row = (over: Partial<Row<'mirror_resume_claims'>>): Row<'mirror_resume_claims'> => ({
    id: 'c1', user_id: U, claim: 'x', category: 'other', source_quote: null, resume_name: null, created_at: T, updated_at: T, ...over,
  })

  it.each([
    [row({ source_quote: 'Reduced SQL query time by 40%' }), { skills: ['SQL'], hasNumber: true, vague: false }],
    [row({ source_quote: 'Helped with Python reports' }), { skills: ['Python'], hasNumber: false, vague: true }],
    [row({ claim: 'Python, SQL' }), { quote: 'Python, SQL', hasNumber: false, vague: true }],
    [row({ claim: 'Led a team of 5' }), { skills: [], hasNumber: true, vague: false }],
  ])('recomputes the flags %#', (r, expected) => {
    const out = claimFromRow(U, r)
    expect(out).toMatchObject({ id: 'c1', workspaceId: U, createdAt: T, ...expected })
    if ('skills' in expected && expected.skills.length > 0) expect(out.skills).toEqual(expect.arrayContaining(expected.skills))
  })
})

describe('gap matches', () => {
  const input = { skill: 'SQL', area: 'sql', weight: 'core' as const, status: 'partial' as const, claimQuote: 'q', note: 'n', probeQuestion: 'p?', source: 'ai' as const }

  it('maps the insert; probe, area and source are not stored', () => {
    expect(gapMatchInsert(U, 't1', input, 'c1')).toEqual({
      user_id: U, target_id: 't1', skill_name: 'SQL', skill_weight: 'core', jd_quote: null, claim_id: 'c1', match_status: 'partial', note: 'n',
    })
    expect(gapMatchInsert(U, 't1', input, null).claim_id).toBeNull()
  })

  const row = (over: Partial<Row<'mirror_target_gap_matches'>>): Row<'mirror_target_gap_matches'> => ({
    id: 'm1', user_id: U, target_id: 't1', skill_name: 'SQL', skill_weight: 'core', jd_quote: null, claim_id: 'c1', match_status: 'covered', note: 'n', created_at: T, updated_at: T, ...over,
  })

  it.each([
    [row({}), 'quote', { area: 'sql', weight: 'core', status: 'covered', note: 'n', claimQuote: 'quote' }],
    [row({ skill_name: 'Mystery', note: null, claim_id: null }), null, { area: 'tools', note: '', claimQuote: null }],
    [row({ skill_weight: 'weird', match_status: 'weird' }), null, { weight: 'nice', status: 'gap' }],
  ])('rebuilds %#', (r, quote, expected) => {
    expect(gapMatchFromRow(U, r, quote)).toMatchObject({ id: 'm1', workspaceId: U, targetId: 't1', probeQuestion: null, source: 'fallback', createdAt: T, ...expected })
  })
})

describe('replay schedule', () => {
  const input = { itemId: 'sql-1', dueAt: T, intervalDays: 3, rung: 2, lastResult: true as boolean | null }

  it.each([
    [true, 'correct'],
    [false, 'missed'],
    [null, null],
  ])('lastResult %s -> last_recall %s', (lastResult, recall) => {
    expect(replayInsert(U, { ...input, lastResult }, T)).toEqual({
      user_id: U, item_kind: 'practice', item_key: 'sql-1', due_at: T, interval_days: 3, repetitions: 2, last_recall: recall, updated_at: T,
    })
  })

  const row = (over: Partial<Row<'mirror_replay_schedule'>>): Row<'mirror_replay_schedule'> => ({
    id: 'r1', user_id: U, item_kind: 'practice', item_key: 'sql-1', track: null, due_at: T, interval_days: 3, ease: 2.5, repetitions: 2, last_recall: 'correct', last_reviewed_at: null, created_at: T, updated_at: T, ...over,
  })

  it.each([
    [row({}), { intervalDays: 3, rung: 2, lastResult: true }],
    [row({ ease: '2.50' as unknown as number, interval_days: '6' as unknown as number, repetitions: '1' as unknown as number, last_recall: 'missed' }), { intervalDays: 6, rung: 1, lastResult: false }],
    [row({ last_recall: null }), { lastResult: null }],
    [row({ last_recall: 'unknown' }), { lastResult: null }],
    [row({ interval_days: null as unknown as number, repetitions: undefined as unknown as number }), { intervalDays: 0, rung: 0 }],
    [row({ interval_days: 'abc' as unknown as number }), { intervalDays: 0 }],
  ])('rebuilds %#', (r, expected) => {
    expect(replayFromRow(U, r)).toMatchObject({ id: 'r1', workspaceId: U, itemId: 'sql-1', dueAt: T, updatedAt: T, ...expected })
  })

  it.each([[2.5, 2.5], ['2.60', 2.6], [null, 2.5], ['x', 2.5]])('ease %j -> %d', (ease, expected) => {
    expect(easeOf({ ease: ease as unknown as number })).toBe(expected)
  })
})
