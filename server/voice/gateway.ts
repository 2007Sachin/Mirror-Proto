import { WebSocketServer, type WebSocket } from 'ws'
import type { Server as HttpServer, IncomingMessage } from 'node:http'
import type { Env } from '../config.js'
import type { Repository } from '../repo/types.js'
import { VOICE_LIMITS } from './limits.js'
import { encodeServerMessage, parseClientMessage, SeqTracker, PROTOCOL_VERSION, type ServerMessageType } from './protocol.js'
import type { VoiceSession } from './sessionManager.js'
import { SessionManager } from './sessionManager.js'
import type { SttProvider, SttStream, TtsProvider } from './providers/types.js'
import { createMockStt } from './stt/mockStt.js'
import { createMockTts } from './tts/mockTts.js'
import { createSarvamStt } from './stt/sarvamStt.js'
import { createSarvamTts } from './tts/sarvamTts.js'
import { TOTAL_QUESTIONS } from '../domain/questions.js'
import { isNimConfigured, isSarvamConfigured } from '../config.js'
import { createNimClient } from '../providers/nim.js'
import type { ReflectionProvider } from '../providers/types.js'
import { interviewProgress, submitVoiceTurn } from './interviewBridge.js'

export type LogFn = (msg: string) => void

export interface VoiceGatewayDeps {
  env: Env
  repo: Repository
  stt?: SttProvider
  tts?: TtsProvider
  provider?: ReflectionProvider | null
  log?: LogFn
}

const LOCALHOST_ADDR = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

const noopLog: LogFn = () => {}

export interface VoiceGateway {
  attach(server: HttpServer): void
  sessionManager: SessionManager
  close(): void
}

interface ConnectionCtx {
  ws: WebSocket
  ip: string
  inSeq: SeqTracker
  outSeq: number
  session: VoiceSession | null
  sttStream: SttStream | null
  /** Set by interrupt{} to abort an in-flight TTS stream. */
  ttsAbort: { aborted: boolean }
  turnAudioBytes: number
  turnAudioRejected: boolean
  lastActivityAt: number
  closed: boolean
}

export function createVoiceGateway(deps: VoiceGatewayDeps): VoiceGateway {
  const log = deps.log ?? noopLog
  const sessionManager = new SessionManager()
  const liveVoice = isSarvamConfigured(deps.env)
  const stt: SttProvider =
    deps.stt ??
    (liveVoice
      ? createSarvamStt({
          apiKey: deps.env.sarvamApiKey!,
          baseUrl: deps.env.sarvamBaseUrl,
          model: deps.env.sarvamSttModel,
          language: deps.env.sarvamLanguage,
        })
      : createMockStt())
  const tts: TtsProvider =
    deps.tts ??
    (liveVoice
      ? createSarvamTts({
          apiKey: deps.env.sarvamApiKey!,
          baseUrl: deps.env.sarvamBaseUrl,
          speaker: deps.env.sarvamSpeaker,
          model: deps.env.sarvamTtsModel,
        })
      : createMockTts())
  const providerLabel = liveVoice ? 'sarvam' : 'mock'
  const interviewProvider: ReflectionProvider | null =
    deps.provider !== undefined
      ? deps.provider
      : isNimConfigured(deps.env)
        ? createNimClient(deps.env)
        : null
  const lastHelloAt = new Map<string, number>()
  const wss = new WebSocketServer({ noServer: true })
  let sweepTimer: ReturnType<typeof setInterval> | null = null

  function sendJson(ctx: ConnectionCtx, type: ServerMessageType, sessionId: string | null, turnId: string | null, payload: unknown) {
    if (ctx.closed) return
    const seq = ctx.outSeq++
    ctx.ws.send(
      encodeServerMessage({ v: PROTOCOL_VERSION, type, sessionId, turnId, seq, ts: Date.now(), payload }),
    )
  }

  function sendError(ctx: ConnectionCtx, session: VoiceSession | null, code: string, message: string, recoverable: boolean) {
    log(`voice error code=${code} recoverable=${recoverable} session=${session?.id ?? 'none'}`)
    sendJson(ctx, 'error', session?.id ?? null, session?.currentTurnId ?? null, { code, message, recoverable })
  }

  function closeWith(ctx: ConnectionCtx, session: VoiceSession | null, code: string, reason: string) {
    log(`voice close code=${code} session=${session?.id ?? 'none'}`)
    sendJson(ctx, 'close', session?.id ?? null, session?.currentTurnId ?? null, { code, reason })
    ctx.closed = true
    try {
      ctx.ws.close(1000, code)
    } catch {
      /* already closed */
    }
  }

  function ensureSttStream(ctx: ConnectionCtx, session: VoiceSession): SttStream {
    if (ctx.sttStream) return ctx.sttStream
    const stream = stt.startStream({ language: 'en-IN', sampleRate: 16000 })
    stream.onPartial((text) => {
      // Partials never advance state; emit only while still capturing.
      if (ctx.session === session && session.machine.current === 'listening' && !ctx.closed) {
        sendJson(ctx, 'partial_transcript', session.id, session.currentTurnId, { text })
      }
    })
    stream.onError(() => {
      if (ctx.session !== session || ctx.closed) return
      session.machine.transition('error', session.currentTurnId)
      sendError(ctx, session, 'stt_error', 'speech recognition failed', true)
      session.machine.transition('listening', session.currentTurnId)
    })
    ctx.sttStream = stream
    return stream
  }

  function resetCapture(ctx: ConnectionCtx, session: VoiceSession) {
    ctx.sttStream?.abort()
    ctx.sttStream = null
    ctx.turnAudioBytes = 0
    ctx.turnAudioRejected = false
    session.machine.transition('listening', session.currentTurnId)
  }

  async function speakQuestion(ctx: ConnectionCtx, session: VoiceSession, text: string, turnId: string, kind: 'opening' | 'next') {
    session.pendingPlayback = kind
    session.machine.transition('speaking', turnId)
    sendJson(ctx, 'state', session.id, turnId, { state: 'speaking', turnId })
    sendJson(ctx, 'question', session.id, turnId, { turnId, text, questionIndex: session.questionIndex })
    sendJson(ctx, 'tts_start', session.id, turnId, { turnId })
    const abort = { aborted: false }
    ctx.ttsAbort = abort
    try {
      for await (const chunk of tts.synthesizeStream(text, { language: 'en-IN', speed: 1 })) {
        if (abort.aborted || ctx.closed || ctx.session !== session) return
        ctx.ws.send(chunk)
      }
    } catch {
      if (!abort.aborted) {
        session.machine.transition('error', turnId)
        sendError(ctx, session, 'tts_error', 'speech synthesis failed', true)
        resetCapture(ctx, session)
        sendJson(ctx, 'state', session.id, session.currentTurnId, { state: session.machine.current, turnId: session.currentTurnId })
      }
      return
    }
    if (abort.aborted || ctx.closed || ctx.session !== session) return
    sendJson(ctx, 'tts_end', session.id, turnId, { turnId })
    sessionManager.touch(session)
  }

  async function runTurnPipeline(ctx: ConnectionCtx, session: VoiceSession, turnId: string) {
    let transcript: string
    try {
      const stream = ctx.sttStream
      transcript = stream ? await stream.finalize() : ''
    } catch {
      ctx.sttStream = null
      session.machine.transition('error', turnId)
      sendError(ctx, session, 'stt_error', 'speech recognition failed', true)
      resetCapture(ctx, session)
      return
    }
    ctx.sttStream = null
    sessionManager.touch(session)

    if (transcript.trim().length === 0) {
      sendJson(ctx, 'turn_rejected', session.id, turnId, {
        reason: 'empty transcript',
        code: 'empty_transcript',
        recoverable: true,
      })
      // Do not cache empty rejects — the same turnId is reused so the client can speak again.
      resetCapture(ctx, session)
      return
    }
    sendJson(ctx, 'final_transcript', session.id, turnId, { text: transcript, confidence: undefined })
    session.machine.transition('thinking', turnId)
    sendJson(ctx, 'state', session.id, turnId, { state: 'thinking', turnId })

    const bridge = await submitVoiceTurn(
      deps.repo,
      session.workspace,
      session.interviewId,
      session.questionIndex,
      transcript,
      interviewProvider,
    )
    if (!bridge.ok) {
      const recoverable = bridge.status >= 500
      sendJson(ctx, 'turn_rejected', session.id, turnId, {
        reason: bridge.code,
        code: bridge.code,
        recoverable,
      })
      session.finalizeCache.set(turnId, { accepted: false, payload: { code: bridge.code } })
      if (bridge.code === 'interview_already_completed') {
        session.machine.complete()
        sendJson(ctx, 'state', session.id, turnId, { state: 'completed', turnId })
        closeWith(ctx, session, 'interview_completed', 'interview is complete')
        return
      }
      resetCapture(ctx, session)
      return
    }

    if (bridge.completed) {
      session.finalizeCache.set(turnId, { accepted: true, payload: { questionIndex: session.questionIndex } })
      sendJson(ctx, 'turn_accepted', session.id, turnId, { turnId, questionIndex: session.questionIndex })
      session.machine.complete()
      sendJson(ctx, 'state', session.id, turnId, { state: 'completed', turnId })
      closeWith(ctx, session, 'interview_completed', 'interview is complete')
      return
    }

    session.finalizeCache.set(turnId, { accepted: true, payload: { questionIndex: session.questionIndex } })
    sendJson(ctx, 'turn_accepted', session.id, turnId, { turnId, questionIndex: session.questionIndex })
    const nextIndex = bridge.nextQuestionIndex as number
    session.questionIndex = nextIndex
    session.currentTurnId = `${session.id}:${nextIndex}`
    await speakQuestion(ctx, session, bridge.nextQuestion ?? '', session.currentTurnId, 'next')
  }

  function acceptPlaybackComplete(ctx: ConnectionCtx, session: VoiceSession, turnId: string) {
    if (turnId !== session.currentTurnId || session.machine.current !== 'speaking') {
      sendError(ctx, session, 'stale_turn', 'turn is not awaiting playback completion', true)
      return
    }
    session.pendingPlayback = 'none'
    sessionManager.touch(session)
    resetCapture(ctx, session)
    sendJson(ctx, 'state', session.id, session.currentTurnId, { state: session.machine.current, turnId: session.currentTurnId })
  }

  async function handleHello(ctx: ConnectionCtx, msg: { payload?: unknown }) {
    const payload = (msg.payload ?? {}) as { interviewId?: string; token?: string; resumeSessionId?: string }
    const now = Date.now()
    const last = lastHelloAt.get(ctx.ip) ?? 0
    const isResume = Boolean((payload as { resumeSessionId?: string }).resumeSessionId)
    if (!isResume) {
      if (now - last < VOICE_LIMITS.helloRateLimitMs) {
        sendError(ctx, null, 'rate_limited', 'one hello per 5 seconds', true)
        closeWith(ctx, null, 'rate_limited', 'hello rate limit exceeded')
        return
      }
      lastHelloAt.set(ctx.ip, now)
    }

    const workspace = (payload.token ?? '').trim()
    if (!workspace) {
      sendError(ctx, null, 'workspace_header_required', 'token (dev-workspace slug) is required', false)
      closeWith(ctx, null, 'invalid_hello', 'missing token')
      return
    }

    // Reconnection path: resume within the tombstone window.
    // Resume hellos skip the new-session rate limit so a dropped socket can
    // reconnect immediately without advancing the interview.
    if (payload.resumeSessionId) {
      const resumed = sessionManager.resume(payload.resumeSessionId)
      if (!resumed || resumed.interviewId !== payload.interviewId) {
        sendError(ctx, null, 'session_not_resumable', 'session unknown or reconnect window expired', false)
        closeWith(ctx, null, 'session_not_resumable', 'cannot resume session')
        return
      }
      ctx.ttsAbort.aborted = true
      ctx.session = resumed
      ctx.sttStream?.abort()
      ctx.sttStream = null
      resumed.tombstonedAt = null
      sessionManager.touch(resumed)
      resumed.machine.transition('listening', resumed.currentTurnId)
      log(`voice resumed session=${resumed.id} interview=${resumed.interviewId}`)
      sendJson(ctx, 'session_ready', resumed.id, resumed.currentTurnId, {
        sessionId: resumed.id,
        interviewState: { questionIndex: resumed.questionIndex, questionCount: TOTAL_QUESTIONS },
      })
      const resumedProgress = await interviewProgress(deps.repo, resumed.workspace, resumed.interviewId)
      if (resumedProgress?.currentQuestion) {
        await speakQuestion(ctx, resumed, resumedProgress.currentQuestion, resumed.currentTurnId, 'opening')
      } else {
        resumed.machine.transition('listening', resumed.currentTurnId)
        sendJson(ctx, 'state', resumed.id, resumed.currentTurnId, { state: 'listening', turnId: resumed.currentTurnId })
      }
      return
    }

    await deps.repo.ensureWorkspace(workspace)
    const progress = await interviewProgress(deps.repo, workspace, payload.interviewId ?? '')
    if (!progress) {
      sendError(ctx, null, 'interview_not_found', 'no such interview in this workspace', false)
      closeWith(ctx, null, 'interview_not_found', 'interview does not exist')
      return
    }
    if (progress.questionIndex >= TOTAL_QUESTIONS) {
      sendError(ctx, null, 'interview_already_completed', 'interview is already complete', false)
      closeWith(ctx, null, 'interview_already_completed', 'interview is complete')
      return
    }

    const session = sessionManager.create({
      workspace,
      interviewId: payload.interviewId as string,
      questionIndex: progress.questionIndex,
    })
    ctx.session = session
    session.machine.transition('connecting', session.currentTurnId)
    log(`voice session=${session.id} interview=${session.interviewId} stt=${providerLabel} tts=${providerLabel} bytes=0`)
    sendJson(ctx, 'session_ready', session.id, session.currentTurnId, {
      sessionId: session.id,
      interviewState: { questionIndex: progress.questionIndex, questionCount: progress.questionCount },
    })
    const opening = progress.currentQuestion
    if (!opening) {
      sendError(ctx, session, 'followup_not_ready', 'no question is ready for this turn', true)
      resetCapture(ctx, session)
      return
    }
    await speakQuestion(ctx, session, opening, session.currentTurnId, 'opening')
  }

  function handleMessage(ctx: ConnectionCtx, data: Buffer, isBinary: boolean) {
    ctx.lastActivityAt = Date.now()
    const session = ctx.session

    if (isBinary) {
      if (!session || ctx.closed) return
      if (data.length > VOICE_LIMITS.maxBinaryBytes) {
        closeWith(ctx, session, 'message_too_large', 'binary frame exceeds 8KB')
        return
      }
      // Capture gate: audio arriving while speaking/processing is ignored.
      if (session.machine.current !== 'listening') return
      if (session.muted || ctx.turnAudioRejected) return
      ctx.turnAudioBytes += data.length
      if (ctx.turnAudioBytes * 10 > VOICE_LIMITS.maxTurnAudioMs * 32) {
        // ~20ms/640B chunks → bytes*10/32 ≈ ms captured. Cap at 5 minutes.
        ctx.turnAudioRejected = true
        sendError(ctx, session, 'turn_too_long', 'turn audio exceeds 5 minute limit', true)
        return
      }
      ensureSttStream(ctx, session).sendAudio(data)
      sessionManager.touch(session)
      return
    }

    if (data.length > VOICE_LIMITS.maxJsonBytes) {
      closeWith(ctx, session, 'message_too_large', 'json frame exceeds 16KB')
      return
    }
    const parsed = parseClientMessage(data.toString('utf8'))
    if ('error' in parsed) {
      sendError(ctx, session, 'invalid_message', parsed.error, false)
      return
    }
    if (ctx.inSeq.isStale(parsed.seq)) {
      sendError(ctx, session, 'stale_seq', `seq ${parsed.seq} already seen`, true)
      return
    }
    ctx.inSeq.observe(parsed.seq)

    switch (parsed.type) {
      case 'hello':
        void handleHello(ctx, parsed)
        return
      case 'finalize_turn': {
        if (!session) return
        const turnId = (parsed.payload as { turnId: string }).turnId
        if (turnId !== session.currentTurnId) {
          sendError(ctx, session, 'stale_turn', 'turn is not current', true)
          return
        }
        const cached = session.finalizeCache.get(turnId)
        if (cached) {
          // Idempotent replay.
          if (cached.accepted) {
            sendJson(ctx, 'turn_accepted', session.id, turnId, { turnId, questionIndex: session.questionIndex })
          } else {
            const code = (cached.payload as { code: string }).code
            sendJson(ctx, 'turn_rejected', session.id, turnId, { reason: code, code, recoverable: true })
          }
          return
        }
        if (session.machine.current !== 'listening') return
        session.machine.transition('processing_speech', turnId)
        sendJson(ctx, 'state', session.id, turnId, { state: 'processing_speech', turnId })
        void runTurnPipeline(ctx, session, turnId)
        return
      }
      case 'playback_complete': {
        if (!session) return
        acceptPlaybackComplete(ctx, session, (parsed.payload as { turnId: string }).turnId)
        return
      }
      case 'interrupt': {
        if (!session) return
        const p = (parsed.payload ?? null) as { turnId?: string } | null
        if (p?.turnId && p.turnId !== session.currentTurnId) {
          sendError(ctx, session, 'stale_turn', 'turn is not current', true)
          return
        }
        if (session.machine.current === 'speaking') {
          ctx.ttsAbort.aborted = true
          log(`voice interrupt session=${session.id} turn=${session.currentTurnId}`)
          sendJson(ctx, 'state', session.id, session.currentTurnId, { state: 'listening', turnId: session.currentTurnId })
          session.machine.transition('listening', session.currentTurnId)
        }
        return
      }
      case 'mute': {
        if (!session) return
        session.muted = (parsed.payload as { muted: boolean }).muted
        return
      }
      case 'ping': {
        sendJson(ctx, 'pong', session?.id ?? null, session?.currentTurnId ?? null, {
          nonce: (parsed.payload as { nonce: string }).nonce,
        })
        return
      }
      case 'close': {
        closeWith(ctx, session, 'client_close', 'client requested close')
        return
      }
      default:
        sendError(ctx, session, 'unknown_type', `unsupported message type`, false)
    }
  }

  function handleConnection(ws: WebSocket, req: IncomingMessage) {
    const ip = req.socket.remoteAddress ?? 'unknown'
    const ctx: ConnectionCtx = {
      ws,
      ip,
      inSeq: new SeqTracker(),
      outSeq: 0,
      session: null,
      sttStream: null,
      ttsAbort: { aborted: false },
      turnAudioBytes: 0,
      turnAudioRejected: false,
      lastActivityAt: Date.now(),
      closed: false,
    }
    log(`voice connected ip=${ip}`)
    ;(ws as unknown as { __ctx?: ConnectionCtx }).__ctx = ctx

    ws.on('message', (data: Buffer, isBinary: boolean) => {
      try {
        handleMessage(ctx, data, isBinary)
      } catch (err) {
        log(`voice handler_error code=internal session=${ctx.session?.id ?? 'none'}`)
        sendError(ctx, ctx.session, 'internal_error', 'handler failure', true)
        void err
      }
    })
    ws.on('close', () => {
      ctx.closed = true
      ctx.ttsAbort.aborted = true
      ctx.sttStream?.abort()
      if (ctx.session && ctx.session.machine.current !== 'completed') {
        sessionManager.tombstone(ctx.session)
        log(`voice disconnected session=${ctx.session.id} tombstoned`)
      }
    })
    ws.on('error', () => {
      /* close event follows */
    })
  }

  return {
    sessionManager,
    attach(server: HttpServer) {
      server.on('upgrade', (req, socket, head) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (url.pathname !== '/ws/voice') {
          socket.destroy()
          return
        }
        if (!LOCALHOST_ADDR.has(req.socket.remoteAddress ?? '')) {
          socket.destroy()
          return
        }
        wss.handleUpgrade(req, socket, head, ws => {
          handleConnection(ws, req)
        })
      })
      sweepTimer = setInterval(() => {
        sessionManager.sweep()
        const now = Date.now()
        for (const client of wss.clients) {
          const c = (client as unknown as { __ctx?: ConnectionCtx }).__ctx
          if (!c || c.closed) continue
          const silenceLimit =
            c.session?.machine.current === 'speaking'
              ? VOICE_LIMITS.serverSilenceWhileSpeakingMs
              : VOICE_LIMITS.serverSilenceMs
          if (now - c.lastActivityAt > silenceLimit) {
            closeWith(c, c.session, 'silence_timeout', 'client silent past timeout')
            client.terminate()
          }
        }
      }, 10_000)
      if (sweepTimer.unref) sweepTimer.unref()
    },
    close() {
      if (sweepTimer) clearInterval(sweepTimer)
      for (const client of wss.clients) client.terminate()
      wss.close()
    },
  }
}
