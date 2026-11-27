// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Solution from './Solution'
import { PERSONAS } from '../copy/solution'

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
  HTMLCanvasElement.prototype.getContext = (() => null) as never
})
afterEach(cleanup)

describe('Solution page', () => {
  it.each(Object.keys(PERSONAS))('renders /for/%s with one h1', persona => {
    const { container } = render(<Solution params={{ persona }} />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('h1')?.textContent).toContain(PERSONAS[persona].h1[0])
  })

  it('shows a friendly not-found inside the site layout for an unknown persona', () => {
    const { container } = render(<Solution params={{ persona: 'nobody' }} />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByText('We could not find that page')).toBeTruthy()
    expect(container.querySelector('.ms-site-footer')).toBeTruthy()
  })

  it('opens an FAQ answer', () => {
    render(<Solution params={{ persona: 'students' }} />)
    const q = screen.getByRole('button', { name: /Do I need a résumé/ })
    fireEvent.click(q)
    expect(q.getAttribute('aria-expanded')).toBe('true')
  })
})
