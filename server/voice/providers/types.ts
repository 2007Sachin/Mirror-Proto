/**
 * Provider adapter contracts for voice. Implementations: stt/sarvamStt,
 * stt/mockStt, tts/sarvamTts, tts/mockTts.
 */

export interface SttStream {
  /** Feed one PCM16 16kHz mono chunk. */
  sendAudio(chunk: Buffer): void
  onPartial(cb: (text: string) => void): void
  onFinal(cb: (text: string) => void): void
  onError(cb: (err: Error) => void): void
  /** Flush the current utterance and return the final transcript. */
  finalize(): Promise<string>
  /** Discard the stream without a final result. */
  abort(): void
  /** True after abort() or an unrecoverable provider close. */
  isClosed(): boolean
  /** Settles when the upstream provider is ready to accept audio. */
  whenReady(): Promise<void>
}

export interface SttProvider {
  startStream(opts: { language: string; sampleRate: number }): SttStream
}

export interface TtsSynthesizeOpts {
  language: string
  speed: number
}

export interface TtsProvider {
  /** Yield PCM16 16kHz mono chunks. */
  synthesizeStream(text: string, opts: TtsSynthesizeOpts): AsyncIterable<Buffer>
}
