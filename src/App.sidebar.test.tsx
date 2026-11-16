// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('./features/auth/useSession', () => ({ useSession: () => session.current }))

import App from './App'

const base = { providers: { google: false }, refresh: () => {}, clear: () => {} }

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
  // Every api call answers 404 JSON: the app shows its empty states, which is all the sidebar needs.
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json' } })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('sidebar account', () => {
  it('never shows "Alex Morgan" for a signed-in session; shows the email instead', async () => {
    session.current = { ...base, status: 'signedIn', user: { id: 'u1', email: 'sam@example.com' } }
    const { container } = render(<App />)
    await waitFor(() => expect(container.querySelector('.sidebar')).not.toBeNull())
    expect(await screen.findByText('sam@example.com')).toBeTruthy()
    expect(screen.getByText('Your account and profile')).toBeTruthy()
    expect(container.textContent).not.toMatch(/Alex Morgan/)
  })
  it('says "Demo workspace" in demo mode', async () => {
    session.current = { ...base, status: 'demo' }
    const { container } = render(<App />)
    expect(await screen.findByText('Demo workspace')).toBeTruthy()
    expect(container.textContent).not.toMatch(/Alex Morgan/)
  })
})
