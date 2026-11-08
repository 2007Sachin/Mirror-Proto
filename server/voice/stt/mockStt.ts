import type { SttProvider, SttStream } from '../providers/types.js'
import { VOICE_LIMITS } from '../limits.js'

export interface MockSttOpts {
  /** Deterministic final transcript; defaults to MOCK_STT_FINAL_TEXT or a fixed string. */
  finalText?: string
  /** Emit a partial transcript per sendAudio call when true. */
  emitPartials?: boolean
  /** Simulate a provider failure on finalize(). */
  failOnFinalize?: boolean
  /** Hang until abort — exercises finalize timeout. */
  hangOnFinalize?: boolean
  /** Delay before returning the final transcript. */
  delayFinalizeMs?: number
  /** Bounded queue; extra frames are dropped. */
  maxQueuedFrames?: number
  onDrop?: (dropped: number) => void
  /** Fail the first connection so the gateway can use REST fallback. */
  failConnect?: boolean
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
      let utteranceFinalized = false
      let queued = 0
      let dropped = 0
      let partialCb: ((text: string) => void) | null = null
      let finalCb: ((text: string) => void) | null = null
      let errorCb: ((err: Error) => void) | null = null
      const maxQueued = opts.maxQueuedFrames ?? VOICE_LIMITS.sttMaxQueuedFrames

      if (opts.failConnect) {
        return {
          sendAudio() {},
          onPartial() {},
          onFinal() {},
          onError(cb) {
            errorCb = cb
            queueMicrotask(() => errorCb?.(new Error('mock_stt_connect_failed')))
          },
          async finalize() {
            throw new Error('mock_stt_connect_failed')
          },
          abort() {
            aborted = true
          },
          isClosed() {
            return true
          },
          async whenReady() {},
        }
      }

      return {
        sendAudio(chunk: Buffer) {
          if (aborted) return
          if (utteranceFinalized) utteranceFinalized = false
          if (queued >= maxQueued) {
            dropped += 1
            opts.onDrop?.(dropped)
            return
          }
          queued += 1
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
          if (utteranceFinalized) throw new Error('already_finalized')
          utteranceFinalized = true
          if (opts.failOnFinalize) {
            const err = new Error('mock_stt_finalize_failed')
            errorCb?.(err)
            throw err
          }
          if (opts.hangOnFinalize) {
            await new Promise((_, reject) => {
              setTimeout(() => reject(new Error('stt_finalize_timeout')), opts.delayFinalizeMs ?? 30)
            })
          }
          if (opts.delayFinalizeMs) {
            await new Promise(resolve => setTimeout(resolve, opts.delayFinalizeMs))
          }
          const text =
            bytes === 0
              ? ''
              : (opts.finalText ??
                process.env.MOCK_STT_FINAL_TEXT ??
                'I owned the research and simplified onboarding after the product update.')
          finalCb?.(text)
          queued = 0
          bytes = 0
          return text
        },
        abort() {
          aborted = true
        },
        isClosed() {
          return aborted
        },
        async whenReady() {},
      }
    },
  }
}
