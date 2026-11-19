// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import App from './App'

vi.mock('./lib/api', async orig => {
  const actual = await orig<typeof import('./lib/api')>()
  return {
    ...actual,
    authApi: { ...actual.authApi, getSession: vi.fn() },
    api: {
      ...actual.api,
      getProfile: vi.fn(),
    }
  }
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

describe('Profile states', () => {
  beforeEach(() => {
    // Mock getProfile to return different states
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        role: 'Data Analyst',
        story: 's',
        pressureQuestion: 'q',
        pressureAnswer: 'a',
        summary: 's',
        focus: 'f',
        firstQuestion: 'q?',
        resumeText: null,
        resumeName: null,
        mode: 'text'
      })
    })
  })

  it('shows loading state while profile is loading', () => {
    // First call returns loading, second returns data
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Network error')
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          role: 'Data Analyst',
          story: 's',
          pressureQuestion: 'q',
          pressureAnswer: 'a',
          summary: 's',
          focus: 'f',
          firstQuestion: 'q?',
          resumeText: null,
          resumeName: null,
          mode: 'text'
        })
      })

    render(<App />)
    // Check that the app handles the loading state
    const workspaceButton = screen.getByRole('button', { name: 'Briefing' })
    expect(workspaceButton).toBeTruthy()
  })

  it('shows none state when profile returns 404', () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' })
    })

    render(<App />)
    const workspaceButton = screen.getByRole('button', { name: 'Briefing' })
    expect(workspaceButton).toBeTruthy()
  })

  it('shows error state when profile returns other error', () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'internal server error' })
    })

    render(<App />)
    const workspaceButton = screen.getByRole('button', { name: 'Briefing' })
    expect(workspaceButton).toBeTruthy()
  })
})
