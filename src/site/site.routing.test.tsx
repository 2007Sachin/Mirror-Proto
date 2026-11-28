// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { matchSite, SITE_ROUTES } from './router'
import { SiteProvider } from './SiteContext'
import Nav from './Nav'
import { NAV_GROUPS, NAV_LINKS, FOOTER } from './copy/shared'

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
})
afterEach(() => { cleanup(); document.body.style.overflow = '' })

describe('matchSite', () => {
  const cases: [string, string, Record<string, string>][] = [
    ['/', 'home', {}],
    ['/product', 'product', {}],
    ['/product/voice', 'product', { slug: 'voice' }],
    ['/for/students', 'solution', { persona: 'students' }],
    ['/pricing', 'pricing', {}],
    ['/journeys', 'journeys', {}],
    ['/journeys/first-job', 'journey', { slug: 'first-job' }],
    ['/add-your-work', 'add-your-work', {}],
    ['/add-your-work/github', 'add-your-work-detail', { slug: 'github' }],
    ['/notes', 'notes', {}],
    ['/notes/a%20post', 'note', { slug: 'a post' }],
    ['/why-mirror', 'why-mirror', {}],
    ['/about', 'about', {}],
    ['/careers', 'careers', {}],
    ['/legal/privacy', 'legal', { doc: 'privacy' }],
    ['/get-started', 'get-started', {}],
    ['/glossary', 'glossary', {}],
    ['/resources', 'resources', {}],
    ['/kind-words', 'kind-words', {}],
    ['/login', 'login', {}],
    ['/signup', 'signup', {}],
    ['/pricing/', 'pricing', {}],
  ]
  it.each(cases)('%s -> %s', (path, id, params) => {
    const m = matchSite(path)
    expect(m?.id).toBe(id)
    expect(m?.params).toEqual(params)
    expect(m?.Component === null).toBe(id === 'login' || id === 'signup')
  })

  it('returns null for unknown and too-deep paths', () => {
    for (const p of ['/nope', '/for', '/for/a/b', '/legal', '/pricing/x', '/journeys/a/b', '/product/a/b']) expect(matchSite(p), p).toBeNull()
  })

  it('never shadows the app routes', () => {
    for (const p of ['/workspace', '/targets', '/practice', '/reports', '/stories', '/stories/x', '/prep', '/profile', '/settings', '/privacy', '/firstInterview', '/interview', '/report', '/screen']) {
      expect(matchSite(p), p).toBeNull()
    }
  })

  it('has a lazy page for every route except login and signup', () => {
    for (const r of SITE_ROUTES) expect(r.Component === null, r.id).toBe(r.id === 'login' || r.id === 'signup')
  })
})

describe('Nav', () => {
  const renderNav = (onTry: () => void = () => {}) => render(<SiteProvider value={{ onTry }}><Nav /></SiteProvider>)

  it('links to every marketing route (nav and footer together), with real hrefs', () => {
    const { container } = renderNav()
    const hrefs = new Set([...container.querySelectorAll('a')].map(a => a.getAttribute('href')))
    const wanted = [...NAV_GROUPS.flatMap(g => g.items.map(i => i.href)), ...NAV_LINKS.map(l => l.href)]
    for (const h of wanted) expect(hrefs.has(h), h).toBe(true)
    const footer = FOOTER.columns.flatMap(c => c.links.flatMap(l => ('href' in l ? [l.href] : [])))
    const all = [...wanted, ...footer]
    for (const id of ['product', 'solution', 'pricing', 'journeys', 'add-your-work', 'notes', 'why-mirror', 'about', 'careers', 'legal', 'get-started', 'glossary', 'resources', 'kind-words']) {
      expect(all.some(h => matchSite(h)?.id === id), id).toBe(true)
    }
  })

  it('is keyboard reachable: no negative tabindex, every control is a real link or button', () => {
    const { container } = renderNav()
    const controls = [...container.querySelectorAll<HTMLElement>('a, button')]
    expect(controls.length).toBeGreaterThan(10)
    for (const c of controls) {
      expect(c.getAttribute('tabindex'), c.outerHTML.slice(0, 60)).toBeNull()
      if (c.tagName === 'A') expect(c.getAttribute('href')).toMatch(/^\//)
      if (c.tagName === 'BUTTON') expect(c.getAttribute('type')).toBe('button')
    }
  })

  it('opens a dropdown from its button and Escape closes it and returns focus', () => {
    renderNav()
    const btn = screen.getByRole('button', { name: /^Product/ })
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(btn.getAttribute('aria-controls')!)).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(btn)
  })

  it('opens the mobile menu, locks scroll, and Escape closes it', () => {
    renderNav()
    const burger = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(burger)
    expect(burger.getAttribute('aria-expanded')).toBe('true')
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(burger.getAttribute('aria-expanded')).toBe('false')
    expect(document.body.style.overflow).toBe('')
  })

  it('Sign in and Request access call onTry', () => {
    const onTry = vi.fn()
    renderNav(onTry)
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Request access' })[0])
    expect(onTry).toHaveBeenCalledTimes(2)
  })
})
