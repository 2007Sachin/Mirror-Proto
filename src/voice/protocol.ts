// MIRROR voice WebSocket protocol — frozen contract mirror (client side).
// URL: ws://localhost:8787/ws/voice (overridable via VITE_VOICE_WS_URL).

export const VOICE_WS_URL: string =
  (import.meta.env.VITE_VOICE_WS_URL as string | undefined) ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/voice`
    : 'ws://localhost:8787/ws/voice')

export const PROTOCOL_VERSION = 1

// Audio format: PCM16 signed, 16 kHz, mono, one 20 ms (640-byte) chunk per binary frame.
export const PCM_SAMPLE_RATE = 16000
export const PCM_BYTES_PER_SAMPLE = 2
export const PCM_CHUNK_MS = 20
export const PCM_CHUNK_BYTES = (PCM_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE * PCM_CHUNK_MS) / 1000 // 640
export const CAPTURE_SAMPLE_RATE = 48000

// ---- Envelope ----
export interface Envelope<T = unknown> {
  v: number
  type: string
  sessionId: string | null
  turnId: string | null
  seq: number
  ts: number
  payload: T
}

// ---- Message type constants ----
export const MSG = {
  // client → server
  HELLO: 'hello',
  AUDIO_CHUNK: 'audio_chunk',
  FINALIZE_TURN: 'finalize_turn',
  INTERRUPT: 'interrupt',
  MUTE: 'mute',
  PING: 'ping',
  PLAYBACK_COMPLETE: 'playback_complete',
  CLOSE: 'close',
  // server → client
  SESSION_READY: 'session_ready',
  PARTIAL_TRANSCRIPT: 'partial_transcript',
  FINAL_TRANSCRIPT: 'final_transcript',
  QUESTION: 'question',
  TTS_AUDIO: 'tts_audio',
  TTS_START: 'tts_start',
  TTS_END: 'tts_end',
  TURN_ACCEPTED: 'turn_accepted',
  TURN_REJECTED: 'turn_rejected',
  STATE: 'state',
  ERROR: 'error',
  PONG: 'pong',
  CLOSE_SERVER: 'close',
} as const

// ---- Server-owned session states ----
export type VoiceState =
  | 'idle'
  | 'requesting_permission'
  | 'connecting'
  | 'listening'
  | 'processing_speech'
  | 'thinking'
  | 'speaking'
  | 'reconnecting'
  | 'error'
  | 'completed'

// Orb states (client-side rendering only)
export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

export function voiceStateToOrbState(state: VoiceState | 'requesting_permission'): OrbState {
  switch (state) {
    case 'listening':
      return 'listening'
    case 'processing_speech':
    case 'thinking':
      return 'thinking'
    case 'speaking':
      return 'speaking'
    default:
      return 'idle'
  }
}

// ---- Payload shapes ----
export interface HelloPayload {
  interviewId: string
  token: string
  resumeSessionId?: string
}
export interface SessionReadyPayload {
  sessionId: string
  interviewState: unknown
}
export interface PartialTranscriptPayload {
  text: string
}
export interface FinalTranscriptPayload {
  text: string
  confidence?: number
}
export interface QuestionPayload {
  turnId: string
  text: string
  questionIndex: number
}
export interface TtsBoundaryPayload {
  turnId: string
}
export interface TurnAcceptedPayload {
  turnId: string
  questionIndex: number
}
export interface TurnRejectedPayload {
  turnId: string
  reason: string
  code: string
}
export interface StatePayload {
  state: VoiceState
  turnId?: string | null
}
export interface ErrorPayload {
  code: string
  message: string
  recoverable: boolean
}
export interface PongPayload {
  nonce: unknown
}
export interface ClosePayload {
  reason?: string
}
export interface MutePayload {
  muted: boolean
}
export interface PingPayload {
  nonce: string
}
export interface FinalizeTurnPayload {
  turnId: string
}
export interface InterruptPayload {
  turnId?: string
}
export interface PlaybackCompletePayload {
  turnId: string
}

export function encodeEnvelope<T>(env: Envelope<T>): string {
  return JSON.stringify(env)
}

export function decodeEnvelope(data: string): Envelope | null {
  try {
    const parsed = JSON.parse(data) as Envelope
    if (typeof parsed !== 'object' || parsed === null) return null
    if (parsed.v !== PROTOCOL_VERSION || typeof parsed.type !== 'string') return null
    return parsed
  } catch {
    return null
  }
}
