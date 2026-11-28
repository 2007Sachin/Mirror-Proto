// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Pricing from './Pricing'

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('Pricing page', () => {
  it('renders one h1, three sample plans and a Sample label', () => {
    const { container } = render(<Pricing />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelectorAll('.ms-plan')).toHaveLength(3)
    expect(screen.getAllByText('Sample').length).toBeGreaterThan(0)
    expect(screen.getByText('$12')).toBeTruthy()
  })

  it('swaps to yearly prices from the keyboard-operable toggle', () => {
    vi.useFakeTimers()
    render(<Pricing />)
    const t = screen.getByRole('button', { name: 'Bill yearly' })
    expect(t.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(t)
    expect(t.getAttribute('aria-pressed')).toBe('true')
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByText('$9')).toBeTruthy()
  })

  it('opens an FAQ answer', () => {
    render(<Pricing />)
    const q = screen.getByRole('button', { name: /Is there a free plan/ })
    fireEvent.click(q)
    expect(q.getAttribute('aria-expanded')).toBe('true')
  })
})
