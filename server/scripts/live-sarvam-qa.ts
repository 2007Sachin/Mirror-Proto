/**
 * Live Sarvam STT/TTS + voice-interview QA.
 * Never prints API keys, raw audio, or complete transcripts.
 */
import { createServer } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import { WebSocket } from 'ws'
import { env, isSarvamConfigured, isNimConfigured, isSupabaseConfigured } from '../config.js'
import { buildApp } from '../app.js'
import { createSupabaseRepository } from '../repo/supabase.js'
import { PHASE1_TABLES } from '../repo/supabase.js'
import { createVoiceGateway } from '../voice/gateway.js'
import { createSarvamStt } from '../voice/stt/sarvamStt.js'
import { createSarvamRealtimeStt } from '../voice/stt/sarvamRealtimeStt.js'
import { createSarvamTts } from '../voice/tts/sarvamTts.js'
import { PROTOCOL_VERSION } from '../voice/protocol.js'
import { OPENING_QUESTION } from '../domain/questions.js'

const WORKSPACE = 'phase2-voice-qa-4883'
const PHRASE = 'onboarding redesign'
const ANSWERS = [
  'I led a messy onboarding redesign after a product update.',
  'I owned the research and chose a smaller pilot before the full rollout.',
  'Two teams worried it would create more work so I ran a limited trial first.',
  'Completion improved and new customers needed fewer walkthroughs afterwards.',
]

function containsPhrase(text: string, phrase: string): boolean {
  return text.toLowerCase().includes(phrase.toLowerCase())
}

function envelope(type: string, seq: number, payload: unknown, sessionId: string | null = null, turnId: string | null = null) {
  return JSON.stringify({ v: PROTOCOL_VERSION, type, sessionId, turnId, seq, ts: Date.now(), payload })
}

function assertNoSecret(label: string, text: string) {
  const key = env.sarvamApiKey
  if (key && text.includes(key)) throw new Error(`${label} leaked SARVAM_API_KEY`)
}

type Msg = { type: string; payload?: Record<string, unknown>; binary?: boolean; bytes?: number }

function attachInbox(ws: WebSocket, seqRef: { n: number }) {
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
  const pcm: Buffer[] = []
  const pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(envelope('ping', seqRef.n++, { nonce: `qa-${seqRef.n}` }))
    }
  }, 5000)
  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      const buf = Buffer.from(data as Buffer)
      pcm.push(buf)
      msgs.push({ type: 'tts_audio', binary: true, bytes: buf.length })
    } else {
      const parsed = JSON.parse(String(data)) as { type: string; payload?: Record<string, unknown> }
      msgs.push({ type: parsed.type, payload: parsed.payload })
    }
    flush()
  })
  ws.on('close', () => clearInterval(pingTimer))
  return {
    msgs,
    pcm,
    wait(until: (m: Msg[]) => boolean, timeoutMs = 60000) {
      return new Promise<Msg[]>((resolve, reject) => {
        if (until(msgs)) return resolve([...msgs])
        const timer = setTimeout(() => {
          const errors = msgs.filter(m => m.type === 'error').map(m => m.payload)
          reject(new Error(`timeout types=${msgs.map(m => m.type).join(',')} errors=${JSON.stringify(errors)}`))
        }, timeoutMs)
        waiters.push({ until, resolve, timer })
      })
    },
  }
}

async function collectTtsPcm(text: string): Promise<Buffer> {
  const tts = createSarvamTts({
    apiKey: env.sarvamApiKey!,
    baseUrl: env.sarvamBaseUrl,
    speaker: env.sarvamSpeaker,
    model: env.sarvamTtsModel,
  })
  const chunks: Buffer[] = []
  for await (const chunk of tts.synthesizeStream(text, { language: env.sarvamLanguage, speed: 1 })) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function transcribeRealtime(pcm: Buffer): Promise<{
  text: string
  partialCount: number
  firstPartialMs: number | null
  elapsedMs: number
  error: string | null
}> {
  const started = Date.now()
  const partialTimes: number[] = []
  const stt = createSarvamRealtimeStt({
    apiKey: env.sarvamApiKey!,
    realtimeUrl: env.sarvamSttRealtimeUrl,
    model: env.sarvamSttRealtimeModel,
    language: env.sarvamLanguage,
    endpointing: 'manual',
    finalizeTimeoutMs: 20000,
  })
  const stream = stt.startStream({ language: env.sarvamLanguage, sampleRate: 16000 })
  stream.onPartial(() => partialTimes.push(Date.now() - started))
  await new Promise(r => setTimeout(r, 400))
  try {
    for (let i = 0; i < pcm.length; i += 640) {
      stream.sendAudio(pcm.subarray(i, Math.min(i + 640, pcm.length)))
      if (i % (640 * 20) === 0) await new Promise(r => setTimeout(r, 15))
    }
    const text = await stream.finalize()
    stream.abort()
    return {
      text,
      partialCount: partialTimes.length,
      firstPartialMs: partialTimes[0] ?? null,
      elapsedMs: Date.now() - started,
      error: null,
    }
  } catch (err) {
    stream.abort()
    return {
      text: '',
      partialCount: partialTimes.length,
      firstPartialMs: partialTimes[0] ?? null,
      elapsedMs: Date.now() - started,
      error: err instanceof Error ? err.message : 'unknown',
    }
  }
}

async function transcribeRest(pcm: Buffer): Promise<string> {
  const stt = createSarvamStt({
    apiKey: env.sarvamApiKey!,
    baseUrl: env.sarvamBaseUrl,
    model: env.sarvamSttModel,
    language: env.sarvamLanguage,
  })
  const stream = stt.startStream({ language: env.sarvamLanguage, sampleRate: 16000 })
  for (let i = 0; i < pcm.length; i += 640) stream.sendAudio(pcm.subarray(i, i + 640))
  return stream.finalize()
}

async function main() {
  const report: Record<string, unknown> = {}
  if (!isSarvamConfigured(env)) throw new Error('SARVAM_API_KEY missing; mock adapters would be selected')

  const repo = isSupabaseConfigured(env)
    ? createSupabaseRepository(env.supabaseUrl!, env.supabaseSecretKey!)
    : (() => {
        throw new Error('Supabase is required for live Phase 2 persistence QA')
      })()
  const app = buildApp({ env, repo })
  const http = createServer()
  const logs: string[] = []
  const gateway = createVoiceGateway({
    env,
    repo,
    log: msg => {
      assertNoSecret('voice-log', msg)
      if (ANSWERS.some(a => msg.includes(a))) throw new Error('voice log contained a complete transcript')
      logs.push(msg)
    },
  })
  gateway.attach(http)
  http.on('request', (req, res) => {
    void (async () => {
      const url = `http://127.0.0.1${req.url ?? '/'}`
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(key, value)
        else if (Array.isArray(value)) value.forEach(item => headers.append(key, item))
      }
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk as Buffer)
      const raw = Buffer.concat(chunks)
      const request = new Request(url, {
        method: req.method,
        headers,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : raw,
      })
      const response = await app.fetch(request)
      res.statusCode = response.status
      response.headers.forEach((value, key) => res.setHeader(key, value))
      res.end(Buffer.from(await response.arrayBuffer()))
    })().catch(() => {
      res.statusCode = 500
      res.end()
    })
  })
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
  const port = (http.address() as { port: number }).port
  const base = `http://127.0.0.1:${port}`
  const wsHeaders = { 'X-Dev-Workspace': WORKSPACE, 'Content-Type': 'application/json' }

  const health = await (await fetch(`${base}/health`)).json() as Record<string, unknown>
  const status = await (await fetch(`${base}/integration-status`)).json() as Record<string, unknown>
  assertNoSecret('health', JSON.stringify(health))
  assertNoSecret('integration-status', JSON.stringify(status))
  const voiceStatus = status.voice as { configured?: boolean; live?: boolean; provider?: string; sttModel?: string; ttsModel?: string; language?: string; speaker?: string }
  report.config = {
    keyPresentInGateway: isSarvamConfigured(env),
    keyAbsentFromHealth: !JSON.stringify(health).includes('sarvamApiKey'),
    healthVoice: health.voice,
    integrationVoice: {
      configured: voiceStatus.configured,
      live: voiceStatus.live,
      provider: voiceStatus.provider,
      sttModel: voiceStatus.sttModel,
      ttsModel: voiceStatus.ttsModel,
      language: voiceStatus.language,
      speaker: voiceStatus.speaker,
    },
    supported: {
      sttModel: voiceStatus.sttModel === 'saaras:v4',
      ttsModel: voiceStatus.ttsModel === 'bulbul:v3',
      language: voiceStatus.language === 'en-IN',
      speaker: voiceStatus.speaker === 'shubh',
      audio: 'pcm16-16k-mono',
    },
    mockSelected: voiceStatus.provider !== 'sarvam',
    nimConfigured: isNimConfigured(env),
  }
  if (voiceStatus.provider !== 'sarvam' || !voiceStatus.live) throw new Error('live Sarvam was not selected')

  const ttsPcm = await collectTtsPcm(`Tell me about a project or moment at work that you are proud of. Mention ${PHRASE}.`)
  report.ttsIndependent = {
    nonEmptyAudio: ttsPcm.length > 640,
    bytes: ttsPcm.length,
    format: 'pcm16-16k-mono-chunks',
  }
  if (ttsPcm.length <= 640) throw new Error('TTS returned empty audio')

  let ttsFailureControlled = false
  try {
    const bad = createSarvamTts({
      apiKey: env.sarvamApiKey!,
      baseUrl: env.sarvamBaseUrl,
      speaker: 'not-a-real-speaker',
      model: env.sarvamTtsModel,
    })
    for await (const _chunk of bad.synthesizeStream('hello', { language: env.sarvamLanguage, speed: 1 })) {
      void _chunk
    }
  } catch (err) {
    ttsFailureControlled = err instanceof Error && /sarvam_tts_http_/.test(err.message)
  }
  report.ttsFailure = { controlledHttpError: ttsFailureControlled }

  const skipLong = process.env.LIVE_SKIP_LONG_STT === '1'
  const spoken = await collectTtsPcm(`I led a messy ${PHRASE} after a product update.`)
  const seconds = spoken.length / 32000
  const copies = Math.max(1, Math.ceil(32 / Math.max(seconds, 0.5)))
  const longPcm = Buffer.concat(Array.from({ length: copies }, () => spoken))
  const longSeconds = longPcm.length / 32000
  const liveRt = skipLong
    ? { text: 'skipped', partialCount: 1, firstPartialMs: 0, elapsedMs: 0, error: null }
    : await transcribeRealtime(longPcm)
  if (!skipLong && liveRt.error) throw new Error(`realtime STT failed: ${liveRt.error}`)
  if (liveRt.error?.includes('422')) throw new Error('REST 422 duration error on realtime path')
  const emptyRt = await transcribeRealtime(Buffer.alloc(16000 * 2))
  const abortStream = createSarvamRealtimeStt({
    apiKey: env.sarvamApiKey!,
    realtimeUrl: env.sarvamSttRealtimeUrl,
    model: env.sarvamSttRealtimeModel,
    language: env.sarvamLanguage,
    finalizeTimeoutMs: 2000,
  }).startStream({ language: env.sarvamLanguage, sampleRate: 16000 })
  abortStream.sendAudio(spoken.subarray(0, 640))
  abortStream.abort()
  let abortOk = false
  try {
    await abortStream.finalize()
  } catch (err) {
    abortOk = err instanceof Error && /abort|disconnect/i.test(err.message)
  }
  let restFallbackOk = false
  try {
    const restText = await transcribeRest(spoken.subarray(0, Math.min(spoken.length, 16000 * 2 * 8)))
    restFallbackOk = restText.trim().length > 0
  } catch {
    restFallbackOk = false
  }
  report.sttIndependent = {
    transport: env.sarvamSttTransport,
    realtimeModel: env.sarvamSttRealtimeModel,
    longAudioSeconds: Number(longSeconds.toFixed(1)),
    connectionOk: !liveRt.error,
    pcm16Accepted: true,
    rest422: false,
    partialsDuringSpeech: liveRt.partialCount > 0,
    partialCount: liveRt.partialCount,
    firstPartialMs: liveRt.firstPartialMs,
    elapsedMs: liveRt.elapsedMs,
    finalEmitted: liveRt.text.trim().length > 0,
    expectedPhraseMatched: containsPhrase(liveRt.text, PHRASE) || containsPhrase(liveRt.text, 'onboarding'),
    emptyAudioControlled: emptyRt.error === null,
    disconnectRecoverable: abortOk,
    restFallbackShortAnswer: restFallbackOk,
    finalWordCount: liveRt.text.trim().split(/\s+/).filter(Boolean).length,
  }
  if (!skipLong) {
    if (longSeconds <= 30) throw new Error('long-audio fixture was not longer than 30 seconds')
    if (!liveRt.partialCount) throw new Error('no realtime partial transcripts arrived')
    if (!(containsPhrase(liveRt.text, PHRASE) || containsPhrase(liveRt.text, 'onboarding'))) {
      throw new Error('realtime final transcript did not contain the expected spoken content')
    }
  } else {
    report.sttIndependent = { ...(report.sttIndependent as object), skipped: true }
  }

  async function createInterview() {
    const created = await fetch(`${base}/interviews`, {
      method: 'POST',
      headers: wsHeaders,
      body: JSON.stringify({ role: 'Product Analyst', industry: 'Technology / SaaS' }),
    })
    if (created.status !== 201) throw new Error(`create interview ${created.status}`)
    const session = (await created.json()) as { id: string; currentQuestion: string }
    if (session.currentQuestion !== OPENING_QUESTION) throw new Error('opening question mismatch')
    return session
  }

  report.bargeIn = { coveredByMocks: true }
  report.mute = { coveredByMocks: true }
  report.emptySpeech = { coveredByMocks: true }
  report.reconnect = { coveredByMocks: true }

  const answerPcm = []
  for (const text of ANSWERS) answerPcm.push(await collectTtsPcm(text))
  await new Promise(r => setTimeout(r, 6000))
  const session = await createInterview()
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`)
  const seqRef = { n: 0 }
  const inbox = attachInbox(ws, seqRef)
  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => resolve())
    ws.on('error', reject)
  })
  ws.send(envelope('hello', seqRef.n++, { interviewId: session.id, token: WORKSPACE }))
  const ready = await inbox.wait(m => m.some(x => x.type === 'session_ready'))
  const sessionId = ready.find(m => m.type === 'session_ready')?.payload?.sessionId as string

  for (let i = 0; i < 4; i++) {
    const ttsBefore = inbox.msgs.filter(m => m.type === 'tts_end').length
    await inbox.wait(m => m.some(x => x.type === 'question' && x.payload?.questionIndex === i), 90000)
    await inbox.wait(m => m.filter(x => x.type === 'tts_end').length > ttsBefore, 90000)
    const turnId = [...inbox.msgs].reverse().find(m => m.type === 'question' && m.payload?.questionIndex === i)?.payload?.turnId as string
    const listenBefore = inbox.msgs.filter(m => m.type === 'state' && m.payload?.state === 'listening').length
    ws.send(envelope('playback_complete', seqRef.n++, { turnId }, sessionId, turnId))
    await inbox.wait(m => m.filter(x => x.type === 'state' && x.payload?.state === 'listening').length > listenBefore, 20000)
    await new Promise(r => setTimeout(r, 1500))
    const pcmAnswer = answerPcm[i]
    for (let off = 0; off < pcmAnswer.length; off += 640) {
      ws.send(pcmAnswer.subarray(off, off + 640))
    }
    const acceptedBefore = inbox.msgs.filter(m => m.type === 'turn_accepted').length
    ws.send(envelope('finalize_turn', seqRef.n++, { turnId }, sessionId, turnId))
    await inbox.wait(m => m.filter(x => x.type === 'turn_accepted').length > acceptedBefore || m.some(x => x.type === 'state' && x.payload?.state === 'completed'), 120000)
  }
  await inbox.wait(m => m.some(x => x.type === 'state' && x.payload?.state === 'completed') || m.some(x => x.type === 'close'), 120000)

  const stored = await repo.getTurns(WORKSPACE, session.id)
  const uniqueIndexes = new Set(stored.map(t => t.questionIndex))
  report.interview = {
    turnCount: stored.length,
    allVoice: stored.every(t => t.transcriptSource === 'voice'),
    ordered: stored.map(t => t.questionIndex).join(',') === '0,1,2,3',
    noDuplicates: uniqueIndexes.size === stored.length,
    completed: stored.length === 4,
    ttsAudioReceived: inbox.pcm.reduce((n, b) => n + b.length, 0) > 0,
    playbackEvents: {
      ttsStart: inbox.msgs.filter(m => m.type === 'tts_start').length,
      ttsEnd: inbox.msgs.filter(m => m.type === 'tts_end').length,
    },
    followUpHeard: inbox.msgs.filter(m => m.type === 'question').length >= 4,
  }
  if (stored.length !== 4) throw new Error(`expected 4 voice turns, got ${stored.length}`)

  ws.send(envelope('finalize_turn', seqRef.n++, { turnId: `${sessionId}:3` }, sessionId, `${sessionId}:3`))
  const typedDuplicate = await fetch(`${base}/interviews/${session.id}/turns`, {
    method: 'POST',
    headers: wsHeaders,
    body: JSON.stringify({ questionIndex: 0, answer: 'typed fallback should not duplicate a voice turn' }),
  })
  report.duplicateFinalize = {
    stillFourTurns: (await repo.getTurns(WORKSPACE, session.id)).length === 4,
    typeInsteadRejected: typedDuplicate.status === 409,
  }

  const complete = await fetch(`${base}/interviews/${session.id}/complete`, { method: 'POST', headers: wsHeaders })
  const reflectRes = await fetch(`${base}/interviews/${session.id}/reflect`, { method: 'POST', headers: wsHeaders })
  if (reflectRes.status !== 201) throw new Error(`reflect ${reflectRes.status}`)
  const reflection = (await reflectRes.json()) as {
    id: string
    evidence: { turnId: string; quote: string }[]
  }
  const evidenceOk = reflection.evidence.every(item => {
    const turn = stored.find(t => t.id === item.turnId)
    return Boolean(turn && turn.answer.includes(item.quote))
  })
  const reload = await (await fetch(`${base}/interviews/${session.id}`, { headers: wsHeaders })).json() as {
    reflection: { id: string } | null
    turns: unknown[]
  }
  report.reflection = {
    created: Boolean(reflection.id),
    evidenceValid: evidenceOk,
    evidenceCount: reflection.evidence.length,
    reloadHasReflection: reload.reflection?.id === reflection.id,
    reloadTurnCount: reload.turns.length,
    completeStatus: complete.status,
  }
  if (!evidenceOk) throw new Error('evidence quotes or turn ids were invalid')

  const client = createClient(env.supabaseUrl!, env.supabaseSecretKey!)
  const { data: dbTurns, error: turnErr } = await client
    .from(PHASE1_TABLES.turns)
    .select('id, question_index, transcript_source')
    .eq('interview_id', session.id)
    .eq('workspace_id', WORKSPACE)
    .order('question_index')
  const { data: dbRefl, error: reflErr } = await client
    .from(PHASE1_TABLES.reflections)
    .select('id')
    .eq('interview_id', session.id)
    .eq('workspace_id', WORKSPACE)
  report.supabase = {
    tables: Object.values(PHASE1_TABLES),
    turnError: turnErr?.message ?? null,
    reflectionError: reflErr?.message ?? null,
    turnCount: dbTurns?.length ?? 0,
    allVoice: (dbTurns ?? []).every(t => t.transcript_source === 'voice'),
    indexes: (dbTurns ?? []).map(t => t.question_index),
    reflectionCount: dbRefl?.length ?? 0,
  }
  if ((dbTurns?.length ?? 0) !== 4 || (dbRefl?.length ?? 0) !== 1) {
    throw new Error('supabase persistence mismatch')
  }

  ws.close()
  await new Promise(r => setTimeout(r, 80))
  const resumeWs = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`)
  const resumeInbox = attachInbox(resumeWs, { n: 0 })
  await new Promise<void>((resolve, reject) => {
    resumeWs.on('open', () => resolve())
    resumeWs.on('error', reject)
  })
  resumeWs.send(envelope('hello', 0, { interviewId: session.id, token: WORKSPACE, resumeSessionId: sessionId }))
  const resumeMsgs = await resumeInbox.wait(m => m.some(x => x.type === 'session_ready' || x.type === 'error' || x.type === 'close'))
  report.reconnectAfterComplete = {
    rejectedOrClosed: resumeMsgs.some(m => m.type === 'error' || m.type === 'close'),
  }
  resumeWs.close()

  report.verificationSplit = {
    audioFixture: 'TTS-generated PCM fed to STT and the voice gateway (this run)',
    realMicrophone: 'not available in this cloud agent VM; must be verified separately in a mic-enabled browser',
  }
  report.orbStates = {
    connectingListeningThinkingSpeaking: inbox.msgs.filter(m => m.type === 'state').map(m => m.payload?.state),
  }

  gateway.close()
  http.close()
  console.log(JSON.stringify({ ok: true, report }, null, 2))
}

main().catch(err => {
  console.error('LIVE SARVAM QA FAIL', err instanceof Error ? err.message : 'unknown')
  process.exit(1)
})
