// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('./features/auth/useSession', () => ({ useSession: () => session.current }))

import App from './App'

const base = { providers: { google: false }, refresh: () => {}, clear: () => {} }
const signedIn = { ...base, status: 'signedIn', user: { id: 'u1', email: 'sam@example.com' } }
const signedOut = { ...base, status: 'signedOut' }
const profile = { role: 'Data Analyst', story: 's', pressureQuestion: 'q', pressureAnswer: 'a', summary: 's', focus: 'f', firstQuestion: 'q?', resumeText: null, resumeName: null, mode: 'text' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

let profileReply: () => Promise<Response>
const calls = { profile: 0 }

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  calls.profile = 0
  profileReply = async () => json(profile)
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).endsWith('/profile')) { calls.profile++; return profileReply() }
    return json({ error: 'not found' }, 404)
  }))
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const active = (c: HTMLElement) => c.querySelector('.sidebar nav button.active')?.textContent

describe('URL routing', () => {
  it('opens the page named in the path', async () => {
    session.current = signedIn
    window.history.replaceState(null, '', '/targets')
    const { container } = render(<App />)
    await waitFor(() => expect(active(container)).toBe('Targets'))
    expect(window.location.pathname).toBe('/targets')
  })

  it('writes the path when a page is opened, and back/forward restore the pages', async () => {
    session.current = signedIn
    window.history.replaceState(null, '', '/workspace')
    const { container } = render(<App />)
    await waitFor(() => expect(active(container)).toBe('Briefing'))
    fireEvent.click(screen.getByRole('button', { name: 'Practice' }))
    await waitFor(() => expect(active(container)).toBe('Practice'))
    expect(window.location.pathname).toBe('/practice')
    fireEvent.click(screen.getByRole('button', { name: 'Stories' }))
    await waitFor(() => expect(active(container)).toBe('Stories'))
    expect(window.location.pathname).toBe('/stories')
    act(() => { window.history.back() })
    await waitFor(() => expect(active(container)).toBe('Practice'))
    act(() => { window.history.back() })
    await waitFor(() => expect(active(container)).toBe('Briefing'))
    act(() => { window.history.forward() })
    await waitFor(() => expect(active(container)).toBe('Practice'))
  })

  it('sends a signed-in user at / to the dashboard, never the landing', async () => {
    session.current = signedIn
    const { container } = render(<App />)
    await waitFor(() => expect(container.querySelector('.sidebar')).not.toBeNull())
    expect(window.location.pathname).toBe('/workspace')
    expect(screen.queryAllByText('Request access')).toHaveLength(0)
  })

  it('shows the landing at / to a signed-out visitor', async () => {
    session.current = signedOut
    render(<App />)
    expect((await screen.findAllByText('Request access')).length).toBeGreaterThan(0)
    expect(window.location.pathname).toBe('/')
  })

  it('returns to the same URL after sign-in', async () => {
    session.current = signedOut
    window.history.replaceState(null, '', '/targets')
    const view = render(<App />)
    expect(view.container.querySelector('.sidebar')).toBeNull() // signed out: the sign-in gate, not the page
    expect(window.location.pathname).toBe('/targets')
    session.current = signedIn
    view.rerender(<App />)
    await waitFor(() => expect(active(view.container)).toBe('Targets'))
    expect(window.location.pathname).toBe('/targets')
  })
})

describe('profile states', () => {
  it('shows a skeleton, not onboarding, while a slow getProfile is pending, then the dashboard', async () => {
    session.current = signedIn
    let release!: () => void
    profileReply = () => new Promise<Response>(resolve => { release = () => resolve(json(profile)) })
    window.history.replaceState(null, '', '/workspace')
    const { container } = render(<App />)
    await waitFor(() => expect(container.querySelector('.workspace-skeleton')).not.toBeNull())
    expect(screen.getByRole('status', { name: 'Loading your workspace' })).toBeTruthy()
    expect(window.location.pathname).toBe('/workspace')
    expect(screen.queryByRole('alert')).toBeNull()
    await act(async () => { release() })
    await waitFor(() => expect(container.querySelector('.workspace-skeleton')).toBeNull())
    expect(window.location.pathname).toBe('/workspace')
  })

  it('shows onboarding only when the profile is 404', async () => {
    session.current = signedIn
    profileReply = async () => json({ error: 'not_found' }, 404)
    window.history.replaceState(null, '', '/workspace')
    render(<App />)
    await waitFor(() => expect(window.location.pathname).toBe('/firstInterview'))
  })

  it.each([500, 503, 403])('a %i shows retry, never onboarding', async status => {
    session.current = signedIn
    profileReply = async () => json({ error: 'boom' }, status)
    window.history.replaceState(null, '', '/workspace')
    render(<App />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(window.location.pathname).toBe('/workspace')
  })

  it('a network failure shows retry, and retry recovers', async () => {
    session.current = signedIn
    profileReply = async () => { throw new TypeError('network down') }
    window.history.replaceState(null, '', '/workspace')
    const { container } = render(<App />)
    const retry = await screen.findByRole('button', { name: 'Try again' })
    profileReply = async () => json(profile)
    fireEvent.click(retry)
    await waitFor(() => expect(calls.profile).toBe(2))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(container.querySelector('.workspace-skeleton')).toBeNull()
  })
})
