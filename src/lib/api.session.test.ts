// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './api'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const session = { user: { id: 'u1', email: 'a@b.co' }, providers: { google: false } }

afterEach(() => vi.unstubAllGlobals())

describe('silent session refresh on 401', () => {
  it('re-checks the session and retries the call instead of signing out', async () => {
    const lost = vi.fn()
    window.addEventListener('mirror:unauthenticated', lost)
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ error: 'unauthenticated' }, 401)) // the call, token expired
      .mockResolvedValueOnce(json(session))                           // /auth/session: still signed in
      .mockResolvedValueOnce(json({ ok: 1 }))                         // the retry
    vi.stubGlobal('fetch', fetchMock)
    await expect(request('/interviews')).resolves.toEqual({ ok: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[1][0])).toContain('/auth/session')
    expect(lost).not.toHaveBeenCalled()
    window.removeEventListener('mirror:unauthenticated', lost)
  })

  it('signs out only when the session is really gone', async () => {
    const lost = vi.fn()
    window.addEventListener('mirror:unauthenticated', lost)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(json({ error: 'unauthenticated' }, 401))
      .mockResolvedValueOnce(json({ error: 'unauthenticated', providers: { google: false } }, 401)))
    await expect(request('/interviews')).rejects.toBeInstanceOf(ApiError)
    expect(lost).toHaveBeenCalledTimes(1)
    window.removeEventListener('mirror:unauthenticated', lost)
  })

  it('does not loop on /auth/ calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ error: 'unauthenticated' }, 401))
    vi.stubGlobal('fetch', fetchMock)
    await expect(request('/auth/session')).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
