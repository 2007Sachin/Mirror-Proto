// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import WhyMirror from './WhyMirror'
import { WHY } from '../copy/why-mirror'

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
})
afterEach(cleanup)

describe('WhyMirror page', () => {
  it('renders one h1 and the Mirror vs practicing alone table', () => {
    const { container } = render(<WhyMirror />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('table', { name: /practicing alone/i })).toBeTruthy()
    expect(container.querySelectorAll('.ms-vs__row')).toHaveLength(WHY.rows.length + 1)
  })

  it('names no other product', () => {
    const { container } = render(<WhyMirror />)
    expect(container.textContent).not.toMatch(/amplemarket|apollo|duo|hubspot|salesloft/i)
  })

  it('opens an FAQ answer', () => {
    render(<WhyMirror />)
    const q = screen.getByRole('button', { name: /Can I use both/ })
    fireEvent.click(q)
    expect(q.getAttribute('aria-expanded')).toBe('true')
  })
})
