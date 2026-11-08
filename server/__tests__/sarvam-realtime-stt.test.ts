import { createServer } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket, WebSocketServer } from 'ws'
import { createSarvamRealtimeStt } from '../voice/stt/sarvamRealtimeStt.js'
import { createSarvamStt } from '../voice/stt/sarvamStt.js'
import { withRestFallback } from '../voice/stt/createStt.js'
import { createMockStt } from '../voice/stt/mockStt.js'

describe('createSarvamRealtimeStt', () => {
  const servers: { close: () => void }[] = []
  afterEach(() => {
    while (servers.length) servers.pop()?.close()
  })

  async function mockProvider(handler: (ws: WebSocket) => void) {
    const http = createServer()
    const wss = new WebSocketServer({ server: http })
    wss.on('connection', handler)
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
    const port = (http.address() as { port: number }).port
    servers.push({
      close() {
        wss.close()
        http.close()
      },
    })
    return `ws://127.0.0.1:${port}/speech-to-text-realtime/ws`
  }

  it('streams partials, flushes one final, and ignores a second finalize', async () => {
    const url = await mockProvider(ws => {
      ws.send(JSON.stringify({ event: 'session.begin' }))
      ws.on('message', raw => {
        const msg = JSON.parse(String(raw)) as { event: string }
        if (msg.event === 'audio_input') {
          ws.send(JSON.stringify({ event: 'transcript.partial', text: 'hello' }))
        }
        if (msg.event === 'flush') {
          ws.send(JSON.stringify({ event: 'transcript.final', text: 'hello there' }))
        }
      })
    })
    const partials: string[] = []
    const finals: string[] = []
    const stt = createSarvamRealtimeStt({
      apiKey: 'test-key',
      realtimeUrl: url,
      model: 'saaras:v3-realtime',
      language: 'en-IN',
      finalizeTimeoutMs: 2000,
    })
    const stream = stt.startStream({ language: 'en-IN', sampleRate: 16000 })
    stream.onPartial(text => partials.push(text))
    stream.onFinal(text => finals.push(text))
    await new Promise(r => setTimeout(r, 50))
    stream.sendAudio(Buffer.alloc(640, 1))
    await new Promise(r => setTimeout(r, 50))
    const text = await stream.finalize()
    expect(text).toBe('hello there')
    expect(partials.length).toBeGreaterThan(0)
    expect(finals).toEqual(['hello there'])
    await expect(stream.finalize()).rejects.toThrow('already_finalized')
    stream.sendAudio(Buffer.alloc(640, 2))
    const second = await stream.finalize()
    expect(second).toBe('hello there')
    stream.abort()
  })

  it('marks the stream closed after the provider disconnects', async () => {
    const url = await mockProvider(ws => {
      ws.send(JSON.stringify({ event: 'session.begin' }))
      ws.on('message', raw => {
        const msg = JSON.parse(String(raw)) as { event: string }
        if (msg.event === 'flush') {
          ws.send(JSON.stringify({ event: 'transcript.final', text: 'done' }))
          ws.close()
        }
      })
    })
    const errors: string[] = []
    const stream = createSarvamRealtimeStt({
      apiKey: 'test-key',
      realtimeUrl: url,
      model: 'saaras:v3-realtime',
      language: 'en-IN',
      finalizeTimeoutMs: 2000,
    }).startStream({ language: 'en-IN', sampleRate: 16000 })
    stream.onError(err => errors.push(err.message))
    await new Promise(r => setTimeout(r, 40))
    stream.sendAudio(Buffer.alloc(640, 1))
    expect(await stream.finalize()).toBe('done')
    await new Promise(r => setTimeout(r, 40))
    expect(stream.isClosed()).toBe(true)
    expect(errors).toEqual([])
  })

  it('times out when the provider never finals', async () => {
    const url = await mockProvider(ws => {
      ws.send(JSON.stringify({ event: 'session.begin' }))
    })
    const stream = createSarvamRealtimeStt({
      apiKey: 'test-key',
      realtimeUrl: url,
      model: 'saaras:v3-realtime',
      language: 'en-IN',
      finalizeTimeoutMs: 40,
    }).startStream({ language: 'en-IN', sampleRate: 16000 })
    stream.sendAudio(Buffer.alloc(640))
    await expect(stream.finalize()).rejects.toThrow('stt_finalize_timeout')
    stream.abort()
  })

})

describe('REST fallback wrapper', () => {
  it('uses REST when realtime connect fails before audio', async () => {
    const rest = createMockStt({ finalText: 'rest fallback answer', emitPartials: false })
    const primary = createMockStt({ failConnect: true })
    const wrapped = withRestFallback(primary, rest)
    const stream = wrapped.startStream({ language: 'en-IN', sampleRate: 16000 })
    await new Promise(r => setTimeout(r, 20))
    stream.sendAudio(Buffer.alloc(640))
    const text = await stream.finalize()
    expect(text).toBe('rest fallback answer')
  })

  it('REST adapter still one-shots after finalize', async () => {
    const stream = createSarvamStt({
      apiKey: 'k',
      baseUrl: 'https://example.invalid',
      fetchImpl: (async () => new Response(JSON.stringify({ transcript: 'short' }), { status: 200 })) as unknown as typeof fetch,
    }).startStream({ language: 'en-IN', sampleRate: 16000 })
    stream.sendAudio(Buffer.alloc(640))
    expect(await stream.finalize()).toBe('short')
    expect(stream.isClosed()).toBe(true)
  })
})
