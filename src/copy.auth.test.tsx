// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { scanHtml } from './copyScan'
import SignIn from './features/auth/SignIn'
import AccountMenu from './features/auth/AccountMenu'

describe('auth copy', () => {
  it('sign-in screen passes the scan, with and without Google', () => {
    const a = render(<SignIn googleEnabled onBack={() => undefined} notice="That link did not work. Please ask for a new one." />)
    expect(scanHtml('sign in', a.container.innerHTML)).toEqual([])
    a.unmount()
    const b = render(<SignIn googleEnabled={false} />)
    expect(scanHtml('sign in plain', b.container.innerHTML)).toEqual([])
  })
  it('account menu passes the scan', () => {
    const { container } = render(<AccountMenu email="me@example.com" onSignOut={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    expect(scanHtml('account menu', container.innerHTML)).toEqual([])
  })
})
