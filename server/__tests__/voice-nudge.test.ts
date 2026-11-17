import { createServer } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { OPENING_QUESTION } from '../domain/questions.js'
import { createMemoryRepository } from '../repo/memory.js'
import { createMockTts } from '../voice/tts/mockTts.js'
import { testAuth } from '../auth/testAuth.js'
import { createVoiceGateway } from '../voice/gateway.js'
import { PROTOCOL_VERSION } from '../voice/protocol.js'
import { LINES, pickLine, isRepeatRequest } from '../voice/nudgeLines.js'
import type { SttProvider, SttStream } from '../voice/providers/types.js'
import { makeEnv } from './helpers.js'
import type { Env } from '../config.js'

let seq = 0
const envelope = (type: string, payload: unknown, sessionId: string | null = null, turnId: string | null = null) =>
  JSON.stringify({ v: PROTOCOL_VERSION, type, sessionId, turnId, seq: seq++, ts: Date.now(), payload })

type Msg = { type: string; payload?: Record<string, unknown> }
const settle = async () => {
  for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r))
}
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')

/** STT whose partials and final text the test controls. */
function controllableStt() {
  const ctl = { finalText: 'a plain answer', emit: ((t: string) => void t) as (t: string) => void }
  const provider: SttProvider = {
    startStream(): SttStream {
      let partial: ((t: string) => void) | null = null
      let closed = false
      ctl.emit = t => partial?.(t)
      return {
        sendAudio() {},
        onPartial(cb) { partial = cb },
        onFinal() {},
        onError() {},
        async finalize() { return ctl.finalText },
        abort() { closed = true },
        isClosed: () => closed,
        async whenReady() {},
      }
    },
  }
  return { provider, ctl }
}

describe('live-call nudges', () => {
  const closers: (() => void)[] = []
  afterEach(() => {
    vi.useRealTimers()
    while (closers.length) closers.pop()?.()
  })

  async function boot(envOver: Partial<Env> = {}) {
    const repo = createMemoryRepository()
    await repo.ensureWorkspace('dev')
    const interview = await repo.createInterview('dev', { role: 'Product Analyst', industry: 'Technology / SaaS', openingQuestion: OPENING_QUESTION })
    const logs: string[] = []
    const { provider, ctl } = controllableStt()
    const http = createServer()
    const gateway = createVoiceGateway({
      env: makeEnv({ voiceNudge: 'on', ...envOver }),
      auth: testAuth(),
      repoFor: () => repo,
      stt: provider,
      tts: createMockTts({ chunkCount: 1 }),
      provider: {
        async generateFollowUp() { return 'What decision did you make?' },
        async generateReflection() { throw new Error('unused') },
      },
      log: m => logs.push(m),
    })
    gateway.attach(http)
    await new Promise<void>(r => http.listen(0, '127.0.0.1', r))
    const port = (http.address() as { port: number }).port
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`, { headers: { 'x-test-user': 'dev', origin: 'http://localhost:3000' } })
    const msgs: Msg[] = []
    ws.on('message', (d, bin) => {
      if (bin) msgs.push({ type: 'tts_audio' })
      else msgs.push(JSON.parse(String(d)) as Msg)
    })
    closers.push(() => { ws.close(); gateway.close(); http.close() })
    await new Promise<void>((res, rej) => { ws.on('open', () => res()); ws.on('error', rej) })
    ws.send(envelope('hello', { interviewId: interview.id, token: 'dev' }))
    const until = async (fn: () => boolean) => { for (let i = 0; i < 2000 && !fn(); i++) await new Promise(r => setImmediate(r)) }
    await until(() => msgs.some(m => m.type === 'tts_end'))
    const sessionId = (msgs.find(m => m.type === 'session_ready')!.payload as { sessionId: string }).sessionId
    const session = () => gateway.sessionManager.get(sessionId)!
    const count = (t: string) => msgs.filter(m => m.type === t).length
    const lastState = () => [...msgs].reverse().find(m => m.type === 'state')?.payload?.state
    /** Client finished playing the current turn's speech. */
    const playbackDone = async () => {
      ws.send(envelope('playback_complete', { turnId: session().currentTurnId }, sessionId, session().currentTurnId))
      await settle()
    }
    const tick = async (ms: number) => { await vi.advanceTimersByTimeAsync(ms); await settle() }
    return { repo, interview, ws, msgs, logs, ctl, session, count, lastState, playbackDone, tick, until, sessionId, gateway }
  }

  /** Go fake-timer after connect so only the nudge clock is faked; then the question ends. */
  async function listening(b: Awaited<ReturnType<typeof boot>>) {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    await b.playbackDone()
    expect(b.lastState()).toBe('listening')
  }

  it('fires once after 15 s on the first question, then a second line at 25 s, and no third', async () => {
    const b = await boot()
    await listening(b)
    await b.tick(14_900)
    expect(b.count('nudge')).toBe(0)
    await b.tick(200)
    expect(b.count('nudge')).toBe(1)
    const n = b.msgs.find(m => m.type === 'nudge')!
    expect(n.payload).toMatchObject({ reason: 'silence_first', turnId: b.session().currentTurnId })
    expect(LINES.first).toContain(n.payload!.text as string)
    await b.until(() => b.count('tts_end') === 2)
    expect(b.count('tts_start')).toBe(2)
    await b.playbackDone() // return to listening; the silence clock keeps its base
    await b.tick(9_000)
    expect(b.count('nudge')).toBe(1)
    await b.tick(1_500)
    expect(b.count('nudge')).toBe(2)
    expect(b.msgs.filter(m => m.type === 'nudge')[1].payload!.reason).toBe('silence_second')
    await b.playbackDone()
    await b.tick(120_000)
    expect(b.count('nudge')).toBe(2)
  })

  it('uses 10 s on later questions', async () => {
    const b = await boot()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    await b.playbackDone()
    b.ws.send(Buffer.alloc(640))
    b.ws.send(envelope('finalize_turn', { turnId: b.session().currentTurnId }, b.sessionId, b.session().currentTurnId))
    await b.until(() => b.session().questionIndex === 1 && b.count('tts_end') === 2)
    await b.playbackDone()
    expect(b.session().questionIndex).toBe(1)
    await b.tick(9_900)
    expect(b.count('nudge')).toBe(0)
    await b.tick(200)
    expect(b.count('nudge')).toBe(1)
  })

  it('waits for the threshold after the last new words, and not within 2 s of them', async () => {
    const b = await boot({ voiceNudgeFirstQuestionMs: 10_000 })
    await listening(b)
    await b.tick(8_000)
    b.ctl.emit('one two three')
    await b.tick(9_900) // 17.9 s total: less than 10 s since the words
    expect(b.count('nudge')).toBe(0)
    b.ctl.emit('one two three') // same words: does not extend the clock
    await b.tick(300)
    expect(b.count('nudge')).toBe(1)
  })

  it('never nudges while the question is still being spoken', async () => {
    const b = await boot()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    await b.tick(120_000) // no playback_complete yet: still speaking
    expect(b.count('nudge')).toBe(0)
    expect(b.session().silenceTimer).toBeNull()
  })

  it('is cleared by interrupt, mute, finalize and close', async () => {
    const b = await boot()
    await listening(b)
    expect(b.session().silenceTimer).not.toBeNull()
    b.ws.send(envelope('interrupt', null, b.sessionId, b.session().currentTurnId))
    await settle()
    expect(b.session().silenceTimer).toBeNull()
    b.ws.send(envelope('mute', { muted: false }, b.sessionId))
    await settle()
    expect(b.session().silenceTimer).not.toBeNull()
    b.ws.send(envelope('mute', { muted: true }, b.sessionId))
    await settle()
    expect(b.session().silenceTimer).toBeNull()
    await b.tick(60_000)
    expect(b.count('nudge')).toBe(0)
    b.ws.send(envelope('mute', { muted: false }, b.sessionId))
    await settle()
    b.ws.send(Buffer.alloc(640))
    b.ws.send(envelope('finalize_turn', { turnId: b.session().currentTurnId }, b.sessionId, b.session().currentTurnId))
    await settle()
    expect(b.session().silenceTimer).toBeNull()
    b.ws.close()
    await settle()
    expect(b.session().silenceTimer).toBeNull()
  })

  it('mute aborts a speaking nudge and sends no tts_end for it', async () => {
    const b = await boot()
    await listening(b)
    await b.tick(15_100)
    expect(b.count('nudge')).toBe(1)
    // the nudge is speaking now (or just finished); mute must leave the session listening and unscheduled
    b.ws.send(envelope('mute', { muted: true }, b.sessionId))
    await settle()
    expect(b.session().silenceTimer).toBeNull()
    expect(b.lastState()).toBe('listening')
  })

  it('shadow mode only logs; off does nothing', async () => {
    const s = await boot({ voiceNudge: 'shadow' })
    await listening(s)
    await s.tick(16_000)
    expect(s.count('nudge')).toBe(0)
    expect(s.count('tts_start')).toBe(1)
    const line = s.logs.find(l => l.includes('nudge_shadow'))!
    expect(JSON.parse(line)).toMatchObject({ event: 'nudge_shadow', reason: 'silence_first', turnId: s.session().currentTurnId })
    expect(JSON.parse(line).silenceMs).toBeGreaterThanOrEqual(15_000)
    vi.useRealTimers()
    const o = await boot({ voiceNudge: 'off' })
    await listening(o)
    await o.tick(120_000)
    expect(o.count('nudge')).toBe(0)
    expect(o.logs.some(l => l.includes('nudge_'))).toBe(false)
    expect(o.session().silenceTimer).toBeNull()
  })

  it('offers to move on once at 250 words, after a 2 s pause, and never cuts the answer', async () => {
    const b = await boot()
    await listening(b)
    b.ctl.emit(words(250))
    await b.tick(1_900)
    expect(b.count('ramble_hint')).toBe(0)
    await b.tick(200)
    expect(b.count('ramble_hint')).toBe(1)
    const h = b.msgs.find(m => m.type === 'ramble_hint')!
    expect(LINES.ramble).toContain(h.payload!.text as string)
    await b.playbackDone()
    b.ctl.emit(words(260))
    await b.tick(5_000)
    expect(b.count('ramble_hint')).toBe(1)
    expect(b.count('final_transcript')).toBe(0)
    expect((await b.repo.getTurns('dev', b.interview.id)).length).toBe(0)
  })

  it('offers to move on once at 90 s of one turn', async () => {
    const b = await boot()
    await listening(b)
    for (let i = 0; i < 11; i++) {
      b.ctl.emit(words(3 + i))
      await b.tick(8_000)
    }
    expect(b.count('ramble_hint')).toBe(0)
    b.ctl.emit(words(20))
    await b.tick(2_100)
    expect(b.count('ramble_hint')).toBe(1)
    expect(b.count('nudge')).toBe(0)
  })

  it('never finalizes the turn by itself', async () => {
    const b = await boot()
    await listening(b)
    b.ctl.emit(words(300))
    await b.tick(300_000)
    expect(b.msgs.some(m => m.type === 'final_transcript' || m.type === 'turn_accepted')).toBe(false)
    expect((await b.repo.getTurns('dev', b.interview.id)).length).toBe(0)
  })

  it('"repeat that" re-speaks the question, saves no turn and keeps the index', async () => {
    const b = await boot()
    await b.playbackDone()
    b.ctl.finalText = 'Can you repeat that?'
    b.ws.send(Buffer.alloc(640))
    b.ws.send(envelope('finalize_turn', { turnId: b.session().currentTurnId }, b.sessionId, b.session().currentTurnId))
    await b.until(() => b.count('question') === 2 && b.count('tts_end') === 2)
    expect(b.count('final_transcript')).toBe(0)
    expect(b.session().questionIndex).toBe(0)
    expect((await b.repo.getTurns('dev', b.interview.id)).length).toBe(0)
    expect(b.msgs.filter(m => m.type === 'question')[1].payload!.text).toBe(OPENING_QUESTION)
  })

  it('a real answer that contains "repeat" is saved as an answer', async () => {
    const b = await boot()
    await b.playbackDone()
    b.ctl.finalText = 'I would repeat the experiment several times to confirm that the result held up in production'
    b.ws.send(Buffer.alloc(640))
    b.ws.send(envelope('finalize_turn', { turnId: b.session().currentTurnId }, b.sessionId, b.session().currentTurnId))
    await b.until(() => b.count('turn_accepted') === 1)
    expect((await b.repo.getTurns('dev', b.interview.id)).length).toBe(1)
    expect(isRepeatRequest('I would repeat the experiment several times to confirm that the result held up')).toBe(false)
    expect(isRepeatRequest('pardon?')).toBe(true)
    expect(isRepeatRequest('Say that again please')).toBe(true)
  })
})

describe('scripted lines', () => {
  it('never repeat a variant back to back', () => {
    const used = new Set<string>()
    for (const kind of Object.keys(LINES) as (keyof typeof LINES)[]) {
      let prev = ''
      for (let i = 0; i < 12; i++) {
        const l = pickLine(kind, used)
        expect(l).not.toBe(prev)
        prev = l
      }
    }
  })
})
