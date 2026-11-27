// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Product from './Product'
import { PRODUCT_PAGES } from '../copy/product'

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
  HTMLCanvasElement.prototype.getContext = (() => null) as never
})
afterEach(cleanup)

describe('Product page', () => {
  it.each(Object.keys(PRODUCT_PAGES))('renders /product/%s with one h1', slug => {
    const { container } = render(<Product params={{ slug }} />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('h1')?.textContent).toContain(PRODUCT_PAGES[slug].h1[0])
  })

  it('shows Mirror Voice at /product', () => {
    const { container } = render(<Product params={{}} />)
    expect(container.querySelector('h1')?.textContent).toContain('A friendly voice')
  })

  it('shows a friendly not-found inside the site layout for an unknown slug', () => {
    const { container } = render(<Product params={{ slug: 'nope' }} />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByText('We could not find that page')).toBeTruthy()
    expect(container.querySelector('nav')).toBeTruthy()
    expect(container.querySelector('.ms-site-footer')).toBeTruthy()
  })

  it('opens an FAQ answer from the keyboard-reachable button', () => {
    render(<Product params={{ slug: 'voice' }} />)
    const q = screen.getByRole('button', { name: /Can I stop halfway/ })
    expect(q.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(q)
    expect(q.getAttribute('aria-expanded')).toBe('true')
  })

  it('switches use-case tabs', () => {
    render(<Product params={{ slug: 'voice' }} />)
    const tab = screen.getByRole('tab', { name: /Changing careers/ })
    fireEvent.click(tab)
    expect(tab.getAttribute('aria-selected')).toBe('true')
  })
})
