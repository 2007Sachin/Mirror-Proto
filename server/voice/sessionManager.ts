import { VOICE_LIMITS } from './limits.js'
import { VoiceStateMachine } from './stateMachine.js'

export interface VoiceSession {
  id: string
  workspace: string
  interviewId: string
  machine: VoiceStateMachine
  /** turnId currently open for audio capture / playback ('<sessionId>:<n>'). */
  currentTurnId: string
  /** Next question index to ask (equals accepted turn count). */
  questionIndex: number
  /** Cached finalize results per turnId for idempotent replay. */
  finalizeCache: Map<string, { accepted: boolean; payload: unknown }>
  createdAt: number
  lastActivityAt: number
  muted: boolean
  /** Set when the socket dropped; eligible for resume within the reconnect window. */
  tombstonedAt: number | null
  /** Opening prompt vs post-answer follow-up; playback_complete must not skip a question. */
  pendingPlayback: 'none' | 'opening' | 'next'
}

export interface CreateSessionInput {
  workspace: string
  interviewId: string
  questionIndex: number
}

function newSessionId(): string {
  return crypto.randomUUID()
}

/**
 * Owns the lifecycle of voice sessions: creation, lookup, turnId assignment,
 * reconnect tombstones and expiry sweeps. All interview rules live elsewhere.
 */
export class SessionManager {
  private sessions = new Map<string, VoiceSession>()

  create(input: CreateSessionInput): VoiceSession {
    const id = newSessionId()
    const session: VoiceSession = {
      id,
      workspace: input.workspace,
      interviewId: input.interviewId,
      machine: new VoiceStateMachine(),
      currentTurnId: `${id}:${input.questionIndex}`,
      questionIndex: input.questionIndex,
      finalizeCache: new Map(),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      muted: false,
      tombstonedAt: null,
      pendingPlayback: 'none',
    }
    this.sessions.set(id, session)
    return session
  }

  get(id: string): VoiceSession | null {
    return this.sessions.get(id) ?? null
  }

  touch(session: VoiceSession): void {
    session.lastActivityAt = Date.now()
  }

  /** Advance to the next turn after an accepted answer. */
  advanceTurn(session: VoiceSession): void {
    session.questionIndex += 1
    session.currentTurnId = `${session.id}:${session.questionIndex}`
  }

  /** The socket went away — the session can still be resumed for a while. */
  tombstone(session: VoiceSession): void {
    session.tombstonedAt = Date.now()
  }

  /**
   * Attempt to resume a tombstoned session. Returns null when unknown or the
   * reconnect window has expired (the tombstone is then dropped).
   */
  resume(id: string, now = Date.now()): VoiceSession | null {
    const session = this.sessions.get(id)
    if (!session) return null
    if (session.tombstonedAt === null) return session
    if (now - session.tombstonedAt > VOICE_LIMITS.reconnectWindowMs) {
      this.sessions.delete(id)
      return null
    }
    session.tombstonedAt = null
    session.lastActivityAt = now
    return session
  }

  /** Drop expired tombstones. Returns the number removed. */
  sweep(now = Date.now()): number {
    let removed = 0
    for (const [id, s] of this.sessions) {
      if (s.tombstonedAt !== null && now - s.tombstonedAt > VOICE_LIMITS.reconnectWindowMs) {
        this.sessions.delete(id)
        removed += 1
      } else if (now - s.createdAt > VOICE_LIMITS.maxSessionMs) {
        this.sessions.delete(id)
        removed += 1
      }
    }
    return removed
  }

  /** Test helper: number of live sessions. */
  get size(): number {
    return this.sessions.size
  }
}
