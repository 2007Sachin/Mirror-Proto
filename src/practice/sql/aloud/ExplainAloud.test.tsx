// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const add = vi.fn(async (x: unknown) => x)
let existing: { question: string; answer: string }[] = []
vi.mock('../../../lib/data', () => ({ answerAttempts: { add: (x: unknown) => add(x), list: async () => existing } }))

import ExplainAloud from './ExplainAloud'
import type { SqlProblem } from '../problems'

const problem = { id: 'p1', topic: 't', level: 1, title: 'T', minutes: 5, prompt: '', hint: '', solution: '', ordered: false, explain: 'Because of the join.', edgeCases: ['Two can tie.'], followUp: 'What about a billion rows?' } as SqlProblem
afterEach(() => { cleanup(); add.mockClear(); existing = [] })

describe('ExplainAloud', () => {
  it('saves one record per answered step, skips are not saved, then compares', async () => {
    render(<ExplainAloud problem={problem} sql="select 1 from a join b on 1=1" onClose={() => {}} dictation={false} />)
    const box = await screen.findByLabelText('Your answer')
    fireEvent.change(box, { target: { value: 'Inner, because I need matches.' } })
    fireEvent.click(screen.getByText('Save and continue'))
    await screen.findByText('Next question')
    fireEvent.click(screen.getByText('Skip')) // ties
    await screen.findByText(/What about a billion rows/)
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'It would need an index.' } })
    fireEvent.click(screen.getByText('Save and finish'))
    await screen.findByText('You said')
    expect(add).toHaveBeenCalledTimes(2)
    expect(add.mock.calls[0][0]).toMatchObject({ interviewId: null, questionIndex: null, attempt: 1, kind: 'explain', itemId: 'p1', transcriptSource: 'text', answer: 'Inner, because I need matches.' })
    expect(screen.getByText('Because of the join.')).toBeTruthy()
    expect(screen.getByText('It would need an index.')).toBeTruthy()
  })
  it('shows a saved explanation read-only with Do it again', async () => {
    existing = [{ question: 'Q?', answer: 'My saved words' }]
    render(<ExplainAloud problem={problem} sql="select 1" onClose={() => {}} dictation={false} />)
    await screen.findByText('My saved words')
    fireEvent.click(screen.getByText('Do it again'))
    await waitFor(() => expect(screen.getByLabelText('Your answer')).toBeTruthy())
    expect(add).not.toHaveBeenCalled()
  })
})
