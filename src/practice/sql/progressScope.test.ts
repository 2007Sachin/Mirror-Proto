// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { setUser } from '../../lib/data'
import { clearBrowserKeys } from '../../features/privacy/dataTools'
import { loadPlaced, loadTab, savePlaced } from './pathLogic'
import { loadDiag, saveDiag } from './plan/planLogic'

describe('SQL progress is kept per signed-in user', () => {
  beforeEach(() => { localStorage.clear(); setUser(null) })
  it('does not leak between users and is not kept when signed out', () => {
    setUser('a')
    savePlaced()
    saveDiag({ level: 'beginner' as never, modules: ['m1'] })
    expect(loadPlaced()).toBe(true)
    setUser('b')
    expect(loadPlaced()).toBe(false)
    expect(loadDiag()).toBeNull()
    setUser(null)
    savePlaced()
    expect(Object.keys(localStorage).filter(k => k.includes('sql'))).toEqual(['mirror.data.v1.a.sql.path.placed', 'mirror.data.v1.a.sql.diag'])
    expect(loadTab()).toBeDefined()
  })
  it('delete-all clearing removes every mirror.* key but nothing else', () => {
    localStorage.setItem('mirror.draft.q1', 'x'); localStorage.setItem('mirror.data.v1.a.sql.diag', '{}'); localStorage.setItem('other', '1')
    clearBrowserKeys(localStorage)
    expect(Object.keys(localStorage)).toEqual(['other'])
  })
  it('sign-out clearing keeps per-user progress and drops drafts, the open session and old unscoped keys', () => {
    for (const k of ['mirror.data.v1.a.sql.diag', 'mirror.data.v1.a.sql.path.placed', 'mirror.draft.q1', 'mirror.session', 'mirror.sql.diag', 'other']) localStorage.setItem(k, '1')
    clearBrowserKeys(localStorage, 'mirror.data.v1.')
    expect(Object.keys(localStorage).sort()).toEqual(['mirror.data.v1.a.sql.diag', 'mirror.data.v1.a.sql.path.placed', 'other'])
  })
  it('moves the old unscoped SQL keys to the user once, then deletes them', () => {
    const old = { 'mirror.sql.path.tab': 'plan', 'mirror.sql.path.placed': '1', 'mirror.sql.diag': '{"level":"beginner"}', 'mirror.sql.mock.v1': '{"x":1}' }
    for (const [k, v] of Object.entries(old)) localStorage.setItem(k, v)
    localStorage.setItem('mirror.data.v1.a.sql.diag', 'already-there')
    setUser('a')
    expect(Object.keys(localStorage).filter(k => !k.startsWith('mirror.data.v1.'))).toEqual([])
    expect(localStorage.getItem('mirror.data.v1.a.sql.path.tab')).toBe('plan')
    expect(localStorage.getItem('mirror.data.v1.a.sql.path.placed')).toBe('1')
    expect(localStorage.getItem('mirror.data.v1.a.sql.mock.v1')).toBe('{"x":1}')
    expect(localStorage.getItem('mirror.data.v1.a.sql.diag')).toBe('already-there') // never overwrites
    setUser(null); setUser('a')
    expect(localStorage.getItem('mirror.data.v1.a.sql.path.tab')).toBe('plan') // a second sign-in changes nothing
  })
})
