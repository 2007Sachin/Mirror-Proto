/**
 * Canonical voice-session state machine. This module is the ONLY authority
 * over voice session states; every other module (gateway, STT, TTS, bridge)
 * reports events here and it broadcasts state{} transitions. It contains no
 * interview rules — those live in domain/stateMachine.ts.
 */

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

const ALLOWED: Record<VoiceState, readonly VoiceState[]> = {
  idle: ['requesting_permission', 'connecting', 'error', 'completed'],
  requesting_permission: ['connecting', 'error', 'idle'],
  connecting: ['listening', 'speaking', 'reconnecting', 'error', 'completed'],
  listening: ['processing_speech', 'thinking', 'speaking', 'reconnecting', 'error', 'completed'],
  processing_speech: ['thinking', 'listening', 'reconnecting', 'error', 'completed'],
  thinking: ['speaking', 'listening', 'reconnecting', 'error', 'completed'],
  speaking: ['listening', 'reconnecting', 'error', 'completed'],
  reconnecting: ['listening', 'error', 'completed'],
  error: ['listening', 'connecting', 'reconnecting', 'completed'],
  completed: [],
}

export interface StateChange {
  from: VoiceState
  to: VoiceState
  turnId: string | null
  at: number
}

export type StateListener = (change: StateChange) => void

export class VoiceStateMachine {
  private state: VoiceState = 'idle'
  private listeners = new Set<StateListener>()
  private history: StateChange[] = []

  get current(): VoiceState {
    return this.state
  }

  onChange(listener: StateListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  canTransition(to: VoiceState): boolean {
    return ALLOWED[this.state].includes(to)
  }

  /** Attempt a transition. Returns true if applied; illegal transitions are ignored. */
  transition(to: VoiceState, turnId: string | null = null): boolean {
    if (to === this.state) return true
    if (!this.canTransition(to)) return false
    const change: StateChange = { from: this.state, to, turnId, at: Date.now() }
    this.state = to
    this.history.push(change)
    for (const listener of this.listeners) listener(change)
    return true
  }

  /** Terminal state; no further transitions. */
  complete(): void {
    this.transition('completed')
  }

  getHistory(): readonly StateChange[] {
    return this.history
  }
}
