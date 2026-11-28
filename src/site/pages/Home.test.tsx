// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Home from './Home'
import * as copy from '../copy/home'
import { PREP_ROLES } from '../../prep/roles'

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

  it('shows the real app: the interview loops, the evaluation and the interviewer, not invented features', () => {
    const { container } = render(<Home />)
    for (const r of PREP_ROLES.slice(0, 3)) expect(screen.getByRole('heading', { name: r.title })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Your evaluation' })).toBeTruthy()
    expect(container.textContent).toContain('Just starting')
    expect(container.textContent).toContain("I'm MIRROR, and I'll be interviewing you")
    expect(container.textContent).not.toMatch(/Mirror Voice|Reflection Guide|Deeper Questions|Experience library|Found your footing/)
  })

  it('quotes in the sample evaluation are exact pieces of the sample answers, as the real check requires', () => {
    const answers = copy.ROOM.script.filter(s => s.who === 'you').map(s => s.text).join('\n')
    for (const e of copy.SAMPLE_EVALUATION) expect(answers).toContain(e.quote)
  })

  it('opens an FAQ answer on click', () => {
    render(<Home />)
    const q = screen.getByRole('button', { name: /What is MIRROR/ })
    expect(q.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(q)
    expect(q.getAttribute('aria-expanded')).toBe('true')
  })
})
