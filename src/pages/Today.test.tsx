// @vitest-environment jsdom
// Today against the contract: useTodayData() is mocked with TodayData fixtures; the real buildToday() and sections render.
// Needs B (buildToday, insights) and C (Today.tsx, sections, today.css) to pass.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TodayData, TodayProps } from '../features/today/types'
import { NOW, newUser, rich, withStatus } from './todayFixtures'

const hook = vi.hoisted(() => ({ data: null as unknown as TodayData }))
vi.mock('../features/today/useTodayData', () => ({ useTodayData: () => hook.data }))

import Today from './Today'
import todayCss from './today.css?raw'
import landingCss from '../landing.css?raw'

beforeAll(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
})
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW) })
afterEach(() => { cleanup(); vi.useRealTimers() })

const fn = () => vi.fn()
const props = (extra: Partial<TodayProps> = {}): TodayProps => ({
  busy: false, onStart: fn(), onContinue: fn(), onLetGo: fn(), onScreen: fn(), onOpenStories: fn(), onReplay: fn(), onOpenItem: fn(),
  onOpenTarget: fn(), onAddTarget: fn(), onFirstInterview: fn(), onOpenReplays: fn(), onSayItAgain: fn(), ...extra,
})
const show = (d: TodayData, p = props()) => { hook.data = d; return { p, ...render(<Today {...p} />) } }
const filled = (c: HTMLElement) => c.querySelectorAll('.ml-btn:not(.ml-btn--quiet)')
const group = (name: RegExp) => screen.getByText(name).parentElement as HTMLElement

describe('Today: new user', () => {
  it('has one filled primary, a Set up card with three rows, and no "0"', () => {
    const { container } = show(newUser)
    expect(filled(container)).toHaveLength(1)
    const card = screen.getByText("When you're ready, these make Today more useful").closest('section') as HTMLElement
    expect(within(card).getAllByRole('button')).toHaveLength(3)
    for (const t of ["Add a job you're preparing for", 'Save one story you can reuse', 'Try one SQL exercise']) expect(card.textContent).toContain(t)
    expect(container.textContent).not.toMatch(/(^|\D)0(\D|$)/)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome. Start with one question.')
  })
  it('the hero question is the profile first question', () => {
    show(newUser)
    expect(screen.getAllByRole('heading', { level: 2 })[0].textContent).toBe(newUser.input.profile!.firstQuestion)
  })
})

describe('Today: returning user', () => {
  it('has at most four sections, no disabled buttons, one filled primary', () => {
    const { container } = show(rich)
    expect(container.querySelectorAll('section[aria-labelledby]').length).toBeLessThanOrEqual(4)
    expect(container.querySelectorAll('button[disabled],[aria-disabled="true"]')).toHaveLength(0)
    expect(filled(container)).toHaveLength(1)
  })
  it('shows chips by status: covered, partial, gap (gap chips dashed)', () => {
    const { container } = show(rich)
    expect(within(group(/Your résumé backs/)).getByText('SQL joins')).toBeTruthy()
    expect(within(group(/^Partly/)).getByText('Experiment design')).toBeTruthy()
    const gapRow = group(/Not shown yet/)
    expect(within(gapRow).getByText('Window functions').className).toMatch(/gap|dash/)
    expect(container.textContent).not.toMatch(/\b\d+\s*(of|\/)\s*\d+\b/)
  })
  it('hero H2 equals the question passed to onStart when the primary is pressed', () => {
    const { p, container } = show(rich)
    const h2 = screen.getAllByRole('heading', { level: 2 })[0].textContent
    fireEvent.click(filled(container)[0])
    expect(p.onStart).toHaveBeenCalledTimes(1)
    expect((p.onStart as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(h2)
  })
})

describe('Today: states', () => {
  it('shows skeleton lines while sections load', () => {
    show(withStatus(rich, { hero: 'loading', comingUp: 'loading', since: 'loading' }))
    expect(screen.getByText(/Choosing your next step/)).toBeTruthy()
    expect(screen.getByText(/Checking your dates/)).toBeTruthy()
    expect(screen.getByText(/Looking at your week/)).toBeTruthy()
  })
  it('a failed section shows one role=status line while the rest renders', () => {
    const { container } = show(withStatus(rich, { stories: 'error' }))
    const line = screen.getAllByRole('status').find(e => /Couldn.t load your stories just now/.test(e.textContent ?? ''))
    expect(line?.textContent).toContain('The rest of Today still works.')
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
    expect(within(group(/Your résumé backs/)).getByText('SQL joins')).toBeTruthy()
    expect(filled(container)).toHaveLength(1)
  })
})

describe('Today: accessibility on the contract', () => {
  it('one h1, headings never skip a level, every section is labelled by a heading', () => {
    const { container } = show(rich)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const levels = [...container.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1])
    expect(levels[0]).toBe(1)
    levels.forEach((l, i) => { if (i) expect(l - levels[i - 1]).toBeLessThanOrEqual(1) })
    container.querySelectorAll('section').forEach(s => {
      const id = s.getAttribute('aria-labelledby')
      expect(id, 'section needs aria-labelledby').toBeTruthy()
      expect(container.querySelector(`[id="${id}"]`)?.textContent?.trim()).toBeTruthy()
    })
  })
  it('every button and link has an accessible name', () => {
    const { container } = show(rich)
    container.querySelectorAll('button,a').forEach(el => expect((el.textContent ?? '').trim() || el.getAttribute('aria-label')).toBeTruthy())
  })
})

describe('today.css (focus, tap targets, 390 px)', () => {
  const css = todayCss
  const all = css + landingCss
  it('has visible focus styles', () => { expect(all).toMatch(/:focus-visible/) })
  it('buttons and links reach 44 px', () => { expect(css).toMatch(/min-height:\s*44px/) })
  it('has a single-column rule at 600 px and no wide fixed widths or horizontal scroll', () => {
    expect(css).toMatch(/@media[^{]*max-width:\s*600px/)
    expect(css).not.toMatch(/overflow-x:\s*scroll/)
    expect([...css.matchAll(/(?<!max-|min-)width:\s*(\d+)px/g)].filter(m => +m[1] > 390)).toEqual([])
  })
  it('respects reduced motion and dark mode', () => {
    expect(all).toMatch(/prefers-reduced-motion|reduce-motion/)
    expect(all).toMatch(/prefers-color-scheme:\s*dark/)
  })
})
