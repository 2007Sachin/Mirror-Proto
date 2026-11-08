import type { SttProvider, SttStream } from '../providers/types.js'

export interface MockSttOpts {
  /** Deterministic final transcript; defaults to MOCK_STT_FINAL_TEXT or a fixed string. */
  finalText?: string
  /** Emit a partial transcript per sendAudio call when true. */
  emitPartials?: boolean
  /** Simulate a provider failure on finalize(). */
  failOnFinalize?: boolean
}

/**
 * Deterministic dev/test STT. Never talks to a network. Clearly labeled mock:
 * the gateway logs report it as `stt:mock`.
 */
export function createMockStt(opts: MockSttOpts = {}): SttProvider {
  return {
    startStream(): SttStream {
      let bytes = 0
      let aborted = false
      let finalized = false
      let partialCb: ((text: string) => void) | null = null
      let finalCb: ((text: string) => void) | null = null
      let errorCb: ((err: Error) => void) | null = null

      return {
        sendAudio(chunk: Buffer) {
          if (aborted || finalized) return
          bytes += chunk.length
          if (opts.emitPartials !== false) {
            partialCb?.(`[mock partial ${bytes} bytes]`)
          }
        },
        onPartial(cb) {
          partialCb = cb
        },
        onFinal(cb) {
          finalCb = cb
        },
        onError(cb) {
          errorCb = cb
        },
        async finalize(): Promise<string> {
          if (aborted) throw new Error('stream_aborted')
          if (finalized) throw new Error('already_finalized')
          finalized = true
          if (opts.failOnFinalize) {
            const err = new Error('mock_stt_finalize_failed')
            errorCb?.(err)
            throw err
          }
          const text =
            opts.finalText ??
            process.env.MOCK_STT_FINAL_TEXT ??
            'I owned the research and simplified onboarding after the product update.'
          finalCb?.(text)
          return text
        },
        abort() {
          aborted = true
        },
      }
    },
  }
}
