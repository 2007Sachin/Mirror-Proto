// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Home from './Home'
import * as copy from '../copy/home'

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: true, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
})
afterEach(cleanup)

describe('Home', () => {
  it('renders one h1 and never skips a heading level', () => {
    const { container } = render(<Home />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    const levels = [...container.querySelectorAll('main h1,main h2,main h3,main h4')].map(h => Number(h.tagName[1]))
    expect(levels[0]).toBe(1)
    levels.forEach((l, i) => { if (i) expect(l - levels[i - 1], `heading ${i}`).toBeLessThanOrEqual(1) })
  })

  it('labels every placeholder as a sample', () => {
    const { container } = render(<Home />)
    expect(container.textContent).toContain(copy.SAMPLE_LABEL)
  })

  it('has tabs that move with the arrow keys', () => {
    render(<Home />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(5)
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    tabs[0].focus()
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
    expect(tabs[1].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(tabs[1], { key: 'End' })
    expect(tabs[4].getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(tabs[4])
  })

  it('opens an FAQ answer on click', () => {
    render(<Home />)
    const q = screen.getByRole('button', { name: /What is Mirror/ })
    expect(q.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(q)
    expect(q.getAttribute('aria-expanded')).toBe('true')
  })
})
