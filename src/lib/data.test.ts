// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { answerAttempts, clearAll, gapMatches, getCapabilities, replay, resetCapabilities, resumeClaims, stories, type StoryInput } from './data'

const story = (title: string): StoryInput => ({
  title, themes: ['impact'], situation: 's', task: 't', action: 'a', result: 'r', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null,
})
const attemptBase = { interviewId: 'i1', questionIndex: 0, question: 'Why?', attempt: 2, answer: 'Because.', kind: 'retry' as const, transcriptSource: 'text' as const }

const reply = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status })

describe('data.ts: browser backend', () => {
  beforeEach(() => {
    localStorage.clear()
    resetCapabilities()
    // The server says it does not keep the new stores, so everything lands in localStorage.
    vi.stubGlobal('fetch', vi.fn(async () => reply({ newData: 'browser', screenLongCalls: false })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('reads capabilities once', async () => {
    await getCapabilities()
    await getCapabilities()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(await getCapabilities()).toEqual({ newData: 'browser', screenLongCalls: false })
  })

  it('falls back to the browser, and retries later, when capabilities cannot be read', async () => {
    resetCapabilities()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect((await getCapabilities()).newData).toBe('browser')
    vi.stubGlobal('fetch', vi.fn(async () => reply({ newData: 'server', screenLongCalls: true })))
    expect((await getCapabilities()).newData).toBe('server')
  })

  it('answer attempts: oldest first, filtered, deletable, versioned key', async () => {
    const a = await answerAttempts.add(attemptBase)
    await answerAttempts.add({ ...attemptBase, interviewId: null, questionIndex: null, kind: 'explain', itemId: 'sql-1', answer: 'Second.' })
    expect(a).toMatchObject({ workspaceId: 'local', itemId: null })
    expect((await answerAttempts.list()).map(x => x.answer)).toEqual(['Because.', 'Second.'])
    expect(await answerAttempts.list({ interviewId: 'i1' })).toHaveLength(1)
    expect(await answerAttempts.list({ itemId: 'sql-1' })).toHaveLength(1)
    expect(await answerAttempts.list({ kind: 'explain' })).toHaveLength(1)
    expect(localStorage.getItem('mirror.data.v1.attempts')).toContain('Second.')
    await answerAttempts.deleteAll()
    expect(await answerAttempts.list()).toEqual([])
  })

  it('stories: newest first, update, get, remove, removeAll', async () => {
    const one = await stories.create(story('One'))
    await stories.create(story('Two'))
    expect((await stories.list()).map(s => s.title)).toEqual(['Two', 'One'])
    expect(await stories.get(one.id)).toMatchObject({ title: 'One' })
    expect(await stories.get('nope')).toBeNull()
    const updated = await stories.update(one.id, { title: 'Renamed' })
    expect(updated).toMatchObject({ id: one.id, title: 'Renamed', createdAt: one.createdAt })
    expect(await stories.update('nope', { title: 'x' })).toBeNull()
    await stories.remove(one.id)
    expect(await stories.list()).toHaveLength(1)
    await stories.removeAll()
    expect(await stories.list()).toEqual([])
  })

  it('claims are replaced whole; matches are replaced per target', async () => {
    await resumeClaims.replace([{ quote: 'a', skills: [], hasNumber: false, vague: false }])
    await resumeClaims.replace([{ quote: 'b', skills: ['SQL'], hasNumber: true, vague: false }, { quote: 'c', skills: [], hasNumber: false, vague: true }])
    expect((await resumeClaims.list()).map(c => c.quote)).toEqual(['b', 'c'])
    const m = (skill: string) => ({ skill, area: 'sql', weight: 'core' as const, status: 'gap' as const, claimQuote: null, note: 'n', probeQuestion: null, source: 'fallback' as const })
    await gapMatches.replace('t1', [m('SQL'), m('Python')])
    await gapMatches.replace('t2', [m('Tableau')])
    await gapMatches.replace('t1', [m('Excel')])
    expect((await gapMatches.list('t1')).map(x => x.skill)).toEqual(['Excel'])
    expect((await gapMatches.list('t2'))[0].targetId).toBe('t2')
  })

  it('replay: one row per item, soonest first', async () => {
    const item = { itemId: 'a', dueAt: '2026-02-05T00:00:00.000Z', intervalDays: 3, rung: 1, lastResult: true }
    const first = await replay.upsert(item)
    await replay.upsert({ ...item, itemId: 'b', dueAt: '2026-02-01T00:00:00.000Z' })
    const again = await replay.upsert({ ...item, rung: 2 })
    expect(again.id).toBe(first.id)
    expect((await replay.list()).map(r => r.itemId)).toEqual(['b', 'a'])
    await replay.remove('a')
    expect(await replay.list()).toHaveLength(1)
  })

  it('ignores corrupt storage and keeps working when storage is blocked', async () => {
    localStorage.setItem('mirror.data.v1.stories', '{not json')
    expect(await stories.list()).toEqual([])
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    await stories.create(story('Kept in memory'))
    expect((await stories.list()).map(s => s.title)).toEqual(['Kept in memory'])
    spy.mockRestore()
    getSpy.mockRestore()
  })

  it('clearAll empties every store and never throws', async () => {
    await stories.create(story('x'))
    await answerAttempts.add(attemptBase)
    await clearAll()
    expect(await stories.list()).toEqual([])
    expect(await answerAttempts.list()).toEqual([])
    expect(Object.keys(localStorage).filter(k => k.startsWith('mirror.data.v1.'))).toEqual([])
  })
})

describe('data.ts: server backend', () => {
  const calls: { path: string; method: string; body: unknown; ws: string | null }[] = []
  beforeEach(() => {
    localStorage.clear()
    resetCapabilities()
    calls.length = 0
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const path = String(url).replace(/^\/api/, '')
      const headers = new Headers(init?.headers)
      calls.push({ path, method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined, ws: headers.get('X-Dev-Workspace') })
      if (path === '/capabilities') return reply({ newData: 'server', screenLongCalls: true })
      if (path.startsWith('/stories/missing')) return reply({ error: 'story_not_found' }, 404)
      if (path.startsWith('/targets/') && path.endsWith('/match')) return reply({ matches: [] })
      if (init?.method === 'DELETE') return reply(null, 204)
      return reply([])
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('calls the generic routes with the workspace header and never touches localStorage', async () => {
    await answerAttempts.add(attemptBase)
    await answerAttempts.list({ interviewId: 'i1', kind: 'retry' })
    await stories.list()
    await resumeClaims.replace([])
    await gapMatches.replace('t1', [])
    await gapMatches.list('t1')
    await replay.upsert({ itemId: 'a', dueAt: '2026-01-01T00:00:00.000Z', intervalDays: 1, rung: 0, lastResult: null })
    await replay.remove('a b')
    const seen = calls.filter(c => c.path !== '/capabilities').map(c => `${c.method} ${c.path}`)
    expect(seen).toEqual([
      'POST /replay/attempts',
      'GET /replay/attempts?interviewId=i1&kind=retry',
      'GET /stories',
      'PUT /resume/claims',
      'PUT /targets/t1/match',
      'GET /targets/t1/match',
      'PUT /practice/schedule',
      'DELETE /practice/schedule?itemId=a%20b',
    ])
    expect(calls.every(c => c.ws === 'dev')).toBe(true)
    expect(calls.find(c => c.path === '/resume/claims')?.body).toEqual({ claims: [] })
    expect(calls.filter(c => c.path === '/capabilities')).toHaveLength(1)
    expect(Object.keys(localStorage)).toEqual([])
  })

  it('a missing story is null, not an error', async () => {
    expect(await stories.get('missing')).toBeNull()
    expect(await stories.update('missing', { title: 'x' })).toBeNull()
  })

  it('clearAll also resets the server', async () => {
    await clearAll()
    expect(calls.some(c => c.method === 'DELETE' && c.path === '/data')).toBe(true)
  })
})
