// @vitest-environment jsdom
// Landing against the contract (docs/LANDING.md). Needs A (Landing.tsx, SampleTry, home.css) to pass.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import Landing from './Landing'
import css from './landing/home.css?raw'
import { CLAIMS, FAQ, FEATURES, NOT_SCORED, SAMPLE, TRUST } from './landing/content'

const fetchSpy = vi.fn()
beforeAll(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
  class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } }
  vi.stubGlobal('IntersectionObserver', IO)
  Element.prototype.scrollIntoView = vi.fn()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})
beforeEach(() => { fetchSpy.mockReset(); vi.stubGlobal('fetch', fetchSpy) })
afterEach(() => { cleanup(); expect(fetchSpy).not.toHaveBeenCalled() })

const setup = () => { const onTry = vi.fn(); const r = render(<Landing onTry={onTry} />); return { onTry, ...r } }
const hero = (c: HTMLElement) => (c.querySelector('h1') as HTMLElement).closest('section') as HTMLElement
const access = () => screen.getAllByRole('button', { name: /request access/i }).concat(screen.queryAllByRole('link', { name: /request access/i }))
// Prose that legitimately holds a flagged word: the NOT_SCORED sentence and the FAQ price answer.
const prose = (c: HTMLElement) => (c.textContent ?? '').replace(NOT_SCORED.body, '').replace('There is no price yet. The beta is invite-only.', '')

describe('Landing: buttons', () => {
  it('hero has exactly one filled primary, "Try a sample question", which scrolls and does not call onTry', () => {
    const { container, onTry } = setup()
    const h = hero(container)
    expect(h.querySelectorAll('.ml-btn:not(.ml-btn--quiet):not(.ml-btn--sm)')).toHaveLength(1)
    fireEvent.click(within(h).getByRole('button', { name: 'Try a sample question' }))
    expect(onTry).not.toHaveBeenCalled()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(document.getElementById('sample')).toBeTruthy()
  })
  it('hero secondary and every other "Request access" call onTry', () => {
    const { container, onTry } = setup()
    expect(within(hero(container)).getAllByRole('button', { name: /request access/i })).toHaveLength(1)
    const all = access()
    expect(all.length).toBeGreaterThanOrEqual(3)
    all.forEach((b, i) => { fireEvent.click(b); expect(onTry).toHaveBeenCalledTimes(i + 1) })
  })
})

describe('Landing: sample', () => {
  it('is labelled as a sample and offers three starting answers', () => {
    setup()
    const s = document.getElementById('sample') as HTMLElement
    expect(within(s).getByText(SAMPLE.tag)).toBeTruthy()
    expect(within(s).getByText(SAMPLE.label)).toBeTruthy()
    expect(within(s).getAllByRole('button').filter(b => SAMPLE.answers.some(a => (b.textContent ?? '').includes(a.first)))).toHaveLength(3)
  })
  for (const a of SAMPLE.answers) {
    it(`"${a.id}": pick, say it again, see the better sentence and the changes (no network)`, async () => {
      setup()
      const s = document.getElementById('sample') as HTMLElement
      fireEvent.click(within(s).getByText(a.first, { exact: false }))
      fireEvent.click(within(s).getByRole('button', { name: SAMPLE.againButton }))
      // The sentence re-forms word by word on a timer, so wait for it.
      await waitFor(() => expect(s.textContent).toContain(a.again), { timeout: 10_000 })
      for (const c of a.changed) expect(s.textContent).toContain(c)
      expect(fetchSpy).not.toHaveBeenCalled()
    }, 20_000)
  }
})

describe('Landing: wording', () => {
  it('no percentages, counts, streaks or banned words', () => {
    const { container } = setup()
    const t = prose(container)
    expect(t).not.toMatch(/%|\bpercent/i)
    expect(t).not.toMatch(/\b\d+\s*(of|\/)\s*\d+\b/)
    expect(t).not.toMatch(/streak|in a row/i)
    expect(t).not.toMatch(/\b(agentic|evidence|reflect\w*|evaluat\w*)\b/i)
  })
  it('no competitor, testimonial, logo, "joined by" or pricing', () => {
    const { container } = setup()
    expect(prose(container)).not.toMatch(/hiringant|hiring ant|pramp|interviewing\.io|final round|big interview|testimonial|logos?\b|joined by|trusted by|pricing|\$\s?\d|per month|\/mo\b|free tier/i)
  })
  it('Private section lists exactly the five CLAIMS; other privacy sentences are claims or FAQ restatements', () => {
    const { container } = setup()
    const p = document.getElementById('private') as HTMLElement
    let rest = p.textContent ?? ''
    const items = [...p.querySelectorAll('li')].map(li => li.textContent)
    expect(items).toEqual([...CLAIMS])
    expect(container.querySelectorAll('li').length).toBeGreaterThan(0)
    for (const c of CLAIMS) { expect(rest).toContain(c); rest = rest.replace(c, '') }
    rest = rest.replace(NOT_SCORED.body, '').replace(p.querySelector('h2')?.textContent ?? '', '')
    expect(rest).not.toMatch(/audio|delet|employer|recruiter|shar(e|ing)/i)
    const allowed = [...CLAIMS, ...FAQ.flat(), ...TRUST]
    const sentences = [...container.querySelectorAll('p,li,summary,h1,h2,h3,dt,dd,button')]
      .flatMap(e => (e.textContent ?? '').split(/(?<=[.!?])\s+/))
      .map(s => s.trim()).filter(Boolean)
    for (const s of sentences.filter(s => /\b(audio|delet\w*|employers?|recruiters?|shar(e|ing))\b/i.test(s))) {
      expect(allowed.some(a => a.includes(s)), `unlisted privacy sentence: ${s}`).toBe(true)
    }
  })
})

describe('Landing: structure', () => {
  it('one h1 and no skipped heading level', () => {
    const { container } = setup()
    const hs = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => Number(h.tagName[1]))
    expect(hs.filter(n => n === 1)).toHaveLength(1)
    expect(hs[0]).toBe(1)
    hs.forEach((n, i) => { if (i) expect(n - hs[i - 1]).toBeLessThanOrEqual(1) })
  })
  it('every section is labelled by a non-empty heading; sample, how and private exist', () => {
    const { container } = setup()
    for (const s of container.querySelectorAll('section')) {
      const id = s.getAttribute('aria-labelledby')
      expect(id, 'section without aria-labelledby').toBeTruthy()
      expect((document.getElementById(id!)?.textContent ?? '').trim()).not.toBe('')
    }
    for (const id of ['features', 'how', 'sample', 'private', 'faq']) expect(document.getElementById(id)).toBeTruthy()
  })
})

describe('Landing: features and images', () => {
  it('shows all six features with their bullets and every img has alt, size and lazy loading below the hero', () => {
    const { container } = setup()
    const f = document.getElementById('features') as HTMLElement
    expect(FEATURES.items).toHaveLength(6)
    for (const it of FEATURES.items) {
      expect(within(f).getByText(it.title)).toBeTruthy()
      for (const b of it.bullets) expect(f.textContent).toContain(b)
    }
    const imgs = [...container.querySelectorAll('img')]
    expect(imgs.length).toBeGreaterThanOrEqual(11)
    for (const i of imgs) {
      expect((i.getAttribute('alt') ?? '').trim()).not.toBe('')
      expect(i.getAttribute('width') && i.getAttribute('height')).toBeTruthy()
    }
    for (const i of f.querySelectorAll('img')) expect(i.getAttribute('loading')).toBe('lazy')
  })
})

describe('home.css', () => {
  it('has focus, tap targets, a 600px breakpoint, reduced motion and dark scheme', () => {
    expect(css).toMatch(/:focus-visible/)
    expect(css).toMatch(/min-height:\s*44px/)
    expect(css).toMatch(/@media\s*\(max-width:\s*(6|7)\d\dpx\)/) // the phone layout starts at 760 px and covers 390 px
    expect(css).toMatch(/prefers-reduced-motion/)
    expect(css).toMatch(/prefers-color-scheme:\s*dark/)
    expect(css).not.toMatch(/serif|--paper|radial-gradient\(rgb/)
  })
  it('is scoped under .mh and loads nothing external', () => {
    const body = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(body).not.toMatch(/@import|url\(\s*['"]?https?:|url\(\s*['"]?\/\//)
    const bad = [...body.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim())
      .filter(p => p && !p.startsWith('@') && !/^(from|to|\d+%)(\s*,\s*(from|to|\d+%))*$/.test(p))
      .flatMap(p => p.split(',').map(x => x.trim()))
      .filter(sel => !/^\.mh([\s.:>[+~-]|$)/.test(sel)) // .mh itself or a .mh-… class: nothing global
    expect(bad).toEqual([])
  })
})
