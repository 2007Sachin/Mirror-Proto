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
 * afterAll removes both users' rows (each with its own session) and then only the two users it created. The service key is
 * used for creating and deleting those two users and nothing else.
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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
    case 'mirror_replay_schedule': return { ...own, item_kind: ['practice', 'sql', 'answer', 'item'][variant % 4], item_key: 'rls-item' }
  }
}

const keyOf = (table: Table, row: Row) => row[KEY[table]] as string

describe.skipIf(!LIVE)('live RLS: two users, twelve tables', () => {
  const url = process.env.SUPABASE_URL ?? ''
  const anon = process.env.SUPABASE_ANON_KEY ?? ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const opts = { auth: { persistSession: false, autoRefreshToken: false } }
  const created: string[] = [] // only users this test made
  let a: Who
  let b: Who
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
    for (const who of [a, b]) {
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
  })

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
})
