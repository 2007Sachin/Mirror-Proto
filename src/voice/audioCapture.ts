// Microphone capture for the MIRROR voice session.
// getUserMedia is requested ONLY from explicit user action (start()).
// 48 kHz AudioContext → 16 kHz PCM16 mono chunks, one 20 ms (640-byte) chunk
// per emit. mute() stops chunk emission but keeps the stream alive.
// RMS level is reported through onLevel for orb volume modulation.

import { PCM_CHUNK_BYTES, PCM_CHUNK_MS, PCM_SAMPLE_RATE } from './protocol'

export interface AudioCaptureOptions {
  onChunk: (chunk: Int16Array) => void
  onLevel?: (level: number) => void
  onError?: (error: Error) => void
}

export class AudioCapture {
  private stream: MediaStream | null = null
  private context: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private muted = false
  private stopped = true

  private readonly options: AudioCaptureOptions

  constructor(options: AudioCaptureOptions) {
    this.options = options
  }

  get isActive(): boolean {
    return !this.stopped && this.stream !== null
  }

  get isMuted(): boolean {
    return this.muted
  }

  /** Request the mic and begin emitting PCM16 chunks. Must be called from a user gesture. */
  async start(): Promise<void> {
    if (!this.stopped) return
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error('microphone_denied'))
      throw error
    }
    this.stopped = false
    this.stream = stream

    const context = new AudioContext()
    this.context = context
    const source = context.createMediaStreamSource(stream)
    this.source = source
    const processor = context.createScriptProcessor(4096, 1, 1)
    this.processor = processor
    const downsampleFactor = Math.max(1, Math.round(context.sampleRate / PCM_SAMPLE_RATE))
    const targetSamples = PCM_CHUNK_BYTES / 2
    const pending: number[] = []

    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      if (this.stopped) return
      const input = event.inputBuffer.getChannelData(0)

      let sum = 0
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
      this.options.onLevel?.(this.muted ? 0 : Math.min(1, Math.sqrt(sum / input.length) * 3))

      if (this.muted) return

      for (let i = 0; i < input.length; i += downsampleFactor) {
        pending.push(input[i])
      }
      while (pending.length >= targetSamples) {
        const slice = pending.splice(0, targetSamples)
        this.options.onChunk(floatToPcm16(Float32Array.from(slice)))
      }
    }

    source.connect(processor)
    processor.connect(context.destination)
  }

  mute(muted: boolean): void {
    this.muted = muted
    if (muted) this.options.onLevel?.(0)
  }

  /** Stop capture and release all tracks. */
  stop(): void {
    this.stopped = true
    this.processor?.disconnect()
    this.source?.disconnect()
    this.processor = null
    this.source = null
    if (this.context) {
      void this.context.close().catch(() => undefined)
      this.context = null
    }
    this.stream?.getTracks().forEach(track => track.stop())
    this.stream = null
    this.muted = false
    this.options.onLevel?.(0)
  }
}

export function floatToPcm16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

export function pcm16ToBytes(chunk: Int16Array): ArrayBuffer {
  const bytes = new Uint8Array(chunk.length * 2)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < chunk.length; i++) view.setInt16(i * 2, chunk[i], true)
  return bytes.buffer
}

export { PCM_CHUNK_BYTES, PCM_CHUNK_MS, PCM_SAMPLE_RATE }
