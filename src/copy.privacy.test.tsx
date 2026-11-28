// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { scanHtml } from './copyScan'

const request = vi.fn()
const clearAll = vi.fn(async () => undefined)
vi.mock('./lib/api', () => ({ request: (...a: unknown[]) => request(...a) }))
vi.mock('./lib/data', () => ({ clearAll: () => clearAll() }))
import Privacy from './pages/Privacy'
import Settings, { type SettingsProps } from './pages/Settings'

const props = (extra: Partial<SettingsProps> = {}): SettingsProps => ({
  voiceSpeed: 'Natural', setVoiceSpeed: () => {}, language: 'English', setLanguage: () => {}, calmMotion: false, setCalmMotion: () => {},
  notify: () => {}, onResetDemo: () => {}, onOpenPrivacy: () => {}, onDeleted: () => {}, ...extra,
})

beforeEach(() => {
  request.mockReset()
  clearAll.mockClear()
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks() })

describe('privacy copy', () => {
  it('the page and the Settings screen pass the copy scan', () => {
    const a = render(<Privacy onBack={() => {}} onOpenSettings={() => {}} />)
    expect(scanHtml('privacy page', a.container.innerHTML)).toEqual([])
    a.unmount()
    const b = render(<Settings {...props()} />)
    expect(scanHtml('settings page', b.container.innerHTML)).toEqual([])
  })

  it('states the four promises and the honest hand-offs', () => {
    render(<Privacy onBack={() => {}} onOpenSettings={() => {}} />)
    for (const t of ['Audio is never stored by MIRROR', 'Answers never get a number', 'Nothing is shared with employers', 'You can delete everything, anytime', 'Who handles what']) {
      expect(screen.getByText(t)).toBeTruthy()
    }
    expect(screen.getByText(/does not remove your sign-in account/)).toBeTruthy()
  })
})

describe('Settings: Your data', () => {
  it('Export my data downloads a JSON file', async () => {
    request.mockResolvedValue({ workspace: 'u', interviews: [] })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<Settings {...props()} />)
    fireEvent.click(screen.getByText('Export my data'))
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(request).toHaveBeenCalledWith('/me/export')
    expect(await screen.findByText('Your data was saved as a JSON file.')).toBeTruthy()
  })

  it('shows a plain error when the export fails', async () => {
    request.mockRejectedValue(new Error('x'))
    render(<Settings {...props()} />)
    fireEvent.click(screen.getByText('Export my data'))
    expect(await screen.findByText(/could not export your data/)).toBeTruthy()
  })

  it('Delete needs DELETE typed, then clears the server and this browser', async () => {
    request.mockResolvedValue({ deleted: true })
    localStorage.setItem('mirror.draft.s1:0', 'half an answer')
    localStorage.setItem('other.key', 'keep')
    sessionStorage.setItem('mirror.phase1.sessionId', 's1')
    const onDeleted = vi.fn()
    render(<Settings {...props({ onDeleted })} />)
    fireEvent.click(screen.getByText('Delete all my data'))
    const go = screen.getByText('Delete everything') as HTMLButtonElement
    expect(go.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'delete' } })
    expect(go.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } })
    expect(go.disabled).toBe(false)
    fireEvent.click(go)
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    expect(request).toHaveBeenCalledWith('/me/data', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE' }) })
    expect(clearAll).toHaveBeenCalled()
    expect(localStorage.getItem('mirror.draft.s1:0')).toBeNull()
    expect(sessionStorage.getItem('mirror.phase1.sessionId')).toBeNull()
    expect(localStorage.getItem('other.key')).toBe('keep')
  })

  it('a failed delete removes nothing locally and says so', async () => {
    request.mockRejectedValue(new Error('x'))
    localStorage.setItem('mirror.draft.s1:0', 'half an answer')
    const onDeleted = vi.fn()
    render(<Settings {...props({ onDeleted })} />)
    fireEvent.click(screen.getByText('Delete all my data'))
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } })
    fireEvent.click(screen.getByText('Delete everything'))
    expect(await screen.findByText(/nothing was removed/)).toBeTruthy()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(localStorage.getItem('mirror.draft.s1:0')).toBe('half an answer')
  })
})
