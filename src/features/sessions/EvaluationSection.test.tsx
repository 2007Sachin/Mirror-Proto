// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { scanHtml } from '../../copyScan'
import type { Reflection } from '../../lib/api'
import EvaluationSection from './EvaluationSection'
import { evaluationOf } from './evaluation'

afterEach(cleanup)
const base: Reflection = { id: 'r', interviewId: 'i', readinessLabel: null, readinessRange: null, evidence: [], focus: 'f', suggestion: null, model: 'm', source: 'ai' }
const withItems: Reflection = {
  ...base,
  evidence: [
    { turnId: 'a', quote: 'I owned the retry logic', observation: 'You said what you owned.', competency: 'ownership', level: 'strong', fix: 'Try naming the decision first.' },
    { turnId: 'b', quote: 'a retry bug double-charged forty customers', observation: 'You named a problem but not how it ended.', competency: 'result', level: 'starting', fix: 'Try finishing with what changed.' },
    { turnId: 'c', quote: 'plain quote from the notes', observation: '', competency: '' },
  ],
}

describe('EvaluationSection', () => {
  it('shows each level as a word, the line you said, and one thing to try; skips plain quotes', () => {
    render(<EvaluationSection reflection={withItems} busy={false} failed={false} onAdd={() => {}} />)
    expect(evaluationOf(withItems)).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Your evaluation' })).toBeTruthy()
    expect(screen.getByText('Strong')).toBeTruthy()
    expect(screen.getByText('Just starting')).toBeTruthy()
    expect(screen.getByText(/“I owned the retry logic”/)).toBeTruthy()
    expect(screen.getByText(/Naming the decision first\./)).toBeTruthy()
    expect(screen.getByText(/Your clearest answer was on ownership\. The one to work on next is result\./)).toBeTruthy()
    expect(screen.queryByText(/plain quote from the notes/)).toBeNull()
  })
  it('offers to add the evaluation when the notes have none, and says when it failed', () => {
    const onAdd = vi.fn()
    const { rerender } = render(<EvaluationSection reflection={base} busy={false} failed={false} onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add the evaluation' }))
    expect(onAdd).toHaveBeenCalled()
    rerender(<EvaluationSection reflection={base} busy={false} failed onAdd={onAdd} />)
    expect(screen.getByRole('status').textContent).toMatch(/notes are safe/)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })
  it('renders nothing without notes', () => {
    const { container } = render(<EvaluationSection reflection={null} busy={false} failed={false} onAdd={() => {}} />)
    expect(container.innerHTML).toBe('')
  })
  it('passes the copy scan: no numbers, counts, scores or banned words', () => {
    expect(scanHtml('evaluation', renderToStaticMarkup(<EvaluationSection reflection={withItems} busy={false} failed={false} onAdd={() => {}} />))).toEqual([])
    expect(scanHtml('evaluation-empty', renderToStaticMarkup(<EvaluationSection reflection={base} busy={false} failed={false} onAdd={() => {}} />))).toEqual([])
  })
})
