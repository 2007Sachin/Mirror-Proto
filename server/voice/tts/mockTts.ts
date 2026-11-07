import type { TtsProvider } from '../providers/types.js'

export interface MockTtsOpts {
  /** PCM chunk payload size per yielded chunk (default 640B = 20ms). */
  chunkBytes?: number
  /** Number of chunks yielded per synthesis (default 3). */
  chunkCount?: number
  /** Simulate a provider failure when true. */
  fail?: boolean
}

/**
 * Deterministic dev/test TTS. Never talks to a network; yields silent PCM16
 * 16kHz mono chunks. Clearly labeled mock: the gateway logs report `tts:mock`.
 */
export function createMockTts(opts: MockTtsOpts = {}): TtsProvider {
  const chunkBytes = opts.chunkBytes ?? 640
  const chunkCount = opts.chunkCount ?? 3
  return {
    async *synthesizeStream(): AsyncIterable<Buffer> {
      if (opts.fail) throw new Error('mock_tts_failed')
      for (let i = 0; i < chunkCount; i++) {
        yield Buffer.alloc(chunkBytes)
      }
    },
  }
}
