// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('../features/auth/useSession', () => ({ useSession: () => session.current }))

import App from '../App'

const base = { providers: { google: false }, refresh: () => {}, clear: () => {} }

beforeEach(() => {
  session.current = { ...base, status: 'signedOut' }
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } })))
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('marketing site inside the app', () => {
  it('renders a site page at its path without leaving it', async () => {
    window.history.replaceState(null, '', '/pricing')
    render(<App />)
    expect((await screen.findByRole('heading', { level: 1, name: 'Pricing' })).textContent).toBe('Pricing')
    expect(window.location.pathname).toBe('/pricing')
    expect(document.querySelector('.ms')).not.toBeNull()
  })

  it('moves between site pages with SiteLink (pushState + popstate), and back works', async () => {
    window.history.replaceState(null, '', '/pricing')
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Pricing' })
    fireEvent.click(screen.getAllByRole('link', { name: 'Glossary' }).at(-1)!)
    expect(await screen.findByRole('heading', { level: 1, name: 'Glossary' })).toBeTruthy()
    expect(window.location.pathname).toBe('/glossary')
    window.history.back()
    expect(await screen.findByRole('heading', { level: 1, name: 'Pricing' })).toBeTruthy()
  })

  it('shows the sign-in gate at /login and the new home at /', async () => {
    window.history.replaceState(null, '', '/login')
    const view = render(<App />)
    expect(view.container.querySelector('.ms')).toBeNull()
    expect(view.container.querySelector('.sidebar')).toBeNull()
    view.unmount()
    window.history.replaceState(null, '', '/')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: /Practice your story out loud/ })).toBeTruthy()
    expect(document.querySelector('.ms')).not.toBeNull()
  })
})
