// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GetStarted from './GetStarted'

beforeEach(() => {
  window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('GetStarted page', () => {
  it('renders one h1 and no footer, with no gradient canvas below desktop width', () => {
    const { container } = render(<GetStarted />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('.ms-site-footer')).toBeNull()
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('rejects a bad email, then shows a calm confirmation and sends nothing anywhere', () => {
    const fetchSpy = vi.fn()
    const beacon = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
    const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open')
    render(<GetStarted />)
    const email = screen.getByLabelText('Email') as HTMLInputElement
    fireEvent.change(email, { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toBeTruthy()
    fireEvent.change(email, { target: { value: 'me@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('status').textContent).toMatch(/not sent anywhere/)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(beacon).not.toHaveBeenCalled()
    expect(xhr).not.toHaveBeenCalled()
  })
})
