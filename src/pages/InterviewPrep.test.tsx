// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InterviewPrep from './InterviewPrep'
import { PREP_ROLES } from '../prep/roles'

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

  it('remembers the last role', () => {
    const first = render(<InterviewPrep onStart={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Digital Marketing/ }))
    first.unmount()
    render(<InterviewPrep onStart={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Digital Marketing' })).toBeTruthy()
  })
})
