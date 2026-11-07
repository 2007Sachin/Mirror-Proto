import { z } from 'zod'

/**
 * v1 control envelope: { v:1, type, sessionId, turnId|null, seq, ts, payload }.
 * Binary frames are raw PCM16 16kHz mono and carry no envelope.
 */

export const PROTOCOL_VERSION = 1

const baseFields = {
  v: z.literal(PROTOCOL_VERSION),
  type: z.string().min(1).max(64),
  sessionId: z.string().max(128).nullable(),
  turnId: z.string().max(256).nullable(),
  seq: z.number().int().min(0).max(0xffffffff),
  ts: z.number().int().positive(),
}

const helloPayload = z.object({
  interviewId: z.string().min(1).max(128),
  token: z.string().min(1).max(256),
  resumeSessionId: z.string().max(128).optional(),
})

const turnIdPayload = z.object({ turnId: z.string().min(1).max(256) })

export const clientMessageSchema = z
  .object({
    ...baseFields,
    payload: z.unknown().optional(),
  })
  .superRefine((msg, ctx) => {
    switch (msg.type) {
      case 'hello': {
        const r = helloPayload.safeParse(msg.payload)
        if (!r.success) ctx.addIssue({ code: 'custom', message: 'invalid_hello_payload' })
        break
      }
      case 'finalize_turn':
      case 'playback_complete': {
        const r = turnIdPayload.safeParse(msg.payload)
        if (!r.success) ctx.addIssue({ code: 'custom', message: `invalid_${msg.type}_payload` })
        break
      }
      case 'interrupt': {
        // turnId optional
        if (msg.payload !== undefined && msg.payload !== null) {
          const r = z.object({ turnId: z.string().max(256) }).safeParse(msg.payload)
          if (!r.success) ctx.addIssue({ code: 'custom', message: 'invalid_interrupt_payload' })
        }
        break
      }
      case 'mute': {
        const r = z.object({ muted: z.boolean() }).safeParse(msg.payload)
        if (!r.success) ctx.addIssue({ code: 'custom', message: 'invalid_mute_payload' })
        break
      }
      case 'ping': {
        const r = z.object({ nonce: z.string().min(1).max(128) }).safeParse(msg.payload)
        if (!r.success) ctx.addIssue({ code: 'custom', message: 'invalid_ping_payload' })
        break
      }
      case 'close': {
        if (msg.payload !== undefined && msg.payload !== null) {
          const r = z.object({ reason: z.string().max(256) }).safeParse(msg.payload)
          if (!r.success) ctx.addIssue({ code: 'custom', message: 'invalid_close_payload' })
        }
        break
      }
      default:
        ctx.addIssue({ code: 'custom', message: `unknown_type:${msg.type}` })
    }
  })

export type ClientMessage = z.infer<typeof clientMessageSchema>
export type HelloPayload = z.infer<typeof helloPayload>

export type ServerMessageType =
  | 'session_ready'
  | 'partial_transcript'
  | 'final_transcript'
  | 'question'
  | 'tts_start'
  | 'tts_end'
  | 'turn_accepted'
  | 'turn_rejected'
  | 'state'
  | 'error'
  | 'pong'
  | 'close'

export interface ServerEnvelope<T = unknown> {
  v: typeof PROTOCOL_VERSION
  type: ServerMessageType
  sessionId: string | null
  turnId: string | null
  seq: number
  ts: number
  payload: T
}

export function encodeServerMessage<T>(msg: ServerEnvelope<T>): string {
  return JSON.stringify(msg)
}

export function parseClientMessage(raw: string): ClientMessage | { error: string } {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { error: 'invalid_json' }
  }
  const r = clientMessageSchema.safeParse(data)
  if (!r.success) {
    const issue = r.error.issues[0]
    return { error: issue?.message ?? 'invalid_message' }
  }
  return r.data
}

/** Per-direction sequence tracker. Stale = seq <= lastSeen. */
export class SeqTracker {
  private lastSeen = -1
  isStale(seq: number): boolean {
    return seq <= this.lastSeen
  }
  observe(seq: number): void {
    this.lastSeen = seq
  }
}
