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
  /** Flush and return the final transcript. */
  finalize(): Promise<string>
  /** Discard the stream without a final result. */
  abort(): void
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
