import { beforeEach, describe, expect, it, vi } from 'vitest'

const inserts: Record<string, unknown>[] = []

// A table stub that echoes what was inserted, as the real insert().select().single() would.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      insert: (r: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            inserts.push(r)
            return { data: { id: 'i1', workspace_id: 'w', status: 'in_progress', created_at: 'now', industry: null, ...r }, error: null }
          },
        }),
      }),
      select: () => ({
        eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'i1', workspace_id: 'w', role: 'Analyst', industry: null, status: 'in_progress', asked_questions: ['a'], created_at: 'now', ...(inserts[0] ?? {}) }, error: null }) }) }),
      }),
    }),
  }),
}))

import { createSupabaseRepository } from '../repo/supabase.js'

const QS = ['One here is?', 'Two here is?', 'Three here is?', 'Four here is?', 'Five here is?', 'Six here is?']
const screen = { role: 'Analyst', openingQuestion: QS[0], askedQuestions: QS, kind: 'screen' as const, questionCap: 6, timeCapSeconds: 480, startedAt: '2026-01-01T00:00:00.000Z', targetId: 't1' }

describe('supabase interviews and migration 0008', () => {
  beforeEach(() => {
    inserts.length = 0
  })

  it('not ready: no new columns on insert, four questions at most, metadata kept server-side', async () => {
    const repo = createSupabaseRepository('https://example.supabase.co', 'k')
    const row = await repo.createInterview('w', screen)
    expect(Object.keys(inserts[0]).sort()).toEqual(['asked_questions', 'industry', 'role', 'status', 'workspace_id'])
    expect(inserts[0].asked_questions).toEqual(QS.slice(0, 4))
    expect(row).toMatchObject({ kind: 'screen', questionCap: 4, timeCapSeconds: 480, targetId: 't1', startedAt: '2026-01-01T00:00:00.000Z' })
    expect((await repo.getInterview('w', 'i1'))?.questionCap).toBe(4)
  })

  it('not ready: a practice interview is untouched', async () => {
    const repo = createSupabaseRepository('https://example.supabase.co', 'k')
    const row = await repo.createInterview('w', { role: 'Analyst', openingQuestion: 'Opening question here?' })
    expect(Object.keys(inserts[0])).not.toContain('kind')
    expect(row).toMatchObject({ kind: 'practice', questionCap: null })
  })

  it('ready: writes and reads the new columns and keeps every question', async () => {
    const repo = createSupabaseRepository('https://example.supabase.co', 'k', { screenDbReady: true })
    const row = await repo.createInterview('w', screen)
    expect(inserts[0]).toMatchObject({ kind: 'screen', question_cap: 6, time_cap_seconds: 480, started_at: '2026-01-01T00:00:00.000Z', target_id: 't1' })
    expect(inserts[0].asked_questions).toEqual(QS)
    expect(row).toMatchObject({ kind: 'screen', questionCap: 6, timeCapSeconds: 480, targetId: 't1' })
  })
})
