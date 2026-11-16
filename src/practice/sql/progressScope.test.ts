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
  it('sign-out clearing removes every mirror.* key but nothing else', () => {
    localStorage.setItem('mirror.draft.q1', 'x'); localStorage.setItem('mirror.data.v1.a.sql.diag', '{}'); localStorage.setItem('other', '1')
    clearBrowserKeys(localStorage)
    expect(Object.keys(localStorage)).toEqual(['other'])
  })
})
