// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const pending = <T,>() => new Promise<T>(() => {})
vi.mock('../lib/api', async orig => ({
  ...(await orig<typeof import('../lib/api')>()),
  api: { listInterviews: () => pending(), practiceSummary: () => pending(), listTargets: () => pending() },
}))
import Sessions from './Sessions'
import Practice from './Practice'
import InterviewPrep from './InterviewPrep'

afterEach(cleanup)

describe('data screens wait with a skeleton, not an empty state', () => {
  it('Sessions', () => {
    render(<Sessions openId={null} onPractise={() => {}} />)
    expect(screen.getByRole('status', { name: 'Loading your sessions' }).getAttribute('aria-busy')).toBe('true')
    expect(screen.queryByText('No finished sessions yet')).toBeNull()
  })
  it('Practice', () => {
    render(<Practice />)
    expect(screen.getByRole('status', { name: 'Loading your practice' })).toBeTruthy()
  })
  it('Interview Prep jobs', async () => {
    render(<InterviewPrep onStart={() => {}} jobId={null} onOpenJob={() => {}} onPractise={() => {}} />)
    await waitFor(() => expect(screen.getByRole('status', { name: 'Loading your jobs' })).toBeTruthy())
  })
})
