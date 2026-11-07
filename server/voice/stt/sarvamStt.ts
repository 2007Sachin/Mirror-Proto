import type { SttProvider, SttStream } from '../providers/types.js'

export interface SarvamSttDeps {
  apiKey: string
  baseUrl: string
  fetchImpl?: typeof fetch
}

/**
 * Sarvam REST STT. Chunks are buffered locally and flushed in one
 * /speech-to-text/recognize call on finalize() — Sarvam's REST API has no
 * client-streaming endpoint. Audio must be PCM16 16kHz mono.
 */
export function createSarvamStt(deps: SarvamSttDeps): SttProvider {
  const fetchImpl = deps.fetchImpl ?? fetch
  return {
    startStream(): SttStream {
      const chunks: Buffer[] = []
      let aborted = false
      let finalized = false
      let errorCb: ((err: Error) => void) | null = null

      return {
        sendAudio(chunk: Buffer) {
          if (aborted || finalized) return
          chunks.push(chunk)
        },
        onPartial() {
          // REST endpoint returns no partials; left as a no-op so callers can
          // wire the callback uniformly.
        },
        onFinal() {},
        onError(cb) {
          errorCb = cb
        },
        async finalize(): Promise<string> {
          if (aborted) throw new Error('stream_aborted')
          if (finalized) throw new Error('already_finalized')
          finalized = true
          const pcm = Buffer.concat(chunks)
          try {
            const form = new FormData()
            form.append('model', 'saarika:v2')
            form.append(
              'audio',
              new Blob([new Uint8Array(pcm)], { type: 'audio/raw' }),
              'turn.pcm',
            )
            const res = await fetchImpl(`${deps.baseUrl}/speech-to-text/recognize`, {
              method: 'POST',
              headers: { 'X-API-Key': deps.apiKey },
              body: form,
            })
            if (!res.ok) throw new Error(`sarvam_stt_http_${res.status}`)
            const body = (await res.json()) as { transcript?: string }
            return body.transcript ?? ''
          } catch (err) {
            errorCb?.(err as Error)
            throw err
          }
        },
        abort() {
          aborted = true
        },
      }
    },
  }
}
