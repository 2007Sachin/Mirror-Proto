// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Header } from './sections'
import type { TodayModel } from './types'

afterEach(cleanup)
const model = { greeting: 'Welcome. Start with one question.', status: 'Nothing yet.' } as TodayModel

describe('Briefing header', () => {
  it('says nothing that can change while the data is still loading', () => {
    render(<Header model={model} now={new Date(2026, 10, 22)} loading />)
    expect(screen.queryByText(/Welcome/)).toBeNull()
    expect(screen.queryByText('Nothing yet.')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Briefing')
  })
  it('shows the greeting and status once known', () => {
    render(<Header model={model} now={new Date(2026, 10, 22)} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Welcome. Start with one question.')
    expect(screen.getByText('Nothing yet.')).toBeTruthy()
  })
})
