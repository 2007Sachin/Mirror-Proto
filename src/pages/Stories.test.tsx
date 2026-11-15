// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { StoryRow } from '../lib/data'

let db: StoryRow[] = []
vi.mock('../lib/data', () => ({
  stories: {
    list: async () => [...db].reverse(),
    create: async (i: object) => { const r = { ...i, id: String(db.length + 1), workspaceId: 'w', createdAt: new Date(2026, 0, db.length + 1).toISOString(), updatedAt: '' } as StoryRow; db.push(r); return r },
    update: async (id: string, p: object) => { db = db.map(s => (s.id === id ? { ...s, ...p } : s)); return null },
    remove: async (id: string) => { db = db.filter(s => s.id !== id) },
  },
}))
vi.mock('../lib/api', () => ({
  api: {
    listInterviews: async () => [{ id: 'i1', role: 'Analyst', status: 'completed', createdAt: '2026-01-01T00:00:00Z', answered: 1, notes: null }],
    getInterview: async () => ({ id: 'i1', turns: [{ id: 't1', questionIndex: 0, question: 'Tell me about a deadline?', answer: 'Our team had a tight deadline to ship billing. I led the cutover and we finished two days early.', transcriptSource: 'text' }] }),
  },
}))
import Stories from './Stories'

afterEach(() => { cleanup(); db = [] })

describe('Stories page', () => {
  it('drafts from a past answer, edits, saves, updates coverage and suggests', async () => {
    render(<Stories />)
    expect(await screen.findByText('No stories yet. Save one from a past answer and it will show up here.')).toBeTruthy()
    fireEvent.click(screen.getByText('Choose a past answer'))
    fireEvent.click(await screen.findByText(/Analyst/))
    fireEvent.click(await screen.findByText('Save as a story'))
    const title = (await screen.findByLabelText('Title')) as HTMLInputElement
    expect(title.value).toContain('Our team had a tight deadline')
    fireEvent.change(title, { target: { value: 'Billing cutover' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Billing cutover' })).toBeTruthy())
    expect(screen.getAllByText('1 story').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No story yet').length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText('Paste or type a question'), { target: { value: 'Describe working to a tight deadline' } })
    fireEvent.click(screen.getByText('Suggest'))
    expect(await screen.findByText(/'Billing cutover' is tagged/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Paste or type a question'), { target: { value: 'Tell me about a conflict' } })
    fireEvent.click(screen.getByText('Suggest'))
    expect(await screen.findByText('No saved story fits yet. Save one from a past answer.')).toBeTruthy()
  })
})
