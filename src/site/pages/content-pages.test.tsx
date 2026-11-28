// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Notes from './Notes'
import NotePost from './NotePost'
import Glossary from './Glossary'
import Resources from './Resources'
import Legal from './Legal'
import { NOTES, FEATURED } from '../copy/notes'
import { TERMS } from '../copy/glossary'
import { RESOURCES } from '../copy/resources'
import { LEGAL_DOCS } from '../copy/legal'

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
})
afterEach(cleanup)
const h1s = () => screen.getAllByRole('heading', { level: 1 })

describe('Notes', () => {
  it('renders the index with one h1, filters by chip and searches', () => {
    render(<Notes />)
    expect(h1s()).toHaveLength(1)
    const cards = () => screen.getAllByRole('heading', { level: 3 }).length
    expect(cards()).toBe(NOTES.length - 1)
    fireEvent.click(screen.getByRole('button', { name: 'Reflection' }))
    expect(cards()).toBe(NOTES.filter(n => n.tag === 'reflection').length)
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzz' } })
    expect(screen.getByText('No notes match yet.')).toBeTruthy()
  })
  it('post builds its TOC from the headings and keeps the article column at 720px', () => {
    render(<NotePost params={{ slug: FEATURED.slug }} />)
    expect(h1s()).toHaveLength(1)
    const toc = screen.getByRole('navigation', { name: /on this page/i })
    for (const s of FEATURED.sections) expect(toc.textContent).toContain(s.h)
    expect(document.querySelector('#post-body')?.className).toContain('ms-nt-prose')
  })
  it('unknown slug is friendly', () => {
    render(<NotePost params={{ slug: 'nope' }} />)
    expect(h1s()[0].textContent).toMatch(/could not find/i)
  })
})

describe('Glossary', () => {
  it('groups A to Z with jump links and searches client side', () => {
    render(<Glossary />)
    expect(h1s()).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(TERMS.length)
    expect(screen.getByRole('link', { name: 'S' }).getAttribute('href')).toBe('#g-S')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'star shape' } })
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['STAR shape'])
    expect(screen.queryByRole('link', { name: 'A' })).toBeNull()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzzz' } })
    expect(screen.getByText('No terms match yet.')).toBeTruthy()
  })
})

describe('Resources', () => {
  it('lists sample resources and filters by type', () => {
    render(<Resources />)
    expect(h1s()).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(RESOURCES.length)
    fireEvent.click(screen.getByRole('button', { name: 'Worksheets' }))
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(RESOURCES.filter(r => r.kind === 'worksheet').length)
  })
})

describe('Legal', () => {
  it.each(Object.keys(LEGAL_DOCS))('%s shows the placeholder banner and a TOC', doc => {
    render(<Legal params={{ doc }} />)
    expect(h1s()).toHaveLength(1)
    expect(screen.getByRole('note').textContent).toMatch(/Placeholder\s.\sreal text from counsel before launch/)
    expect(screen.getByRole('navigation', { name: /sections/i }).textContent).toContain(LEGAL_DOCS[doc].sections[0].h)
  })
  it('unknown doc is friendly', () => {
    render(<Legal params={{ doc: 'toString' }} />)
    expect(h1s()[0].textContent).toMatch(/could not find/i)
  })
})
