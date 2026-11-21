// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('./features/auth/useSession', () => ({ useSession: () => session.current }))

import App from './App'

const base = { providers: { google: false }, refresh: () => {}, clear: () => {} }

beforeEach(() => {
  window.history.replaceState(null, '', '/workspace') // open the dashboard directly: / is the website
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
  // Every api call answers 404 JSON: the app shows its empty states, which is all the sidebar needs.
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
    // A saved profile sends the visitor from the landing straight to Today (the sidebar's home).
    if (String(url).endsWith('/profile')) return json({ role: 'Data Analyst', story: 's', pressureQuestion: 'q', pressureAnswer: 'a', summary: 's', focus: 'f', firstQuestion: 'q?', resumeText: null, resumeName: null, mode: 'text' })
    return json({ error: 'not found' }, 404)
  }))
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('sidebar account', () => {
  it('never shows "Alex Morgan" for a signed-in session; shows the email instead', async () => {
    session.current = { ...base, status: 'signedIn', user: { id: 'u1', email: 'sam@example.com' } }
    const { container } = render(<App />)
    await waitFor(() => expect(container.querySelector('.sidebar')).not.toBeNull())
    expect(await screen.findByText('sam@example.com')).toBeTruthy()
    expect(screen.getByText('Account')).toBeTruthy()
    expect(container.textContent).not.toMatch(/Alex Morgan/)
  })
  it('says "Demo account" in demo mode', async () => {
    session.current = { ...base, status: 'demo' }
    window.history.replaceState(null, '', '/workspace')
    const { container } = render(<App />)
    expect(await screen.findByText('Demo account')).toBeTruthy()
    expect(container.textContent).not.toMatch(/Alex Morgan/)
  })
})
