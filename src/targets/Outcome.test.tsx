// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { scanHtml } from '../copyScan'
import { loadOutcome, practiceDays, saveOutcome } from './outcome'

const rows = vi.hoisted(() => ({ current: [] as { id: string; targetId?: string | null; createdAt: string }[] }))
vi.mock('../lib/api', () => ({ api: { listInterviews: async () => rows.current } }))

import Outcome from './OutcomePanel'

beforeEach(() => { localStorage.clear(); rows.current = [] })
afterEach(cleanup)

describe('outcome storage', () => {
  it('saves and loads per job, caps the note, ignores a bad result and clears when empty', () => {
    expect(loadOutcome('t1')).toEqual({ result: null, note: '' })
    saveOutcome('t1', { result: 'offer', note: 'x'.repeat(400) })
    expect(loadOutcome('t1')).toEqual({ result: 'offer', note: 'x'.repeat(300) })
    expect(loadOutcome('t2')).toEqual({ result: null, note: '' })
    localStorage.setItem('mirror.target.v1.t3.outcome', JSON.stringify({ result: 'hired!!', note: 'hi' }))
    expect(loadOutcome('t3')).toEqual({ result: null, note: 'hi' })
    saveOutcome('t1', { result: null, note: '' })
    expect(localStorage.getItem('mirror.target.v1.t1.outcome')).toBeNull()
  })
})

describe('practiceDays', () => {
  it('counts different days for one job, with the first and last', () => {
    const r = [
      { targetId: 't1', createdAt: '2026-11-03T09:00:00Z' }, { targetId: 't1', createdAt: '2026-11-03T18:00:00Z' },
      { targetId: 't1', createdAt: '2026-11-10T09:00:00Z' }, { targetId: 't2', createdAt: '2026-11-04T09:00:00Z' }, { targetId: null, createdAt: '2026-11-05T09:00:00Z' },
    ]
    expect(practiceDays(r, 't1')).toEqual({ days: 2, first: '2026-11-03T09:00:00Z', last: '2026-11-10T09:00:00Z' })
    expect(practiceDays(r, 'none')).toBeNull()
  })
})

describe('Outcome panel', () => {
  it('says so when no practice is tied to the job', async () => {
    render(<Outcome targetId="t1" />)
    expect(await screen.findByText(/No practice is tied to this job yet/)).toBeTruthy()
  })

  it('shows the days you practised for this job', async () => {
    rows.current = [{ id: 'a', targetId: 't1', createdAt: '2026-11-03T09:00:00Z' }, { id: 'b', targetId: 't1', createdAt: '2026-11-10T09:00:00Z' }, { id: 'c', targetId: 't9', createdAt: '2026-11-11T09:00:00Z' }]
    render(<Outcome targetId="t1" />)
    expect(await screen.findByText(/You practised for this job on 2 days/)).toBeTruthy()
  })

  it('remembers how the real interview went and a note, per job, and can clear it', async () => {
    const first = render(<Outcome targetId="t1" />)
    fireEvent.click(await screen.findByLabelText('I got an offer'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Lead with the result.' } })
    expect(loadOutcome('t1')).toEqual({ result: 'offer', note: 'Lead with the result.' })
    first.unmount()
    render(<Outcome targetId="t1" />)
    expect((await screen.findByLabelText('I got an offer') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Lead with the result.')
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(loadOutcome('t1').result).toBeNull()
  })

  it('has no banned words, counts, percentages or scores', async () => {
    rows.current = [{ id: 'a', targetId: 't1', createdAt: '2026-11-03T09:00:00Z' }]
    const { container } = render(<Outcome targetId="t1" />)
    await screen.findByText(/You practised/)
    expect(scanHtml('Outcome', container.innerHTML)).toEqual([])
  })
})
