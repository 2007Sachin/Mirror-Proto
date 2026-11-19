// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import App from './App'

vi.mock('./lib/api', async orig => {
  const actual = await orig<typeof import('./lib/api')>()
  return { ...actual, authApi: { ...actual.authApi, getSession: vi.fn() } }
})

const originalFetch = global.fetch
const fetchMock = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  global.fetch = fetchMock
  ;(window as HTMLWindowElement).history.pushState = vi.fn()
  ;(window as HTMLWindowElement).history.replaceState = vi.fn()
  if (!('localStorage' in window)) {
    ;(window as HTMLWindowElement).localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
    }
  }
})

afterEach(() => {
  cleanup()
  global.fetch = originalFetch
  ;(window as HTMLWindowElement).history.pushState = undefined
  ;(window as HTMLWindowElement).history.replaceState = undefined
  if ((window as HTMLWindowElement).localStorage) {
    ;(window as HTMLWindowElement).localStorage.getItem.mockReset()
    ;(window as HTMLWindowElement).localStorage.setItem.mockReset()
    ;(window as HTMLWindowElement).localStorage.removeItem.mockReset()
  }
})

describe('URL routing and session handling', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: 'u1', email: 'test@example.com' },
        session: { access_token: 'token123' }
      })
    })
  })

  it('signed-in user at / goes to the dashboard', () => {
    render(<App />)
    const workspaceButton = screen.getByRole('button', { name: 'Briefing' })
    expect(workspaceButton).toBeTruthy()
  })

  it('silent session refresh on 401', () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'unauthenticated' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 'u1', email: 'test@example.com' },
          session: { access_token: 'newtoken123' }
        })
      })

    render(<App />)
    const signOutButton = screen.getByRole('button', { name: 'Sign out' })
    expect(signOutButton).toBeTruthy()
  })

  it('returns to the same URL after sign-in', () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: 'u1', email: 'test@example.com' },
        session: { access_token: 'token123' }
      })
    })

    const urlEvent = new Event('popstate')
    ;(window as HTMLWindowElement).history.pushState(urlEvent.state, '', '/interview')
    window.dispatchEvent(urlEvent)

    render(<App />)
    const interviewButton = screen.getByRole('button', { name: 'Interview' })
    expect(interviewButton).toBeTruthy()
  })
})
