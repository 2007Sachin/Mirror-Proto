// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const chunks: ((c: Int16Array) => void)[] = []
vi.mock('../voice/audioCapture', () => ({
  AudioCapture: class { constructor(o: { onChunk: (c: Int16Array) => void }) { chunks.push(o.onChunk) } async start() {} stop() {} },
  pcm16ToBytes: (c: Int16Array) => new Uint8Array(c.buffer),
}))
const transcribe = vi.fn()
vi.mock('../lib/api', () => ({ api: { transcribe: (...a: unknown[]) => transcribe(...a), onboardingStep: vi.fn(), saveProfile: vi.fn() } }))

import FirstInterview from './FirstInterview'

describe('FirstInterview live transcript', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); transcribe.mockReset(); chunks.length = 0 })
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('adds what you said to the box every few seconds while you are still speaking', async () => {
    transcribe.mockResolvedValueOnce({ text: 'I am a data analyst' }).mockResolvedValueOnce({ text: 'moving into product' })
    render(<FirstInterview onDone={() => {}} onBack={() => {}} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Speak instead' })) })
    const loud = new Int16Array(8000).fill(4000)
    await act(async () => { chunks[0](loud); await vi.advanceTimersByTimeAsync(3600) })
    expect((screen.getByLabelText('About you') as HTMLTextAreaElement).value).toContain('I am a data analyst')
    await act(async () => { chunks[0](loud); await vi.advanceTimersByTimeAsync(3600) })
    expect((screen.getByLabelText('About you') as HTMLTextAreaElement).value).toContain('moving into product')
    expect(transcribe).toHaveBeenCalledTimes(2)
  })
})
