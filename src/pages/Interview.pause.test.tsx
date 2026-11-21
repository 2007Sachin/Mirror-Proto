// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scanHtml } from '../copyScan'
import Interview, { type InterviewProps } from './Interview'

vi.mock('../components/FluidOrb', () => ({ default: () => null }))
window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList

const noop = () => {}
const makeVoice = (extra: Record<string, unknown> = {}) => ({
  voiceState: 'listening', orbState: 'idle', partialTranscript: '', finalTranscript: '', questionText: '', error: null, nudgeText: '',
  inputLevel: 0, outputLevel: 0, isMuted: false, active: true,
  start: async () => true, stop: noop, retry: noop, interrupt: vi.fn(), mute: vi.fn(), continueByTyping: noop, commitSpokenAnswer: noop, ...extra,
}) as unknown as InterviewProps['voice']
const props = (extra: Partial<InterviewProps> = {}): InterviewProps => ({
  question: 'Tell me about a project you are proud of.', questionIndex: 0, totalDots: 4, isLast: false, focusLabel: 'Ownership',
  answers: [], orb: 'idle', voice: makeVoice(), flowText: null, canRetry: false, waiting: false, busy: false, answer: '', setAnswer: noop,
  sessionId: 's1', onSubmit: noop, onRetry: noop, onContinueLater: noop, onEnd: noop, onSwitchToType: noop, onSwitchToSpeak: noop, ...extra,
})
const timer = () => screen.getByLabelText(/Session time/).getAttribute('aria-label')

beforeEach(() => vi.useFakeTimers())
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('Interview room: pause', () => {
  it('stops the session clock while paused and carries on after Resume', () => {
    render(<Interview {...props()} />)
    act(() => { vi.advanceTimersByTime(3000) })
    expect(timer()).toBe('Session time 00:03')
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeTruthy()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(timer()).toBe('Session time 00:03')
    expect(screen.getByText('Paused for 00:05')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Resume/ }))
    expect(screen.queryByRole('heading', { name: 'Paused' })).toBeNull()
    act(() => { vi.advanceTimersByTime(2000) })
    expect(timer()).toBe('Session time 00:05')
  })

  it('stops MIRROR talking and mutes the microphone, then restores it on Resume', () => {
    const voice = makeVoice()
    render(<Interview {...props({ orb: 'speaking', voice })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(voice.interrupt).toHaveBeenCalled()
    expect(voice.mute).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByRole('button', { name: /Resume/ }))
    expect(voice.mute).toHaveBeenLastCalledWith(false)
  })

  it('leaves a microphone you had muted muted after Resume', () => {
    const voice = makeVoice({ isMuted: true })
    render(<Interview {...props({ voice })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.click(screen.getByRole('button', { name: /Resume/ }))
    expect(voice.mute).not.toHaveBeenCalled()
  })

  it('calms the orb while paused, whatever the interview is doing', () => {
    const { container } = render(<Interview {...props({ orb: 'speaking' })} />)
    expect(container.querySelector('.iv-orbbox')?.getAttribute('data-state')).toBe('speaking')
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(container.querySelector('.iv-orbbox')?.getAttribute('data-state')).toBe('idle')
  })

  it('K pauses and resumes; other shortcuts wait while paused', () => {
    const voice = makeVoice()
    render(<Interview {...props({ voice })} />)
    fireEvent.keyDown(document.body, { key: 'k' })
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeTruthy()
    vi.mocked(voice.mute).mockClear()
    fireEvent.keyDown(document.body, { key: 'm' })
    expect(voice.mute).not.toHaveBeenCalled()
    fireEvent.keyDown(document.body, { key: 'k' })
    expect(screen.queryByRole('heading', { name: 'Paused' })).toBeNull()
  })

  it('a screening call cannot be paused', () => {
    render(<Interview {...props({ screen: { remainingSeconds: 400, totalSeconds: 480, onEnd: noop } })} />)
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull()
    fireEvent.keyDown(document.body, { key: 'k' })
    expect(screen.queryByRole('heading', { name: 'Paused' })).toBeNull()
  })

  it('paused screen has no banned words, counts or scores', () => {
    const { container } = render(<Interview {...props()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(scanHtml('Interview paused', container.innerHTML)).toEqual([])
  })
})
