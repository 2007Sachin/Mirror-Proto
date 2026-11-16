/**
 * LIVE row-level-security test. Opt-in: it is SKIPPED unless LIVE_RLS=1, so the default `npx vitest run` stays offline.
 *
 *   LIVE_RLS=1 npx vitest run server/__tests__/live
 *
 * (PowerShell: `$env:LIVE_RLS='1'; npx vitest run server/__tests__/live`.)
 * Needs SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (read from the environment or .env; values are never printed).
 *
 * It creates TWO throwaway auth users (admin API, random password, mirror-rls-a-<random>@example.test), signs each in,
 * and with each user's own token (anon key + Authorization: Bearer) inserts a row into all 12 mirror_* tables as A.
 * Then, as B, for every table: select shows no A rows, update and delete change zero A rows, inserting with A's user_id
 * is rejected, and inserting a child (turn, reflection, answer attempt, gap match) that points at A's parent is rejected.
 * The anon client with no token is rejected on every table too.
 * A third throwaway user (C) then round-trips every column added by migration 0009 through the real repository, and every
 * allowed value of the check-constrained columns is inserted once.
 * afterAll removes both users' rows (each with its own session) and then only the two users it created. The service key is
 * used for creating and deleting those two users and nothing else.
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createUserRepository } from '../../repo/supabase.js'

const LIVE = process.env.LIVE_RLS === '1'
if (LIVE) await import('dotenv/config')

type Db = SupabaseClient
type Row = Record<string, unknown>
interface Who { id: string; db: Db }

const TABLES = [
  'mirror_workspaces', 'mirror_interviews', 'mirror_turns', 'mirror_reflections', 'mirror_profiles', 'mirror_targets',
  'mirror_practice_attempts', 'mirror_answer_attempts', 'mirror_stories', 'mirror_resume_claims', 'mirror_target_gap_matches', 'mirror_replay_schedule',
] as const
type Table = (typeof TABLES)[number]
/** The column that identifies one row of the table. */
const KEY: Record<Table, string> = {
  mirror_workspaces: 'slug', mirror_profiles: 'workspace_id',
  mirror_interviews: 'id', mirror_turns: 'id', mirror_reflections: 'id', mirror_targets: 'id', mirror_practice_attempts: 'id',
  mirror_answer_attempts: 'id', mirror_stories: 'id', mirror_resume_claims: 'id', mirror_target_gap_matches: 'id', mirror_replay_schedule: 'id',
}
interface Parents { interview?: string; target?: string }

/** The row a user inserts into each table. Child tables point at that same user's parents. */
function rowFor(table: Table, u: string, p: Parents, variant = 0): Row {
  const own = { user_id: u }
  const ws = { workspace_id: u, user_id: u }
  switch (table) {
    case 'mirror_workspaces': return { slug: u, user_id: u }
    case 'mirror_interviews': return { ...ws, role: 'RLS test', status: 'in_progress', asked_questions: ['Q1'] }
    case 'mirror_turns': return { ...ws, interview_id: p.interview, question_index: 0, question: 'Q1', answer: 'rls test answer' }
    case 'mirror_reflections': return { ...ws, interview_id: p.interview, role: 'RLS test', evidence: [], focus: 'f', model: 'fallback' }
    case 'mirror_profiles': return { ...ws, role: 'RLS test', story: 's', pressure_question: 'q', pressure_answer: 'a', summary: 's', focus: 'f', first_question: 'q?' }
    case 'mirror_targets': return { ...ws, company: 'RLS Co', role: 'RLS test', jd: 'rls test job description', skills: [], rounds: [], events: [], debriefs: [] }
    case 'mirror_practice_attempts': return { ...ws, item_id: 'rls-item', track: 'sql', topic: 't', level: 1, correct: true }
    case 'mirror_answer_attempts': return { ...own, interview_id: p.interview ?? null, question_key: 'rls-q', question: 'Q', attempt_no: 1, answer_text: 'rls test' }
    case 'mirror_stories': return { ...own, title: 'RLS story', themes: [] }
    case 'mirror_resume_claims': return { ...own, claim: 'rls test claim' }
    case 'mirror_target_gap_matches': return { ...own, target_id: p.target, skill_name: 'SQL', skill_weight: ['core', 'nice'][variant % 2], match_status: ['gap', 'partial', 'covered'][variant % 3] }
    case 'mirror_replay_schedule': return { ...own, item_kind: 'question', track: 'sql', item_key: 'rls-item' }
  }
}

const keyOf = (table: Table, row: Row) => row[KEY[table]] as string

describe.skipIf(!LIVE)('live RLS: two users, twelve tables', () => {
  vi.setConfig({ testTimeout: 60_000 }) // every check is a real network round trip
  const url = process.env.SUPABASE_URL ?? ''
  const anon = process.env.SUPABASE_ANON_KEY ?? ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const opts = { auth: { persistSession: false, autoRefreshToken: false } }
  const created: string[] = [] // only users this test made
  let a: Who
  let b: Who
  let c: Who | undefined
  let anonDb: Db
  const aRows = {} as Record<Table, string> // key of A's row per table
  const aParents: Parents = {}

  async function makeUser(admin: Db, tag: string): Promise<Who> {
    const email = `mirror-rls-${tag}-${randomBytes(6).toString('hex')}@example.test`
    const password = randomBytes(24).toString('base64url')
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !data.user) throw new Error(`could not create test user ${tag}`)
    created.push(data.user.id)
    const { data: session, error: signInError } = await createClient(url, anon, opts).auth.signInWithPassword({ email, password })
    if (signInError || !session.session) throw new Error(`could not sign in test user ${tag}`)
    const db = createClient(url, anon, { ...opts, global: { headers: { Authorization: `Bearer ${session.session.access_token}` } } })
    return { id: data.user.id, db }
  }

  /** Insert as `who`; for check-constrained columns of unknown values, try the next variant on a constraint error. */
  async function insertAs(who: Who, table: Table, parents: Parents) {
    let last: { message: string } | null = null
    for (let variant = 0; variant < 12; variant++) {
      const { data, error } = await who.db.from(table).insert(rowFor(table, who.id, parents, variant)).select().single()
      if (!error) return data as Row
      last = error
      if (!/check constraint|violates check/i.test(error.message)) break
    }
    throw new Error(`seed insert into ${table} failed: ${last?.message}`)
  }

  beforeAll(async () => {
    expect(url && anon && service, 'SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be set').toBeTruthy()
    const admin = createClient(url, service, opts)
    anonDb = createClient(url, anon, opts)
    a = await makeUser(admin, 'a')
    b = await makeUser(admin, 'b')
    // A's rows, parents first.
    for (const t of TABLES) {
      const row = await insertAs(a, t, aParents)
      aRows[t] = keyOf(t, row)
      if (t === 'mirror_interviews') aParents.interview = aRows[t]
      if (t === 'mirror_targets') aParents.target = aRows[t]
    }
    // B has a workspace of its own, so a child insert fails because of A's parent, not for a missing workspace.
    await insertAs(b, 'mirror_workspaces', {})
  }, 120_000)

  afterAll(async () => {
    const order = [...TABLES].reverse()
    for (const who of [a, b, c]) {
      if (!who) continue
      for (const t of order) await who.db.from(t).delete().eq('user_id', who.id)
    }
    if (created.length) {
      const admin = createClient(url, service, opts)
      for (const id of created) await admin.auth.admin.deleteUser(id)
    }
  }, 120_000)

  it('A can read back its own row in every table (the seed is visible to its owner)', async () => {
    for (const t of TABLES) {
      const { data, error } = await a.db.from(t).select('*').eq(KEY[t], aRows[t])
      expect(error, t).toBeNull()
      expect(data, t).toHaveLength(1)
    }
  }, 60_000)

  for (const table of TABLES) {
    describe(table, () => {
      it('B cannot select A’s rows', async () => {
        const byKey = await b.db.from(table).select('*').eq(KEY[table], aRows[table])
        expect(byKey.data ?? [], 'by key').toHaveLength(0)
        const all = await b.db.from(table).select('*').eq('user_id', a.id)
        expect(all.data ?? [], 'by owner').toHaveLength(0)
      })

      it('B’s update and delete change zero of A’s rows', async () => {
        const upd = await b.db.from(table).update({ created_at: '2001-01-01T00:00:00Z' }).eq(KEY[table], aRows[table]).select()
        expect(upd.data ?? [], 'update').toHaveLength(0)
        const del = await b.db.from(table).delete().eq(KEY[table], aRows[table]).select()
        expect(del.data ?? [], 'delete').toHaveLength(0)
        const mine = await a.db.from(table).select('*').eq(KEY[table], aRows[table])
        expect(mine.data, 'A still has it').toHaveLength(1)
        expect(String((mine.data as Row[])[0].created_at).startsWith('2001')).toBe(false)
      })

      it('B cannot insert a row owned by A', async () => {
        const { error } = await b.db.from(table).insert(rowFor(table, a.id, aParents, 0))
        expect(error, 'insert as A').not.toBeNull()
      })

      it('the anon client without a token is rejected', async () => {
        const sel = await anonDb.from(table).select('*').eq(KEY[table], aRows[table])
        expect(sel.data ?? [], 'select').toHaveLength(0)
        const ins = await anonDb.from(table).insert(rowFor(table, a.id, aParents, 0))
        expect(ins.error, 'insert').not.toBeNull()
        const del = await anonDb.from(table).delete().eq(KEY[table], aRows[table]).select()
        expect(del.data ?? [], 'delete').toHaveLength(0)
      })
    })
  }

  it('B cannot attach a child to A’s parent (turn, reflection, answer attempt, gap match)', async () => {
    const mineWs = { workspace_id: b.id, user_id: b.id }
    const attempts: [string, Row][] = [
      ['mirror_turns', { ...mineWs, interview_id: aParents.interview, question_index: 9, question: 'Q', answer: 'child of A' }],
      ['mirror_reflections', { ...mineWs, interview_id: aParents.interview, role: 'x', evidence: [], focus: 'f', model: 'fallback' }],
      ['mirror_answer_attempts', { user_id: b.id, interview_id: aParents.interview, question_key: 'k', question: 'Q', attempt_no: 1, answer_text: 'child of A' }],
      ['mirror_target_gap_matches', { user_id: b.id, target_id: aParents.target, skill_name: 'SQL', skill_weight: 'core', match_status: 'gap' }],
    ]
    for (const [table, row] of attempts) {
      const { error } = await b.db.from(table).insert(row)
      expect(error, `${table} child of A's parent`).not.toBeNull()
    }
  })

  it('B cannot claim another random user id either', async () => {
    const { error } = await b.db.from('mirror_stories').insert({ user_id: randomUUID(), title: 'x', themes: [] })
    expect(error).not.toBeNull()
  })
  it('round-trips every column of migration 0009 through the repository, as a third user', async () => {
    const admin = createClient(url, service, opts)
    c = await makeUser(admin, 'c')
    const parents: Parents = {}
    const seeded: Partial<Record<Table, string>> = {}
    for (const t of ['mirror_workspaces', 'mirror_interviews', 'mirror_turns', 'mirror_targets'] as const) {
      const row = await insertAs(c, t, parents)
      seeded[t] = keyOf(t, row)
      if (t === 'mirror_interviews') parents.interview = seeded[t]
      if (t === 'mirror_targets') parents.target = seeded[t]
    }
    const repo = createUserRepository(c.db, c.id)
    const ws = c.id

    // answer attempts: kind and item_id are columns now
    const retry = await repo.addAnswerAttempt(ws, { interviewId: parents.interview!, questionIndex: 1, question: 'Q?', attempt: 2, answer: 'one two three', kind: 'retry', itemId: null, transcriptSource: 'voice' })
    const explain = await repo.addAnswerAttempt(ws, { interviewId: null, questionIndex: null, question: 'Explain', attempt: 1, answer: 'because joins', kind: 'explain', itemId: 'sql-live-1', transcriptSource: 'text' })
    expect(retry).toMatchObject({ kind: 'retry', itemId: null, questionIndex: 1 })
    expect(explain).toMatchObject({ kind: 'explain', itemId: 'sql-live-1', questionIndex: null })
    const rawAttempts = await c.db.from('mirror_answer_attempts').select('kind, item_id, question_key').eq('user_id', c.id).order('created_at')
    expect(rawAttempts.data).toEqual([
      { kind: 'retry', item_id: null, question_key: `${parents.interview}:1` },
      { kind: 'explain', item_id: 'sql-live-1', question_key: 'sql-live-1:0' },
    ])
    expect((await repo.listAnswerAttempts(ws, { kind: 'explain' })).map(r => r.itemId)).toEqual(['sql-live-1'])
    expect((await repo.listAnswerAttempts(ws, { itemId: 'sql-live-1' })).map(r => r.kind)).toEqual(['explain'])
    expect((await repo.listAnswerAttempts(ws, { interviewId: parents.interview!, kind: 'retry' })).map(r => r.attempt)).toEqual([2])

    // stories: quote, question, source and the source turn (a real FK to mirror_turns)
    const base = { title: 'Live story', themes: ['ownership'], situation: 's', task: 't', action: 'a', result: 'r', quote: 'I owned the rebuild', question: 'Tell me about a project' }
    const fromInterview = await repo.createStory(ws, { ...base, sourceInterviewId: parents.interview!, sourceTurnId: seeded.mirror_turns! })
    const manual = await repo.createStory(ws, { ...base, title: 'Manual story', sourceInterviewId: null, sourceTurnId: null })
    expect(fromInterview).toMatchObject({ quote: base.quote, question: base.question, sourceInterviewId: parents.interview, sourceTurnId: seeded.mirror_turns })
    const rawStories = await c.db.from('mirror_stories').select('title, quote, question, source, source_turn_id').eq('user_id', c.id).order('created_at')
    expect(rawStories.data).toEqual([
      { title: 'Live story', quote: base.quote, question: base.question, source: 'interview', source_turn_id: seeded.mirror_turns },
      { title: 'Manual story', quote: base.quote, question: base.question, source: 'manual', source_turn_id: null },
    ])
    const patched = await repo.updateStory(ws, manual.id, { quote: 'new quote', question: 'new question' })
    expect(patched).toMatchObject({ quote: 'new quote', question: 'new question' })
    const listed = await repo.listStories(ws)
    expect(listed.map(r => r.quote).sort()).toEqual(['I owned the rebuild', 'new quote'])

    // resume claims: category, skills (text[]), has_number, is_vague
    const claims = await repo.replaceResumeClaims(ws, [
      { quote: 'Cut report time from 3 hours to 20 minutes with SQL', skills: ['SQL'], hasNumber: true, vague: false },
      { quote: 'Built dashboards in Python and Excel', skills: ['Python', 'Excel'], hasNumber: false, vague: false },
      { quote: 'Helped with various things for the team', skills: [], hasNumber: false, vague: true },
    ])
    expect(claims).toHaveLength(3)
    const rawClaims = await c.db.from('mirror_resume_claims').select('claim, category, skills, has_number, is_vague').eq('user_id', c.id).order('created_at')
    expect(rawClaims.data).toEqual([
      { claim: 'Cut report time from 3 hours to 20 minutes with SQL', category: 'impact', skills: ['SQL'], has_number: true, is_vague: false },
      { claim: 'Built dashboards in Python and Excel', category: 'skill', skills: ['Python', 'Excel'], has_number: false, is_vague: false },
      { claim: 'Helped with various things for the team', category: 'other', skills: [], has_number: false, is_vague: true },
    ])
    const readClaims = await repo.listResumeClaims(ws)
    expect(readClaims.find(r => r.quote.startsWith('Built dashboards'))).toMatchObject({ skills: ['Python', 'Excel'], hasNumber: false, vague: false })
    expect(readClaims.find(r => r.quote.startsWith('Helped'))).toMatchObject({ skills: [], vague: true })

    // gap matches: probe_question, area, source, every weight and status
    const matches = await repo.replaceGapMatches(ws, parents.target!, [
      { skill: 'SQL', area: 'sql', weight: 'core', status: 'covered', claimQuote: claims[0].quote, note: 'n1', probeQuestion: 'How did you cut the time?', source: 'ai' },
      { skill: 'Python', area: 'python', weight: 'core', status: 'partial', claimQuote: claims[1].quote, note: 'n2', probeQuestion: 'Where did you use Python?', source: 'fallback' },
      { skill: 'Tableau', area: 'tools', weight: 'nice', status: 'gap', claimQuote: null, note: 'n3', probeQuestion: 'Tell me about a chart you built', source: 'fallback' },
    ])
    expect(matches).toHaveLength(3)
    const rawMatches = await c.db.from('mirror_target_gap_matches').select('skill_name, skill_weight, match_status, probe_question, area, source, claim_id').eq('user_id', c.id).order('skill_name')
    expect(rawMatches.data?.map(r => [r.skill_name, r.skill_weight, r.match_status, r.probe_question, r.area, r.source])).toEqual([
      ['Python', 'core', 'partial', 'Where did you use Python?', 'python', 'fallback'],
      ['SQL', 'core', 'covered', 'How did you cut the time?', 'sql', 'ai'],
      ['Tableau', 'nice', 'gap', 'Tell me about a chart you built', 'tools', 'fallback'],
    ])
    expect(rawMatches.data?.find(r => r.skill_name === 'SQL')?.claim_id).not.toBeNull()
    expect(rawMatches.data?.find(r => r.skill_name === 'Tableau')?.claim_id).toBeNull()
    const readMatches = await repo.listGapMatches(ws, parents.target!)
    expect(readMatches.find(r => r.skill === 'SQL')).toMatchObject({ probeQuestion: 'How did you cut the time?', area: 'sql', source: 'ai', status: 'covered', weight: 'core', claimQuote: claims[0].quote })
    expect(readMatches.find(r => r.skill === 'Tableau')).toMatchObject({ area: 'tools', source: 'fallback', status: 'gap', weight: 'nice', claimQuote: null })

    // replay schedule: every item kind, and the recall mapping
    for (const kind of ['question', 'pattern', 'practice_item'] as const) {
      const saved = await repo.upsertReplayItem(ws, { itemId: `live-${kind}`, kind, dueAt: '2026-12-01T00:00:00.000Z', intervalDays: 3, rung: 1, lastResult: true })
      expect(saved).toMatchObject({ itemId: `live-${kind}`, kind, intervalDays: 3, rung: 1, lastResult: true })
    }
    const again = await repo.upsertReplayItem(ws, { itemId: 'live-question', kind: 'question', dueAt: '2026-12-05T00:00:00.000Z', intervalDays: 1, rung: 0, lastResult: false })
    expect(again).toMatchObject({ lastResult: false, intervalDays: 1 })
    const schedule = await repo.listReplaySchedule(ws)
    expect(schedule.map(r => [r.itemId, r.kind]).sort()).toEqual([['live-pattern', 'pattern'], ['live-practice_item', 'practice_item'], ['live-question', 'question']])
    const rawReplay = await c.db.from('mirror_replay_schedule').select('item_kind, item_key').eq('user_id', c.id)
    expect(rawReplay.data).toHaveLength(3)

    // the user's own export carries the new columns too
    const everything = await repo.exportAllData(ws)
    expect(everything.stories.map(r => r.quote)).toContain('I owned the rebuild')
    expect(everything.gapMatches.map(r => r.probeQuestion)).toContain('How did you cut the time?')
  }, 120_000)

  it('accepts every allowed value of the check-constrained columns', async () => {
    const who = c!
    const ok = async (table: Table, row: Row) => {
      const { error } = await who.db.from(table).insert(row)
      expect(error, `${table} ${JSON.stringify(row)}`).toBeNull()
    }
    for (const source of ['manual', 'first_interview', 'interview']) await ok('mirror_stories', { user_id: who.id, title: `src ${source}`, themes: [], source })
    for (const category of ['skill', 'tool', 'project', 'impact', 'role', 'education', 'other']) await ok('mirror_resume_claims', { user_id: who.id, claim: `cat ${category}`, category })
    for (const kind of ['question', 'pattern', 'practice_item']) await ok('mirror_replay_schedule', { user_id: who.id, item_kind: kind, item_key: `allowed-${kind}`, track: 'sql' })
    const target = (await who.db.from('mirror_targets').select('id').eq('user_id', who.id).limit(1).single()).data?.id as string
    for (const w of ['core', 'nice']) for (const m of ['covered', 'partial', 'gap']) await ok('mirror_target_gap_matches', { user_id: who.id, target_id: target, skill_name: `s-${w}-${m}`, skill_weight: w, match_status: m })
    const bad = await who.db.from('mirror_resume_claims').insert({ user_id: who.id, claim: 'bad', category: 'not_a_category' })
    expect(bad.error).not.toBeNull()
  }, 120_000)
})
