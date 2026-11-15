import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VoiceClient } from './VoiceClient'
import { FakeWebSocket, speakQuestion } from './testUtils'

async function connected() {
  const client = new VoiceClient({ url: 'ws://test/ws/voice', backoff: { initialMs: 5, maxMs: 5 } })
  const seen: { type: string; turnId: string | null }[] = []
  client.on('*', (_p, env) => seen.push({ type: env.type, turnId: env.turnId }))
  const promise = client.connect('iv1')
  await Promise.resolve()
  const ws = FakeWebSocket.instances.at(-1)!
  ws.serverSend('session_ready', { sessionId: 's1', interviewState: {} })
  await promise
  return { client, ws, seen }
}

describe('VoiceClient', () => {
  beforeEach(() => {
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('plays the next question on its new turn id and sends playback_complete for it', async () => {
    const { client, ws, seen } = await connected()
    speakQuestion(ws, 's1:0', 'Tell me about a project.', 0)
    expect(client.currentTurnId).toBe('s1:0')

    // The server answers the first spoken turn with the next question on a NEW turn id.
    speakQuestion(ws, 's1:1', 'What did you decide?', 1)
    expect(client.currentTurnId).toBe('s1:1')
    const types = seen.filter(m => m.turnId === 's1:1').map(m => m.type)
    expect(types).toEqual(expect.arrayContaining(['question', 'tts_start', 'tts_end']))
    expect(seen.filter(m => m.type === 'tts_audio')).toHaveLength(2)

    client.playbackComplete('s1:1')
    const [done] = ws.sentEnvelopes('playback_complete')
    expect(done.turnId).toBe('s1:1')
    expect(done.payload).toEqual({ turnId: 's1:1' })
  })

  it('still drops a stale transcript from an old turn', async () => {
    const { ws, seen } = await connected()
    speakQuestion(ws, 's1:1', 'Second question', 1)
    ws.serverSend('final_transcript', { text: 'old words' }, 's1:0')
    ws.serverSend('partial_transcript', { text: 'older' }, 's1:0')
    expect(seen.some(m => m.type === 'final_transcript' || m.type === 'partial_transcript')).toBe(false)
    ws.serverSend('final_transcript', { text: 'new words' }, 's1:1')
    expect(seen.some(m => m.type === 'final_transcript')).toBe(true)
  })

  it('treats an interview_completed close as a clean end: no reconnect', async () => {
    vi.useFakeTimers()
    try {
      const { ws } = await connected()
      const count = FakeWebSocket.instances.length
      ws.serverSend('close', { code: 'interview_completed', reason: 'interview is complete' })
      ws.close()
      await vi.advanceTimersByTimeAsync(100)
      expect(FakeWebSocket.instances).toHaveLength(count)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects calmly, without reconnecting, when the server says voice is unavailable', async () => {
    vi.useFakeTimers()
    try {
      const client = new VoiceClient({ url: 'ws://test/ws/voice', backoff: { initialMs: 5, maxMs: 5 } })
      const promise = client.connect('iv1')
      const assertion = expect(promise).rejects.toThrow('voice_unavailable')
      await Promise.resolve()
      const ws = FakeWebSocket.instances.at(-1)!
      ws.serverSend('voice_unavailable', { reason: 'stt_not_configured' })
      ws.close()
      await assertion
      await vi.advanceTimersByTimeAsync(100)
      expect(FakeWebSocket.instances).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
