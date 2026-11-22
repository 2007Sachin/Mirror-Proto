// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InterviewPrep from './InterviewPrep'
import { PREP_ROLES } from '../prep/roles'

vi.mock('../lib/api', async orig => ({
  ...(await orig<typeof import('../lib/api')>()),
  api: { listTargets: async () => [{ id: 't1', company: 'Northwind', role: 'Data Analyst', interviewDate: null, status: 'ready', nextStep: null, nextStepSource: 'fallback', createdAt: '2026-11-01T00:00:00Z', skills: [] }] },
}))

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('Interview Prep room', () => {
  it('shows a card for each role, then a card for each round of that role', () => {
    render(<InterviewPrep onStart={vi.fn()} />)
    for (const t of ['Product Manager', 'Data Analytics', 'Financial Analyst', 'Digital Marketing']) expect(screen.getByRole('button', { name: new RegExp(t) })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Product Manager/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Product Manager' })).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5)
    expect(screen.getAllByRole('button', { name: 'Start interview' })).toHaveLength(5)
  })

  it('starts a live interview for the round with a question from that round, by voice', () => {
    const onStart = vi.fn()
    render(<InterviewPrep onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: /Data Analytics/ }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Start interview' })[1])
    const round = PREP_ROLES[1].rounds[1]
    expect(onStart).toHaveBeenCalledWith(`Data Analytics · ${round.name}`, round.questions[0], true)
  })

  it('"Type instead" starts the same interview without voice, and the next start asks a new question', () => {
    const onStart = vi.fn()
    render(<InterviewPrep onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: /Financial Analyst/ }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Type instead' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Start interview' })[0])
    const round = PREP_ROLES[2].rounds[0]
    expect(onStart).toHaveBeenNthCalledWith(1, `Financial Analyst · ${round.name}`, round.questions[0], false)
    expect(onStart).toHaveBeenNthCalledWith(2, `Financial Analyst · ${round.name}`, round.questions[1], true)
  })

  it('offers your own job next to the ready-made roles: bring one, or open a saved one', async () => {
    const onOpenJob = vi.fn()
    render(<InterviewPrep onStart={vi.fn()} onOpenJob={onOpenJob} onPractise={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: /Northwind/ }))
    expect(onOpenJob).toHaveBeenCalledWith('t1')
    fireEvent.click(screen.getByRole('button', { name: /Bring your own job/ }))
    expect(onOpenJob).toHaveBeenLastCalledWith('new')
  })

  it('bringing a job is its own page: the form, with no ready-made roles on it', () => {
    const onOpenJob = vi.fn()
    render(<InterviewPrep onStart={vi.fn()} jobId="new" onOpenJob={onOpenJob} onPractise={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Bring your own job' })).toBeTruthy()
    expect(screen.getByLabelText(/Job description/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Product Manager/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'All roles' }))
    expect(onOpenJob).toHaveBeenCalledWith(null)
  })

  it('remembers the last role', () => {
    const first = render(<InterviewPrep onStart={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Digital Marketing/ }))
    first.unmount()
    render(<InterviewPrep onStart={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Digital Marketing' })).toBeTruthy()
  })

  it('shows a plan from the interview date, remembers it per role, and a readiness line without a score', () => {
    const d = new Date(); d.setDate(d.getDate() + 10)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    render(<InterviewPrep onStart={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Product Manager/ }))
    expect(screen.getByText(/Add your interview date/)).toBeTruthy()
    expect(screen.getByText('Rounds practiced 0 of 5 · Revisit items 0')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Interview date/), { target: { value: iso } })
    expect(screen.getByText(/^Today: Round 1 – /)).toBeTruthy()
    expect(screen.getByText('10 days to go')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Next days' }).children).toHaveLength(3)
    expect(localStorage.getItem('mirror.prep.v1.plan.product-manager')).toBe(iso)
    fireEvent.click(screen.getAllByRole('button', { name: 'Start interview' })[0])
    cleanup()
    render(<InterviewPrep onStart={vi.fn()} />)
    expect((screen.getByLabelText(/Interview date/) as HTMLInputElement).value).toBe(iso)
    expect(screen.getByText('Rounds practiced 1 of 5 · Revisit items 0')).toBeTruthy()
  })

  it('says so when the saved date has passed', () => {
    localStorage.setItem('mirror.prep.v1.plan.product-manager', '2020-01-01')
    render(<InterviewPrep onStart={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Product Manager/ }))
    expect(screen.getByText(/That date has passed/)).toBeTruthy()
  })
})
