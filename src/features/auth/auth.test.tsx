// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ApiError } from '../../lib/api'

const requestMagicLink = vi.fn()
vi.mock('../../lib/api', async orig => {
  const actual = await orig<typeof import('../../lib/api')>()
  return { ...actual, authApi: { ...actual.authApi, requestMagicLink: (e: string) => requestMagicLink(e) } }
})
import SignIn from './SignIn'
import AccountMenu from './AccountMenu'

beforeEach(() => requestMagicLink.mockReset())
afterEach(cleanup)

const type = (v: string) => fireEvent.change(screen.getByLabelText('Email'), { target: { value: v } })

describe('SignIn', () => {
  it('sends the link and shows the calm sent state with the address', async () => {
    requestMagicLink.mockResolvedValue({ ok: true })
    render(<SignIn googleEnabled={false} />)
    type('me@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Send me a link' }))
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeTruthy()
    expect(screen.getByText('me@example.com')).toBeTruthy()
    expect(requestMagicLink).toHaveBeenCalledWith('me@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Use a different email' }))
    expect(screen.getByLabelText('Email')).toBeTruthy()
  })

  it('shows plain messages for a rate limit and for a failure', async () => {
    requestMagicLink.mockRejectedValueOnce(new ApiError(429, 'x', null))
    render(<SignIn googleEnabled={false} />)
    type('a@b.co')
    fireEvent.click(screen.getByRole('button', { name: 'Send me a link' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/wait a few minutes/)
    requestMagicLink.mockRejectedValueOnce(new Error('down'))
    fireEvent.click(screen.getByRole('button', { name: 'Send me a link' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/could not send/))
  })

  it('shows Continue with Google only when enabled', () => {
    const { rerender } = render(<SignIn googleEnabled={false} />)
    expect(screen.queryByText('Continue with Google')).toBeNull()
    rerender(<SignIn googleEnabled />)
    expect(screen.getByText('Continue with Google').getAttribute('href')).toBe('/auth/google')
  })
})

describe('AccountMenu', () => {
  it('shows the email and signs out', () => {
    const out = vi.fn()
    render(<AccountMenu email="me@example.com" onSignOut={out} />)
    expect(screen.queryByText('me@example.com')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    expect(screen.getByText('me@example.com')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Alex Morgan/)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(out).toHaveBeenCalledTimes(1)
  })
})
