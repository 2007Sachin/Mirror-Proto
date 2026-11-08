/**
 * Voice smoke against in-process mock STT/TTS. Never prints env values or transcripts.
 */
import { createServer } from 'node:http'
import { WebSocket } from 'ws'
import { OPENING_QUESTION } from '../domain/questions.js'
import { createMemoryRepository } from '../repo/memory.js'
import { createVoiceGateway } from '../voice/gateway.js'
import { createMockStt } from '../voice/stt/mockStt.js'
import { createMockTts } from '../voice/tts/mockTts.js'
import { PROTOCOL_VERSION } from '../voice/protocol.js'
import { makeEnv } from '../__tests__/helpers.js'

function envelope(type: string, seq: number, payload: unknown, sessionId: string | null = null, turnId: string | null = null) {
  return JSON.stringify({ v: PROTOCOL_VERSION, type, sessionId, turnId, seq, ts: Date.now(), payload })
}

async function main() {
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
    stt: createMockStt({ finalText: 'I owned the research and simplified onboarding after the product update.', emitPartials: false }),
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
  const addr = http.address()
  const port = typeof addr === 'object' && addr ? addr.port : 0
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`)
  const msgs: { type: string; payload?: { turnId?: string; questionIndex?: number; state?: string } }[] = []
  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => resolve())
    ws.on('error', reject)
  })
  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      msgs.push({ type: 'tts_audio' })
      return
    }
    msgs.push(JSON.parse(String(data)))
  })
  const wait = (until: () => boolean, timeoutMs = 4000) =>
    new Promise<void>((resolve, reject) => {
      const start = Date.now()
      const tick = () => {
        if (until()) return resolve()
        if (Date.now() - start > timeoutMs) return reject(new Error(`timeout types=${msgs.map(m => m.type).join(',')}`))
        setTimeout(tick, 20)
      }
      tick()
    })

  let seq = 0
  ws.send(envelope('hello', seq++, { interviewId: interview.id, token: 'dev' }))
  for (let i = 0; i < 4; i++) {
    const ttsBefore = msgs.filter(m => m.type === 'tts_end').length
    await wait(() => msgs.some(m => m.type === 'question' && m.payload?.questionIndex === i))
    await wait(() => msgs.filter(m => m.type === 'tts_end').length > ttsBefore)
    const question = [...msgs].reverse().find(m => m.type === 'question' && m.payload?.questionIndex === i)
    const sessionId = msgs.find(m => m.type === 'session_ready')?.payload as { sessionId?: string } | undefined
    const turnId = question?.payload?.turnId
    ws.send(envelope('playback_complete', seq++, { turnId }, sessionId?.sessionId ?? null, turnId ?? null))
    const listenBefore = msgs.filter(m => m.type === 'state' && m.payload?.state === 'listening').length
    await wait(() => msgs.filter(m => m.type === 'state' && m.payload?.state === 'listening').length > listenBefore)
    ws.send(Buffer.alloc(640))
    ws.send(envelope('finalize_turn', seq++, { turnId }, sessionId?.sessionId ?? null, turnId ?? null))
  }
  await wait(() => msgs.some(m => m.type === 'state' && m.payload?.state === 'completed'))
  const turns = await repo.getTurns('dev', interview.id)
  if (turns.length !== 4 || turns.some(t => t.transcriptSource !== 'voice')) {
    throw new Error('voice smoke expected four voice turns')
  }
  ws.close()
  gateway.close()
  http.close()
  console.log('VOICE SMOKE PASS (mocked): four spoken turns, no live Sarvam')
}

main().catch(err => {
  console.error('VOICE SMOKE FAIL', err instanceof Error ? err.message : 'unknown')
  process.exit(1)
})
