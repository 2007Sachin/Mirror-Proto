// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeWebSocket, speakQuestion } from './testUtils'

const playbacks: { turns: string[]; opts: { onComplete?: (t: string) => void } }[] = []

vi.mock('./audioCapture', () => ({
  pcm16ToBytes: (c: unknown) => c,
  AudioCapture: class {
    async start() {}
    stop() {}
    mute() {}
  },
}))
vi.mock('./audioPlayback', () => ({
  AudioPlayback: class {
    rec: { turns: string[]; opts: { onComplete?: (t: string) => void } }
    constructor(opts: { onComplete?: (t: string) => void }) {
      this.rec = { turns: [], opts }
      playbacks.push(this.rec)
    }
    startTurn(t: string) { this.rec.turns.push(t) }
    enqueue() {}
    cancel() {}
    dispose() {}
  },
}))

import { useVoiceSession } from './useVoiceSession'

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })

describe('useVoiceSession spoken interview loop', () => {
  beforeEach(() => {
    FakeWebSocket.instances = []
    playbacks.length = 0
    vi.stubGlobal('WebSocket', FakeWebSocket)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('runs several spoken turns, then ends cleanly with no error and no reconnect', async () => {
    const asked: [string, number][] = []
    const answers: string[] = []
    const onCompleted = vi.fn()
    const { result } = renderHook(() =>
      useVoiceSession({
        onQuestion: (t, i) => asked.push([t, i]),
        onFinalTranscript: t => answers.push(t),
        onCompleted,
      }),
    )
    let started = false
    await act(async () => {
      const p = result.current.start('iv1')
      await Promise.resolve()
      await Promise.resolve()
      FakeWebSocket.instances.at(-1)!.serverSend('session_ready', { sessionId: 's1', interviewState: {} })
      started = await p
    })
    expect(started).toBe(true)
    const ws = FakeWebSocket.instances.at(-1)!
    const play = playbacks.at(-1)!

    for (let i = 0; i < 3; i++) {
      const turnId = `s1:${i}`
      act(() => speakQuestion(ws, turnId, `Question ${i}`, i))
      await flush()
      expect(play.turns.at(-1)).toBe(turnId) // the new question's speech is actually played
      act(() => play.opts.onComplete?.(turnId)) // the speaker finishes
      expect(ws.sentEnvelopes('playback_complete').at(-1)?.turnId).toBe(turnId)
      act(() => ws.serverSend('state', { state: 'listening', turnId }, turnId))
      act(() => ws.serverSend('final_transcript', { text: `Answer ${i}` }, turnId))
      act(() => ws.serverSend('turn_accepted', { turnId, questionIndex: i }, turnId))
    }
    expect(asked).toEqual([['Question 0', 0], ['Question 1', 1], ['Question 2', 2]])
    expect(answers).toEqual(['Answer 0', 'Answer 1', 'Answer 2'])
    expect(ws.sentEnvelopes('playback_complete')).toHaveLength(3)

    const count = FakeWebSocket.instances.length
    act(() => {
      ws.serverSend('state', { state: 'completed', turnId: 's1:2' }, 's1:2')
      ws.serverSend('close', { code: 'interview_completed', reason: 'interview is complete' }, 's1:2')
      ws.close()
    })
    await flush()
    expect(onCompleted).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeNull()
    expect(result.current.active).toBe(false)
    expect(FakeWebSocket.instances).toHaveLength(count)
  })

  it('switches calmly to typing when the server has no speech provider', async () => {
    const { result } = renderHook(() => useVoiceSession())
    let ok = true
    await act(async () => {
      const p = result.current.start('iv1')
      await Promise.resolve()
      await Promise.resolve()
      const ws = FakeWebSocket.instances.at(-1)!
      ws.serverSend('voice_unavailable', { reason: 'stt_not_configured' })
      ws.close()
      ok = await p
    })
    expect(ok).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.failureNotice()).toBe("Voice is not set up here, so let's type this one.")
    expect(FakeWebSocket.instances).toHaveLength(1)
  })
})
