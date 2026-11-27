// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import AddYourWork from './AddYourWork'
import AddYourWorkDetail from './AddYourWorkDetail'
import { SOURCES } from '../copy/add-your-work'

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
})
afterEach(cleanup)

describe('Add your work', () => {
  it('lists only supported sources (no idea cards) with one h1', () => {
    render(<AddYourWork />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(SOURCES.length)
    expect(document.body.textContent).not.toMatch(/\(idea\)|calendar|notes app/i)
  })
  it('filters by chip and by search, and shows the empty text', () => {
    render(<AddYourWork />)
    fireEvent.click(screen.getByRole('button', { name: 'Your target role' }))
    expect(screen.getAllByRole('heading', { level: 4 }).map(h => h.textContent)).toEqual(['Job post'])
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'linkedin' } })
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(1)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzz' } })
    expect(screen.getByText('Nothing here yet.')).toBeTruthy()
  })
  it('detail renders by slug, and an unknown slug is friendly', () => {
    render(<AddYourWorkDetail params={{ slug: 'resume' }} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/résumé/)
    cleanup()
    render(<AddYourWorkDetail params={{ slug: 'nope' }} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/could not find/i)
  })
})
