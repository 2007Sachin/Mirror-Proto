import type { Env } from '../../config.js'
import type { SttProvider, SttStream } from '../providers/types.js'
import { createMockStt } from './mockStt.js'
import { createSarvamStt } from './sarvamStt.js'
import { createSarvamRealtimeStt } from './sarvamRealtimeStt.js'

export function createRestSarvamStt(env: Env): SttProvider {
  return createSarvamStt({
    apiKey: env.sarvamApiKey!,
    baseUrl: env.sarvamBaseUrl,
    model: env.sarvamSttModel,
    language: env.sarvamLanguage,
  })
}

export function createRealtimeSarvamStt(env: Env): SttProvider {
  return createSarvamRealtimeStt({
    apiKey: env.sarvamApiKey!,
    realtimeUrl: env.sarvamSttRealtimeUrl,
    model: env.sarvamSttRealtimeModel,
    language: env.sarvamLanguage,
    endpointing: env.sarvamSttEndpointing,
  })
}

/**
 * Prefer realtime STT. If the upstream socket dies before any audio is
 * accepted, fall back to REST for this stream only (short-answer path).
 */
export function withRestFallback(primary: SttProvider, rest: SttProvider): SttProvider {
  return {
    startStream(opts): SttStream {
      const realtime = primary.startStream(opts)
      let restStream: SttStream | null = null
      let usedRest = false
      let audioSent = false
      let partialCb: ((text: string) => void) | null = null
      let finalCb: ((text: string) => void) | null = null
      let errorCb: ((err: Error) => void) | null = null

      const active = () => restStream ?? realtime

      realtime.onError(err => {
        if (!audioSent && !usedRest) {
          usedRest = true
          restStream = rest.startStream(opts)
          restStream.onPartial(text => partialCb?.(text))
          restStream.onFinal(text => finalCb?.(text))
          restStream.onError(e => errorCb?.(e))
          return
        }
        errorCb?.(err)
      })

      return {
        sendAudio(chunk) {
          audioSent = true
          active().sendAudio(chunk)
        },
        onPartial(cb) {
          partialCb = cb
          realtime.onPartial(cb)
        },
        onFinal(cb) {
          finalCb = cb
          realtime.onFinal(cb)
        },
        onError(cb) {
          errorCb = cb
        },
        finalize() {
          return active().finalize()
        },
        abort() {
          realtime.abort()
          restStream?.abort()
        },
        isClosed() {
          return active().isClosed()
        },
        whenReady() {
          return active().whenReady()
        },
      }
    },
  }
}

export function createSttFromEnv(env: Env): SttProvider {
  if (!env.sarvamApiKey) return createMockStt()
  if (env.sarvamSttTransport === 'rest') return createRestSarvamStt(env)
  return withRestFallback(createRealtimeSarvamStt(env), createRestSarvamStt(env))
}
