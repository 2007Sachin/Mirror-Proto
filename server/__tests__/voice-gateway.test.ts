import { createServer } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { OPENING_QUESTION } from '../domain/questions.js'
import { createMemoryRepository } from '../repo/memory.js'
import { createMockStt } from '../voice/stt/mockStt.js'
import { TURN_TOO_LONG_MESSAGE, VOICE_LIMITS } from '../voice/limits.js'
import { createMockTts } from '../voice/tts/mockTts.js'
import { createVoiceGateway } from '../voice/gateway.js'
import { makeApp, makeEnv, WS, j } from './helpers.js'
import { PROTOCOL_VERSION } from '../voice/protocol.js'

function envelope(type: string, seq: number, payload: unknown, sessionId: string | null = null, turnId: string | null = null) {
  return JSON.stringify({ v: PROTOCOL_VERSION, type, sessionId, turnId, seq, ts: Date.now(), payload })
}

type Msg = { type: string; payload?: unknown; json?: boolean; binary?: boolean }

function attachInbox(ws: WebSocket) {
  const msgs: Msg[] = []
  const waiters: { until: (m: Msg[]) => boolean; resolve: (m: Msg[]) => void; timer: ReturnType<typeof setTimeout> }[] = []
  const flush = () => {
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].until(msgs)) {
        clearTimeout(waiters[i].timer)
        waiters[i].resolve([...msgs])
        waiters.splice(i, 1)
      }
    }
  }
  ws.on('message', (data, isBinary) => {
    if (isBinary) msgs.push({ type: 'tts_audio', binary: true })
    else {
      const parsed = JSON.parse(String(data)) as { type: string; payload?: unknown }
      msgs.push({ type: parsed.type, payload: parsed.payload, json: true })
    }
    flush()
  })
  return {
    msgs,
    wait(until: (m: Msg[]) => boolean, timeoutMs = 4000) {
      return new Promise<Msg[]>((resolve, reject) => {
        if (until(msgs)) return resolve([...msgs])
        const timer = setTimeout(() => reject(new Error(`timeout types=${msgs.map(m => m.type).join(',')}`)), timeoutMs)
        waiters.push({ until, resolve, timer })
      })
    },
  }
}

describe('voice gateway', () => {
  const servers: { close: () => void }[] = []
  afterEach(() => {
    while (servers.length) servers.pop()?.close()
  })

  async function start(sttText = 'I owned the research and simplified onboarding after the update.') {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('dev')
    const interview = await repo.createInterview('dev', {
      role: 'Product Analyst',
      industry: 'Technology / SaaS',
      openingQuestion: OPENING_QUESTION,
    })
    const logs: string[] = []
    const http = createServer()
    const gateway = createVoiceGateway({
      env: makeEnv(),
      repo,
      stt: createMockStt({ finalText: sttText, emitPartials: false }),
      tts: createMockTts({ chunkCount: 1 }),
      provider: {
        async generateFollowUp() {
          return 'What decision did you make?'
        },
        async generateReflection() {
          throw new Error('unused')
        },
      },
      log: msg => logs.push(msg),
    })
    gateway.attach(http)
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
    const addr = http.address()
    const port = typeof addr === 'object' && addr ? addr.port : 0
    servers.push({
      close() {
        gateway.close()
        http.close()
      },
    })
    return { repo, interview, port, logs }
  }

  it('speaks the opening question, accepts a spoken turn, and does not store audio', async () => {
    const { repo, interview, port, logs } = await start()
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`)
    const inbox = attachInbox(ws)
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })
    ws.send(envelope('hello', 0, { interviewId: interview.id, token: 'dev' }))
    const opened = await inbox.wait(msgs => msgs.some(m => m.type === 'tts_end'))
    expect(opened.some(m => m.type === 'session_ready')).toBe(true)
    expect(opened.some(m => m.type === 'question')).toBe(true)
    expect(opened.some(m => m.binary)).toBe(true)
    const ready = opened.find(m => m.type === 'session_ready')
    const sessionId = (ready?.payload as { sessionId: string }).sessionId
    const question = opened.find(m => m.type === 'question')
    const turnId = (question?.payload as { turnId: string }).turnId

    ws.send(envelope('playback_complete', 1, { turnId }, sessionId, turnId))
    await inbox.wait(msgs => msgs.some(m => m.type === 'state' && (m.payload as { state: string }).state === 'listening'))

    ws.send(Buffer.alloc(640))
    ws.send(envelope('finalize_turn', 2, { turnId }, sessionId, turnId))
    const after = await inbox.wait(msgs => msgs.some(m => m.type === 'question' && (m.payload as { questionIndex: number }).questionIndex === 1))
    expect(after.some(m => m.type === 'final_transcript')).toBe(true)
    const turns = await repo.getTurns('dev', interview.id)
    expect(turns).toHaveLength(1)
    expect(turns[0].transcriptSource).toBe('voice')
    expect(JSON.stringify(turns[0])).not.toMatch(/RIFF|audio\//)
    expect(logs.join('\n')).not.toContain('owned the research')
    ws.close()
  })

  it('resumes a tombstoned session immediately without creating a new interview turn', async () => {
    const { repo, interview, port } = await start()
    const first = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`)
    const inbox = attachInbox(first)
    await new Promise<void>((resolve, reject) => {
      first.on('open', () => resolve())
      first.on('error', reject)
    })
    first.send(envelope('hello', 0, { interviewId: interview.id, token: 'dev' }))
    await inbox.wait(msgs => msgs.some(m => m.type === 'session_ready'))
    const sessionId = (inbox.msgs.find(m => m.type === 'session_ready')?.payload as { sessionId: string }).sessionId
    first.close()
    await new Promise(resolve => setTimeout(resolve, 50))

    const second = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`)
    const inbox2 = attachInbox(second)
    await new Promise<void>((resolve, reject) => {
      second.on('open', () => resolve())
      second.on('error', reject)
    })
    second.send(envelope('hello', 0, { interviewId: interview.id, token: 'dev', resumeSessionId: sessionId }))
    const resumed = await inbox2.wait(msgs => msgs.some(m => m.type === 'session_ready') || msgs.some(m => m.type === 'error'))
    expect(resumed.some(m => m.type === 'error' && (m.payload as { code: string }).code === 'rate_limited')).toBe(false)
    const ready = resumed.find(m => m.type === 'session_ready')
    expect((ready?.payload as { sessionId: string }).sessionId).toBe(sessionId)
    expect((ready?.payload as { interviewState: { questionIndex: number } }).interviewState.questionIndex).toBe(0)
    const turns = await repo.getTurns('dev', interview.id)
    expect(turns).toHaveLength(0)
    second.close()
  })

  it('drops stale sequence numbers without applying the command', async () => {
    const { interview, port } = await start()
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`)
    const inbox = attachInbox(ws)
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })
    ws.send(envelope('hello', 0, { interviewId: interview.id, token: 'dev' }))
    await inbox.wait(msgs => msgs.some(m => m.type === 'session_ready'))
    ws.send(envelope('ping', 1, { nonce: 'a' }))
    await inbox.wait(msgs => msgs.some(m => m.type === 'pong'))
    ws.send(envelope('ping', 1, { nonce: 'b' }))
    const stale = await inbox.wait(msgs => msgs.some(m => m.type === 'error'))
    expect((stale.find(m => m.type === 'error')?.payload as { code: string }).code).toBe('stale_seq')
    ws.close()
  })

  it('completes a four-answer spoken interview and persists evidence-linked reflection without audio', async () => {
    const spoken = 'I owned the research and simplified onboarding after the product update.'
    const { repo, interview, port } = await start(spoken)
    const { app } = makeApp({
      repo,
      provider: {
        async generateFollowUp() {
          return 'What decision did you make?'
        },
        async generateReflection(request) {
          return {
            readinessLabel: 'solid' as const,
            readinessRange: { low: 55, high: 70 },
            evidence: [
              {
                turnId: request.turns[0].id,
                quote: 'simplified onboarding',
                observation: 'Owned a concrete product change.',
                competency: 'Ownership',
              },
            ],
            focus: 'Quantify the outcome of the onboarding change.',
          }
        },
      },
    })
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`)
    const inbox = attachInbox(ws)
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })
    let seq = 0
    ws.send(envelope('hello', seq++, { interviewId: interview.id, token: 'dev' }))
    for (let i = 0; i < 4; i++) {
      const ttsBefore = inbox.msgs.filter(m => m.type === 'tts_end').length
      const listenBefore = inbox.msgs.filter(m => m.type === 'state' && (m.payload as { state: string }).state === 'listening').length
      await inbox.wait(msgs => msgs.some(m => m.type === 'question' && (m.payload as { questionIndex: number }).questionIndex === i))
      await inbox.wait(msgs => msgs.filter(m => m.type === 'tts_end').length > ttsBefore)
      const question = [...inbox.msgs].reverse().find(m => m.type === 'question' && (m.payload as { questionIndex: number }).questionIndex === i)
      const ready = inbox.msgs.find(m => m.type === 'session_ready')
      const sessionId = (ready?.payload as { sessionId: string }).sessionId
      const turnId = (question?.payload as { turnId: string }).turnId
      ws.send(envelope('playback_complete', seq++, { turnId }, sessionId, turnId))
      await inbox.wait(msgs => msgs.filter(m => m.type === 'state' && (m.payload as { state: string }).state === 'listening').length > listenBefore)
      ws.send(Buffer.alloc(640))
      ws.send(envelope('finalize_turn', seq++, { turnId }, sessionId, turnId))
    }
    await inbox.wait(msgs => msgs.some(m => m.type === 'state' && (m.payload as { state: string }).state === 'completed'))
    const turns = await repo.getTurns('dev', interview.id)
    expect(turns).toHaveLength(4)
    expect(turns.every(t => t.transcriptSource === 'voice')).toBe(true)
    expect(JSON.stringify(turns)).not.toMatch(/RIFF|audio\/|pcm16/)

    const complete = await app.request(`/interviews/${interview.id}/complete`, { method: 'POST', headers: WS })
    expect(complete.status).toBe(200)
    const reflect = await app.request(`/interviews/${interview.id}/reflect`, { method: 'POST', headers: WS })
    expect(reflect.status).toBe(201)
    const body = await j(reflect)
    expect(body.evidence[0].quote).toBe('simplified onboarding')
    expect(body.evidence[0].turnId).toBe(turns[0].id)
    ws.close()
  })

  it('falls back to listening after a TTS provider failure without advancing the interview', async () => {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('dev')
    const interview = await repo.createInterview('dev', {
      role: 'Product Analyst',
      industry: 'Technology / SaaS',
      openingQuestion: OPENING_QUESTION,
    })
    const http = createServer()
    const gateway = createVoiceGateway({
      env: makeEnv(),
      repo,
      stt: createMockStt({ emitPartials: false }),
      tts: createMockTts({ fail: true }),
      provider: null,
    })
    gateway.attach(http)
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
    servers.push({
      close() {
        gateway.close()
        http.close()
      },
    })
    const addr = http.address()
    const port = typeof addr === 'object' && addr ? addr.port : 0
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`)
    const inbox = attachInbox(ws)
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })
    ws.send(envelope('hello', 0, { interviewId: interview.id, token: 'dev' }))
    const failed = await inbox.wait(msgs => msgs.some(m => m.type === 'error') && msgs.some(m => m.type === 'state' && (m.payload as { state: string }).state === 'listening'))
    expect((failed.find(m => m.type === 'error')?.payload as { code: string }).code).toBe('tts_error')
    expect(await repo.getTurns('dev', interview.id)).toHaveLength(0)
    ws.close()
  })

  it('emits partials without advancing, then one final on manual flush', async () => {
    const { repo, interview, port } = await start()
    const http = createServer()
    const gateway = createVoiceGateway({
      env: makeEnv(),
      repo,
      stt: createMockStt({
        finalText: 'I owned the research and simplified onboarding after the product update.',
        emitPartials: true,
      }),
      tts: createMockTts({ chunkCount: 1 }),
      provider: {
        async generateFollowUp() {
          return 'What decision did you make?'
        },
        async generateReflection() {
          throw new Error('unused')
        },
      },
    })
    gateway.attach(http)
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
    const port2 = (http.address() as { port: number }).port
    servers.push({ close() { gateway.close(); http.close() } })
    const ws = new WebSocket(`ws://127.0.0.1:${port2}/ws/voice`)
    const inbox = attachInbox(ws)
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })
    ws.send(envelope('hello', 0, { interviewId: interview.id, token: 'dev' }))
    await inbox.wait(msgs => msgs.some(m => m.type === 'tts_end'))
    const turnId = (inbox.msgs.find(m => m.type === 'question')?.payload as { turnId: string }).turnId
    const sessionId = (inbox.msgs.find(m => m.type === 'session_ready')?.payload as { sessionId: string }).sessionId
    ws.send(envelope('playback_complete', 1, { turnId }, sessionId, turnId))
    await inbox.wait(msgs => msgs.some(m => m.type === 'state' && (m.payload as { state: string }).state === 'listening'))
    ws.send(Buffer.alloc(640))
    await inbox.wait(msgs => msgs.some(m => m.type === 'partial_transcript'))
    expect(await repo.getTurns('dev', interview.id)).toHaveLength(0)
    ws.send(envelope('finalize_turn', 2, { turnId }, sessionId, turnId))
    await inbox.wait(msgs => msgs.some(m => m.type === 'turn_accepted'))
    expect(inbox.msgs.filter(m => m.type === 'final_transcript')).toHaveLength(1)
    expect(await repo.getTurns('dev', interview.id)).toHaveLength(1)
    ws.close()
    void port
  })

  it('accepts a simulated 90-second answer under the application safety cap', async () => {
    const { repo, interview, port } = await start()
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`)
    const inbox = attachInbox(ws)
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })
    ws.send(envelope('hello', 0, { interviewId: interview.id, token: 'dev' }))
    await inbox.wait(msgs => msgs.some(m => m.type === 'tts_end'))
    const turnId = (inbox.msgs.find(m => m.type === 'question')?.payload as { turnId: string }).turnId
    const sessionId = (inbox.msgs.find(m => m.type === 'session_ready')?.payload as { sessionId: string }).sessionId
    ws.send(envelope('playback_complete', 1, { turnId }, sessionId, turnId))
    await inbox.wait(msgs => msgs.some(m => m.type === 'state' && (m.payload as { state: string }).state === 'listening'))
    const ninetySeconds = Buffer.alloc(90 * 16000 * 2)
    for (let i = 0; i < ninetySeconds.length; i += 8192) {
      ws.send(ninetySeconds.subarray(i, i + 8192))
    }
    ws.send(envelope('finalize_turn', 2, { turnId }, sessionId, turnId))
    await inbox.wait(msgs => msgs.some(m => m.type === 'turn_accepted'))
    expect(inbox.msgs.some(m => m.type === 'error' && (m.payload as { code: string }).code === 'turn_too_long')).toBe(false)
    expect(await repo.getTurns('dev', interview.id)).toHaveLength(1)
    ws.close()
  })

  it('enforces the 180-second application safety limit with a controlled message', async () => {
    const { interview, port } = await start()
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`)
    const inbox = attachInbox(ws)
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })
    ws.send(envelope('hello', 0, { interviewId: interview.id, token: 'dev' }))
    await inbox.wait(msgs => msgs.some(m => m.type === 'tts_end'))
    const turnId = (inbox.msgs.find(m => m.type === 'question')?.payload as { turnId: string }).turnId
    const sessionId = (inbox.msgs.find(m => m.type === 'session_ready')?.payload as { sessionId: string }).sessionId
    ws.send(envelope('playback_complete', 1, { turnId }, sessionId, turnId))
    await inbox.wait(msgs => msgs.some(m => m.type === 'state' && (m.payload as { state: string }).state === 'listening'))
    const over = Buffer.alloc(VOICE_LIMITS.maxTurnAudioMs * 32 + 640)
    for (let i = 0; i < over.length; i += VOICE_LIMITS.maxBinaryBytes) {
      ws.send(over.subarray(i, i + VOICE_LIMITS.maxBinaryBytes))
    }
    const limited = await inbox.wait(msgs => msgs.some(m => m.type === 'error'))
    const err = limited.find(m => m.type === 'error')?.payload as { code: string; message: string }
    expect(err.code).toBe('turn_too_long')
    expect(err.message).toBe(TURN_TOO_LONG_MESSAGE)
    expect(err.message).not.toMatch(/30/)
    ws.close()
  })

  it('rejects empty speech and allows a retry on the same turn', async () => {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('dev')
    const interview = await repo.createInterview('dev', {
      role: 'Product Analyst',
      industry: 'Technology / SaaS',
      openingQuestion: OPENING_QUESTION,
    })
    const http = createServer()
    const gateway = createVoiceGateway({
      env: makeEnv(),
      repo,
      stt: createMockStt({ emitPartials: false }),
      tts: createMockTts({ chunkCount: 1 }),
      provider: {
        async generateFollowUp() {
          return 'What next?'
        },
        async generateReflection() {
          throw new Error('unused')
        },
      },
    })
    gateway.attach(http)
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
    servers.push({ close() { gateway.close(); http.close() } })
    const ws = new WebSocket(`ws://127.0.0.1:${(http.address() as { port: number }).port}/ws/voice`)
    const inbox = attachInbox(ws)
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })
    ws.send(envelope('hello', 0, { interviewId: interview.id, token: 'dev' }))
    await inbox.wait(msgs => msgs.some(m => m.type === 'tts_end'))
    const turnId = (inbox.msgs.find(m => m.type === 'question')?.payload as { turnId: string }).turnId
    const sessionId = (inbox.msgs.find(m => m.type === 'session_ready')?.payload as { sessionId: string }).sessionId
    ws.send(envelope('playback_complete', 1, { turnId }, sessionId, turnId))
    await inbox.wait(msgs => msgs.some(m => m.type === 'state' && (m.payload as { state: string }).state === 'listening'))
    ws.send(envelope('finalize_turn', 2, { turnId }, sessionId, turnId))
    await inbox.wait(msgs => msgs.some(m => m.type === 'turn_rejected'))
    expect(await repo.getTurns('dev', interview.id)).toHaveLength(0)
    ws.send(Buffer.alloc(640))
    ws.send(envelope('finalize_turn', 3, { turnId }, sessionId, turnId))
    await inbox.wait(msgs => msgs.some(m => m.type === 'turn_accepted'))
    expect(await repo.getTurns('dev', interview.id)).toHaveLength(1)
    ws.close()
  })

  it('surfaces a finalize timeout without advancing the interview', async () => {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('dev')
    const interview = await repo.createInterview('dev', {
      role: 'Product Analyst',
      industry: 'Technology / SaaS',
      openingQuestion: OPENING_QUESTION,
    })
    const http = createServer()
    const gateway = createVoiceGateway({
      env: makeEnv(),
      repo,
      stt: createMockStt({ hangOnFinalize: true, emitPartials: false }),
      tts: createMockTts({ chunkCount: 1 }),
      provider: null,
    })
    gateway.attach(http)
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
    servers.push({ close() { gateway.close(); http.close() } })
    const ws = new WebSocket(`ws://127.0.0.1:${(http.address() as { port: number }).port}/ws/voice`)
    const inbox = attachInbox(ws)
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })
    ws.send(envelope('hello', 0, { interviewId: interview.id, token: 'dev' }))
    await inbox.wait(msgs => msgs.some(m => m.type === 'tts_end'))
    const turnId = (inbox.msgs.find(m => m.type === 'question')?.payload as { turnId: string }).turnId
    const sessionId = (inbox.msgs.find(m => m.type === 'session_ready')?.payload as { sessionId: string }).sessionId
    ws.send(envelope('playback_complete', 1, { turnId }, sessionId, turnId))
    await inbox.wait(msgs => msgs.some(m => m.type === 'state' && (m.payload as { state: string }).state === 'listening'))
    ws.send(Buffer.alloc(640))
    ws.send(envelope('finalize_turn', 2, { turnId }, sessionId, turnId))
    const timed = await inbox.wait(msgs => msgs.some(m => m.type === 'error'))
    expect((timed.find(m => m.type === 'error')?.payload as { code: string }).code).toBe('stt_finalize_timeout')
    expect(await repo.getTurns('dev', interview.id)).toHaveLength(0)
    ws.close()
  })

  it('drops queued frames under backpressure without storing audio', async () => {
    let dropped = 0
    const stt = createMockStt({
      emitPartials: false,
      maxQueuedFrames: 2,
      onDrop: n => {
        dropped = n
      },
    })
    const stream = stt.startStream({ language: 'en-IN', sampleRate: 16000 })
    stream.sendAudio(Buffer.alloc(640))
    stream.sendAudio(Buffer.alloc(640))
    stream.sendAudio(Buffer.alloc(640))
    expect(dropped).toBeGreaterThan(0)
    const text = await stream.finalize()
    expect(text.length).toBeGreaterThan(0)
  })
})
