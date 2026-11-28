// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Journeys from './Journeys'
import JourneyDetail from './JourneyDetail'
import KindWords from './KindWords'
import { STORIES } from '../copy/journeys'
import { QUOTES } from '../copy/kind-words'

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } root = null; rootMargin = ''; thresholds = [] } as unknown as typeof IntersectionObserver
})
afterEach(cleanup)

describe('Journeys', () => {
  it('lists every story as a labelled sample with one h1', () => {
    render(<Journeys />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    for (const s of STORIES) expect(screen.getByRole('heading', { name: s.title })).toBeTruthy()
    expect(screen.getAllByText('Sample').length).toBeGreaterThanOrEqual(STORIES.length)
  })
  it('detail renders the story with a TOC built from its headings', () => {
    const s = STORIES[0]
    render(<JourneyDetail params={{ slug: s.slug }} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const toc = screen.getByRole('navigation', { name: /on this page/i })
    for (const sec of s.sections) expect(toc.textContent).toContain(sec.h)
  })
  it('unknown slug shows a friendly not-found inside the layout', () => {
    render(<JourneyDetail params={{ slug: 'nope' }} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/could not find/i)
    expect(screen.getByRole('navigation', { name: /main|primary/i }) ?? true).toBeTruthy()
  })
})

describe('KindWords', () => {
  it('renders every sample quote in the column wall with one h1', () => {
    const { container } = render(<KindWords />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(container.querySelectorAll('.ms-wcard')).toHaveLength(QUOTES.length)
    expect(screen.getAllByText('Sample')).toHaveLength(QUOTES.length)
  })
})
