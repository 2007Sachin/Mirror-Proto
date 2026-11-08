import type { SttProvider, SttStream } from '../providers/types.js'

export interface SarvamSttDeps {
  apiKey: string
  baseUrl: string
  model?: string
  language?: string
  fetchImpl?: typeof fetch
}

/** Wrap PCM16 16 kHz mono as a WAV container so REST STT can auto-detect it. */
export function pcm16kMonoToWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(16000, 24)
  header.writeUInt32LE(16000 * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

/**
 * Sarvam REST STT (POST /speech-to-text). Chunks are buffered locally and
 * flushed in one recognize call on finalize() — the REST API has no client
 * streaming, so onPartial is a documented no-op. Audio must be PCM16 16kHz mono.
 */
export function createSarvamStt(deps: SarvamSttDeps): SttProvider {
  const fetchImpl = deps.fetchImpl ?? fetch
  const model = deps.model ?? 'saaras:v4'
  const language = deps.language ?? 'en-IN'
  return {
    startStream(): SttStream {
      const chunks: Buffer[] = []
      let aborted = false
      let finalized = false
      let errorCb: ((err: Error) => void) | null = null
      const ac = new AbortController()

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
            const wav = pcm16kMonoToWav(pcm)
            const form = new FormData()
            form.append('model', model)
            form.append('mode', 'transcribe')
            form.append('language_code', language)
            form.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'turn.wav')
            const res = await fetchImpl(`${deps.baseUrl}/speech-to-text`, {
              method: 'POST',
              headers: { 'api-subscription-key': deps.apiKey },
              body: form,
              signal: ac.signal,
            })
            if (!res.ok) throw new Error(`sarvam_stt_http_${res.status}`)
            const body = (await res.json()) as { transcript?: string }
            return typeof body.transcript === 'string' ? body.transcript : ''
          } catch (err) {
            errorCb?.(err as Error)
            throw err
          }
        },
        abort() {
          aborted = true
          ac.abort()
        },
      }
    },
  }
}
