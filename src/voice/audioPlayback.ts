// PCM16 16 kHz mono playback queue for MIRROR TTS audio.
// Chunks are scheduled onto an AudioContext buffer chain; when the queue
// drains, onComplete fires (exactly once per turn) so the caller can send
// playback_complete. cancel() implements barge-in: playback stops and queued
// chunks are discarded.

import { PCM_SAMPLE_RATE } from './protocol'

export interface AudioPlaybackOptions {
  onComplete?: (turnId: string) => void
  onLevel?: (level: number) => void
  onError?: (error: Error) => void
}

interface QueuedChunk {
  pcm: Float32Array
}

export class AudioPlayback {
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  private queue: QueuedChunk[] = []
  private scheduledEndAt = 0
  private activeSource: AudioBufferSourceNode | null = null
  private currentTurnId: string | null = null
  private completionTimer: ReturnType<typeof setTimeout> | null = null
  private completedFired = true
  private cancelled = false

  private readonly options: AudioPlaybackOptions

  constructor(options: AudioPlaybackOptions) {
    this.options = options
  }

  get isPlaying(): boolean {
    return !this.completedFired || this.queue.length > 0
  }

  get turnId(): string | null {
    return this.currentTurnId
  }

  private ensureGraph(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext()
      this.gain = this.context.createGain()
      this.gain.connect(this.context.destination)
    }
    return this.context
  }

  /** Begin a new TTS turn. Resets completion tracking and cancellation flag. */
  startTurn(turnId: string): void {
    const context = this.ensureGraph()
    this.currentTurnId = turnId
    this.completedFired = false
    this.cancelled = false
    this.queue = []
    this.scheduledEndAt = context.currentTime
  }

  /** Queue one PCM16 16 kHz mono chunk (Int16Array or ArrayBuffer). */
  enqueue(chunk: Int16Array | ArrayBuffer | ArrayBufferView): void {
    if (this.cancelled || !this.currentTurnId) return
    const context = this.ensureGraph()
    const pcm = pcm16ToFloat(chunk)
    this.queue.push({ pcm })
    this.schedule(context)
  }

  private schedule(context: AudioContext): void {
    while (this.queue.length > 0 && !this.cancelled) {
      const { pcm } = this.queue.shift()!
      const buffer = context.createBuffer(1, pcm.length, PCM_SAMPLE_RATE)
      buffer.copyToChannel(Float32Array.from(pcm), 0)
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(this.gain!)
      const startAt = Math.max(context.currentTime, this.scheduledEndAt)
      this.scheduledEndAt = startAt + buffer.duration
      source.onended = () => {
        if (this.activeSource === source) {
          this.activeSource = null
          this.options.onLevel?.(0)
        }
        this.checkComplete(context)
      }
      source.start(startAt)
      this.activeSource = source
      this.options.onLevel?.(0.8)
    }
    this.checkComplete(context)
  }

  private checkComplete(context: AudioContext): void {
    if (this.completedFired || this.cancelled || this.queue.length > 0) return
    if (this.activeSource !== null || this.scheduledEndAt > context.currentTime) return
    this.completedFired = true
    const turnId = this.currentTurnId
    if (turnId) this.options.onComplete?.(turnId)
  }

  /** Barge-in: stop playback, discard queued chunks. */
  cancel(): void {
    this.cancelled = true
    this.queue = []
    if (this.completionTimer) {
      clearTimeout(this.completionTimer)
      this.completionTimer = null
    }
    try {
      this.activeSource?.stop()
    } catch {
      /* already stopped */
    }
    this.activeSource = null
    this.options.onLevel?.(0)
  }

  /** Flush, close the AudioContext, and release resources. */
  dispose(): void {
    this.cancel()
    if (this.context) {
      void this.context.close().catch(() => undefined)
      this.context = null
      this.gain = null
    }
    this.currentTurnId = null
  }
}

export function pcm16ToFloat(chunk: Int16Array | ArrayBuffer | ArrayBufferView): Float32Array {
  const view =
    chunk instanceof Int16Array
      ? chunk
      : chunk instanceof ArrayBuffer
        ? new Int16Array(chunk)
        : new Int16Array(chunk.buffer, chunk.byteOffset, Math.floor(chunk.byteLength / 2))
  const out = new Float32Array(view.length)
  for (let i = 0; i < view.length; i++) out[i] = view[i] / 0x8000
  return out
}
