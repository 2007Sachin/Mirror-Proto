// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import About from './About'
import Careers from './Careers'

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
})
afterEach(cleanup)

describe('About page', () => {
  it('renders one h1, the four values and a Sample label', () => {
    const { container } = render(<About />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelectorAll('.ms-value')).toHaveLength(4)
    expect(screen.getAllByText(/Sample/).length).toBeGreaterThan(0)
  })
})

describe('Careers page', () => {
  it('renders one h1 and four sample roles labelled Sample', () => {
    const { container } = render(<Careers />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelectorAll('.ms-job')).toHaveLength(4)
    expect(screen.getAllByText('Sample').length).toBeGreaterThan(0)
  })

  it('filters roles with the chips', () => {
    const { container } = render(<Careers />)
    fireEvent.click(screen.getByRole('button', { name: 'Design' }))
    expect(container.querySelectorAll('.ms-job')).toHaveLength(1)
    expect(screen.getByText('Product designer')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(container.querySelectorAll('.ms-job')).toHaveLength(4)
  })
})
