// WebSocket client for the MIRROR voice gateway.
// - Sends hello{interviewId, token:'dev', resumeSessionId?} first.
// - Maintains per-direction seq counters (outbound increments on every send).
// - Reconnects with exponential backoff, resuming the same sessionId within 60 s.
// - Drops stale messages: tts_audio received after an interrupt (until the next
//   tts_start) and any message tagged with an old turnId.

import {
  VOICE_WS_URL,
  PROTOCOL_VERSION,
  MSG,
  encodeEnvelope,
  decodeEnvelope,
  type Envelope,
  type HelloPayload,
  type FinalizeTurnPayload,
  type InterruptPayload,
  type MutePayload,
  type PingPayload,
  type PlaybackCompletePayload,
  type ClosePayload,
} from './protocol'

type Handler = (payload: unknown, env: Envelope) => void

export interface VoiceClientOptions {
  url?: string
  token?: string
  /** Called whenever the effective connection state changes. */
  onConnectionChange?: (connected: boolean) => void
  /** Max age (ms) of a sessionId still eligible for resume. */
  resumeWindowMs?: number
  backoff?: { initialMs: number; maxMs: number }
}

export class VoiceClient {
  readonly url: string
  readonly token: string

  sessionId: string | null = null
  interviewId: string | null = null

  private ws: WebSocket | null = null
  private outSeq = 0
  private inSeq = 0
  private handlers = new Map<string, Set<Handler>>()
  private closedByUser = false
  private connecting = false
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private sessionStartedAt = 0
  private activeTurnId: string | null = null
  /** True after an interrupt until the next tts_start — stale tts_audio is dropped. */
  private playbackInterrupted = false

  private readonly resumeWindowMs: number
  private readonly backoff: { initialMs: number; maxMs: number }
  private readonly onConnectionChange?: (connected: boolean) => void

  constructor(options: VoiceClientOptions = {}) {
    this.url = options.url ?? VOICE_WS_URL
    this.token = options.token ?? 'dev'
    this.resumeWindowMs = options.resumeWindowMs ?? 60_000
    this.backoff = options.backoff ?? { initialMs: 500, maxMs: 8_000 }
    this.onConnectionChange = options.onConnectionChange
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get currentTurnId(): string | null {
    return this.activeTurnId
  }

  on(type: string, handler: Handler): () => void {
    let set = this.handlers.get(type)
    if (!set) {
      set = new Set()
      this.handlers.set(type, set)
    }
    set.add(handler)
    return () => {
      set.delete(handler)
    }
  }

  private emit(type: string, payload: unknown, env: Envelope): void {
    this.handlers.get(type)?.forEach(handler => handler(payload, env))
    this.handlers.get('*')?.forEach(handler => handler(payload, env))
  }

  /** Connect and open the session. Resolves on session_ready, rejects on open/error failure. */
  connect(interviewId: string): Promise<string> {
    if (this.connecting || this.isConnected) return Promise.reject(new Error('already_connected'))
    this.closedByUser = false
    this.interviewId = interviewId

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url)
      this.ws = ws
      this.connecting = true

      const onReady = (payload: unknown) => {
        const ready = payload as { sessionId?: string }
        if (typeof ready.sessionId === 'string') {
          this.sessionId = ready.sessionId
          this.sessionStartedAt = Date.now()
        }
        this.connecting = false
        this.reconnectAttempts = 0
        this.startPing()
        resolve(this.sessionId ?? '')
      }
      const offReady = this.on(MSG.SESSION_READY, (payload) => {
        offReady()
        onReady(payload)
      })
      const cleanup = () => offReady()

      ws.onopen = () => {
        const hello: HelloPayload = {
          interviewId,
          token: this.token,
          ...(this.sessionId && Date.now() - this.sessionStartedAt < this.resumeWindowMs
            ? { resumeSessionId: this.sessionId }
            : {}),
        }
        this.send(MSG.HELLO, hello)
      }
      ws.onmessage = (event: MessageEvent) => this.handleMessage(event)
      ws.onerror = () => {
        if (this.connecting) {
          this.connecting = false
          cleanup()
          reject(new Error('connection_failed'))
        }
      }
      ws.onclose = () => {
        this.stopPing()
        if (this.connecting) {
          this.connecting = false
          cleanup()
          reject(new Error('connection_closed'))
          return
        }
        this.onConnectionChange?.(false)
        if (!this.closedByUser) this.scheduleReconnect()
      }
    })
  }

  private scheduleReconnect(): void {
    if (this.closedByUser || this.reconnectTimer) return
    const delay = Math.min(
      this.backoff.initialMs * 2 ** this.reconnectAttempts,
      this.backoff.maxMs,
    )
    this.reconnectAttempts += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.closedByUser || !this.interviewId) return
      this.connect(this.interviewId).catch(() => {
        // connect() rejects without installing onclose-based retry on failure,
        // so retry the scheduling loop here.
        this.scheduleReconnect()
      })
    }, delay)
  }

  private handleMessage(event: MessageEvent): void {
    if (typeof event.data !== 'string') {
      // Binary frame = PCM16 16k mono TTS audio chunk.
      if (!this.playbackInterrupted) this.emit(MSG.TTS_AUDIO, event.data, this.emptyEnv(MSG.TTS_AUDIO))
      return
    }
    const env = decodeEnvelope(event.data)
    if (!env) return

    // Stale turnId messages are dropped once a turn is active and the tag differs.
    if (this.activeTurnId && env.turnId && env.turnId !== this.activeTurnId) {
      // allow state/session-level messages through; drop turn-scoped ones
      if (![MSG.STATE, MSG.SESSION_READY, MSG.ERROR, MSG.PONG, MSG.CLOSE_SERVER].includes(env.type)) {
        return
      }
    }

    // Track inbound seq monotonicity for diagnostics; do not hard-drop on gaps
    // (UDP-like ordering) but record the latest seen.
    this.inSeq = env.seq

    switch (env.type) {
      case MSG.TTS_START:
        this.playbackInterrupted = false
        this.activeTurnId = (env.payload as { turnId?: string }).turnId ?? this.activeTurnId
        break
      case MSG.QUESTION: {
        const q = env.payload as { turnId?: string }
        if (q.turnId) this.activeTurnId = q.turnId
        break
      }
      case MSG.INTERRUPT:
        break
      case MSG.CLOSE_SERVER:
        break
    }
    this.emit(env.type, env.payload, env)
  }

  private emptyEnv(type: string): Envelope {
    return { v: PROTOCOL_VERSION, type, sessionId: this.sessionId, turnId: null, seq: this.inSeq, ts: Date.now(), payload: null }
  }

  private send(type: string, payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const env: Envelope = {
      v: PROTOCOL_VERSION,
      type,
      sessionId: this.sessionId,
      turnId: this.activeTurnId,
      seq: this.outSeq++,
      ts: Date.now(),
      payload,
    }
    this.ws.send(encodeEnvelope(env))
  }

  /** Raw binary audio chunk (PCM16 16k mono, 640 bytes). */
  sendAudioChunk(chunk: ArrayBuffer | ArrayBufferView): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    const env: Envelope = {
      v: PROTOCOL_VERSION,
      type: MSG.AUDIO_CHUNK,
      sessionId: this.sessionId,
      turnId: this.activeTurnId,
      seq: this.outSeq++,
      ts: Date.now(),
      payload: null,
    }
    this.ws.send(encodeEnvelope(env))
    this.ws.send(chunk)
  }

  finalizeTurn(turnId: string): void {
    this.send(MSG.FINALIZE_TURN, { turnId } satisfies FinalizeTurnPayload)
  }

  interrupt(turnId?: string): void {
    this.playbackInterrupted = true
    this.send(MSG.INTERRUPT, (turnId ? { turnId } : {}) satisfies InterruptPayload)
  }

  mute(muted: boolean): void {
    this.send(MSG.MUTE, { muted } satisfies MutePayload)
  }

  playbackComplete(turnId: string): void {
    this.send(MSG.PLAYBACK_COMPLETE, { turnId } satisfies PlaybackCompletePayload)
  }

  private startPing(): void {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      const nonce = `ping-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      this.send(MSG.PING, { nonce } satisfies PingPayload)
    }, 10_000)
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  /** User-initiated, clean close: sends close frame then tears down. */
  close(reason?: string): void {
    this.closedByUser = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopPing()
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send(MSG.CLOSE, { reason } satisfies ClosePayload)
      this.ws.close()
    } else {
      this.ws?.close()
    }
    this.ws = null
    this.sessionId = null
    this.activeTurnId = null
    this.playbackInterrupted = false
  }
}
