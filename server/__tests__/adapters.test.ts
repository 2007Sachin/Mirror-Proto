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
    [{ interviewId: 'iv1', itemId: null, questionIndex: 2 }, 'iv1:2'],
    [{ interviewId: null, itemId: 'sql-1', questionIndex: null }, 'sql-1:0'],
    [{ interviewId: null, itemId: undefined, questionIndex: null }, 'x:0'],
    [{ interviewId: 'iv1', itemId: 'ignored', questionIndex: null }, 'iv1:0'],
  ])('key %j -> %s', (input, key) => {
    expect(answerAttemptKey(input)).toBe(key)
  })

  it('maps the insert to the live columns, kind and item_id included', () => {
    expect(answerAttemptInsert(U, base)).toEqual({
      user_id: U, interview_id: 'iv1', turn_id: null, question_key: 'iv1:2', kind: 'retry', item_id: null, question: 'Why?', attempt_no: 3, answer_text: 'one two three', transcript_source: 'voice', word_count: 3,
    })
    expect(answerAttemptInsert(U, { ...base, interviewId: null, questionIndex: null, kind: 'explain', itemId: 'sql-1' })).toMatchObject({ question_key: 'sql-1:0', kind: 'explain', item_id: 'sql-1' })
    expect(answerAttemptInsert(U, { ...base, answer: '   ' }).word_count).toBe(0)
  })

  const row = (over: Partial<Row<'mirror_answer_attempts'>>): Row<'mirror_answer_attempts'> => ({
    id: 'a1', user_id: U, interview_id: 'iv1', turn_id: null, question_key: 'iv1:2', kind: 'retry', item_id: null, question: 'Why?', attempt_no: 3, answer_text: 'x', transcript_source: 'text',
    duration_seconds: null, word_count: null, created_at: T, ...over,
  })

  it.each([
    [{}, { kind: 'retry', itemId: null, questionIndex: 2, interviewId: 'iv1', transcriptSource: 'text' }],
    [{ interview_id: null, question_key: 'sql-1:0', kind: 'explain', item_id: 'sql-1', transcript_source: 'voice' }, { kind: 'explain', itemId: 'sql-1', questionIndex: null, interviewId: null, transcriptSource: 'voice' }],
    [{ interview_id: null, question_key: 'x:0', kind: 'explain' }, { kind: 'explain', itemId: null, questionIndex: null }],
    [{ attempt_no: '4' as unknown as number }, { attempt: 4 }],
    [{ question_key: 'garbage', kind: null }, { kind: 'retry', itemId: null }],
  ])('rebuilds %j', (over, expected) => {
    const out = answerAttemptFromRow(U, row(over))
    expect(out).toMatchObject({ id: 'a1', workspaceId: U, createdAt: T, ...expected })
  })

  it.each([
    [undefined, { kind: null, itemId: null, interviewId: null }],
    [{ kind: 'retry' as const, interviewId: 'iv1' }, { kind: 'retry', itemId: null, interviewId: 'iv1' }],
    [{ kind: 'explain' as const, itemId: 'sql_1' }, { kind: 'explain', itemId: 'sql_1', interviewId: null }],
  ])('filter %j', (filter, expected) => {
    expect(answerAttemptQuery(filter)).toEqual(expected)
  })
})

describe('stories', () => {
  const input = { title: 'T', themes: ['a'], situation: 's', task: 't', action: 'a', result: 'r', quote: 'q', question: 'qq', sourceInterviewId: 'iv1', sourceTurnId: 'tu1' }

  it('insert stores quote, question, source and the source turn', () => {
    expect(storyInsert(U, input)).toEqual({
      user_id: U, title: 'T', situation: 's', task: 't', action: 'a', result: 'r', themes: ['a'], quote: 'q', question: 'qq', source: 'interview', source_interview_id: 'iv1', source_turn_id: 'tu1', archived_at: null,
    })
    expect(storyInsert(U, { ...input, sourceInterviewId: null, sourceTurnId: null }).source).toBe('manual')
    expect(storyInsert(U, { ...input, sourceInterviewId: null, source: 'first_interview' }).source).toBe('first_interview')
  })

  it.each([
    [{}, { updated_at: T }],
    [{ title: 'N', quote: 'new', question: 'nq', sourceTurnId: 'x' }, { updated_at: T, title: 'N', quote: 'new', question: 'nq', source_turn_id: 'x' }],
    [{ themes: ['z'], sourceInterviewId: null, result: '' }, { updated_at: T, themes: ['z'], source_interview_id: null, source: 'manual', result: '' }],
  ])('patch %j', (patch, expected) => {
    expect(storyPatch(patch, T)).toEqual(expected)
  })

  it('reads nulls as empty text and keeps the stored quote, question and turn', () => {
    const r: Row<'mirror_stories'> = { id: 's1', user_id: U, title: 'T', situation: null, task: null, action: null, result: null, themes: [], quote: 'q', question: 'qq', source: 'interview', source_interview_id: 'iv1', source_turn_id: 'tu1', archived_at: null, created_at: T, updated_at: '2026-02-01T00:00:00.000Z' }
    expect(storyFromRow(U, r)).toEqual({
      id: 's1', workspaceId: U, title: 'T', themes: [], situation: '', task: '', action: '', result: '', quote: 'q', question: 'qq', sourceInterviewId: 'iv1', sourceTurnId: 'tu1', source: 'interview', createdAt: T, updatedAt: '2026-02-01T00:00:00.000Z',
    })
  })
})

describe('resume claims', () => {
  it('insert stores the quote, category, skills and flags', () => {
    expect(claimInsert(U, { quote: 'Built SQL dashboards', skills: ['SQL'], hasNumber: false, vague: false })).toEqual({
      user_id: U, claim: 'Built SQL dashboards', source_quote: 'Built SQL dashboards', category: 'skill', skills: ['SQL'], has_number: false, is_vague: false, resume_name: null,
    })
    expect(claimInsert(U, { quote: 'Cut cost 40%', skills: [], hasNumber: true, vague: false })).toMatchObject({ category: 'impact', has_number: true })
    expect(claimInsert(U, { quote: 'q', skills: [], hasNumber: false, vague: true }, 'cv.pdf')).toMatchObject({ category: 'other', is_vague: true, resume_name: 'cv.pdf' })
  })

  const row = (over: Partial<Row<'mirror_resume_claims'>>): Row<'mirror_resume_claims'> => ({
    id: 'c1', user_id: U, claim: 'x', category: 'other', source_quote: null, resume_name: null, skills: [], has_number: null, is_vague: null, created_at: T, updated_at: T, ...over,
  })

  it('uses the stored columns when they are filled', () => {
    expect(claimFromRow(U, row({ source_quote: 'q', skills: ['Excel'], has_number: true, is_vague: true }))).toMatchObject({ quote: 'q', skills: ['Excel'], hasNumber: true, vague: true })
  })

  it.each([
    [row({ source_quote: 'Reduced SQL query time by 40%' }), { skills: ['SQL'], hasNumber: true, vague: false }],
    [row({ source_quote: 'Helped with Python reports' }), { skills: ['Python'], hasNumber: false, vague: true }],
    [row({ claim: 'Python, SQL' }), { quote: 'Python, SQL', hasNumber: false, vague: true }],
    [row({ claim: 'Led a team of 5' }), { skills: [], hasNumber: true, vague: false }],
  ])('works the flags out again for older rows %#', (r, expected) => {
    const out = claimFromRow(U, r)
    expect(out).toMatchObject({ id: 'c1', workspaceId: U, createdAt: T, ...expected })
    if ('skills' in expected && expected.skills.length > 0) expect(out.skills).toEqual(expect.arrayContaining(expected.skills))
  })
})

describe('gap matches', () => {
  const input = { skill: 'SQL', area: 'sql', weight: 'core' as const, status: 'partial' as const, claimQuote: 'q', note: 'n', probeQuestion: 'p?', source: 'ai' as const }

  it('maps the insert, probe question, area and source included', () => {
    expect(gapMatchInsert(U, 't1', input, 'c1')).toEqual({
      user_id: U, target_id: 't1', skill_name: 'SQL', skill_weight: 'core', jd_quote: null, claim_id: 'c1', match_status: 'partial', note: 'n', probe_question: 'p?', area: 'sql', source: 'ai',
    })
    expect(gapMatchInsert(U, 't1', input, null).claim_id).toBeNull()
  })

  const row = (over: Partial<Row<'mirror_target_gap_matches'>>): Row<'mirror_target_gap_matches'> => ({
    id: 'm1', user_id: U, target_id: 't1', skill_name: 'SQL', skill_weight: 'core', jd_quote: null, claim_id: 'c1', match_status: 'covered', note: 'n', probe_question: null, area: null, source: null, created_at: T, updated_at: T, ...over,
  })

  it.each([
    [row({}), 'quote', { area: 'sql', weight: 'core', status: 'covered', note: 'n', claimQuote: 'quote', probeQuestion: null, source: 'fallback' }],
    [row({ skill_name: 'Mystery', note: null, claim_id: null }), null, { area: 'tools', note: '', claimQuote: null }],
    [row({ skill_weight: 'weird', match_status: 'weird' }), null, { weight: 'nice', status: 'gap' }],
    [row({ probe_question: 'p?', area: 'python', source: 'ai' }), null, { probeQuestion: 'p?', area: 'python', source: 'ai' }],
  ])('rebuilds %#', (r, quote, expected) => {
    expect(gapMatchFromRow(U, r, quote)).toMatchObject({ id: 'm1', workspaceId: U, targetId: 't1', createdAt: T, ...expected })
  })
})

describe('replay schedule', () => {
  const input = { itemId: 'sql-1', dueAt: T, intervalDays: 3, rung: 2, lastResult: true as boolean | null }

  it.each(['question', 'pattern', 'practice_item'] as const)('writes item_kind %s as given', kind => {
    expect(replayInsert(U, { ...input, kind }, T).item_kind).toBe(kind)
  })

  it.each([
    [true, 'good'],
    [false, 'again'],
    [null, null],
  ])('lastResult %s -> last_recall %s', (lastResult, recall) => {
    expect(replayInsert(U, { ...input, lastResult }, T)).toEqual({
      user_id: U, item_kind: 'practice_item', item_key: 'sql-1', due_at: T, interval_days: 3, repetitions: 2, last_recall: recall, updated_at: T,
    })
  })

  const row = (over: Partial<Row<'mirror_replay_schedule'>>): Row<'mirror_replay_schedule'> => ({
    id: 'r1', user_id: U, item_kind: 'practice_item', item_key: 'sql-1', track: null, due_at: T, interval_days: 3, ease: 2.5, repetitions: 2, last_recall: 'good', last_reviewed_at: null, created_at: T, updated_at: T, ...over,
  })

  it.each(['question', 'pattern', 'practice_item'] as const)('reads item_kind %s back', k => {
    expect(replayFromRow(U, row({ item_kind: k })).kind).toBe(k)
  })

  it.each([
    [row({}), { intervalDays: 3, rung: 2, lastResult: true }],
    [row({ ease: '2.50' as unknown as number, interval_days: '6' as unknown as number, repetitions: '1' as unknown as number, last_recall: 'again' }), { intervalDays: 6, rung: 1, lastResult: false }],
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
