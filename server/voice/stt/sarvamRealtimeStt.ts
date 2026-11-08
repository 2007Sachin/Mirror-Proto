import { WebSocket } from 'ws'
import { VOICE_LIMITS } from '../limits.js'
import type { SttProvider, SttStream } from '../providers/types.js'

export interface SarvamRealtimeSttDeps {
  apiKey: string
  realtimeUrl: string
  model: string
  language: string
  endpointing?: 'manual' | 'vad'
  streamType?: 'fast' | 'balanced' | 'simulated'
  finalizeTimeoutMs?: number
  maxQueuedFrames?: number
  WebSocketImpl?: typeof WebSocket
}

interface ProviderEvent {
  event?: string
  text?: string
  code?: string
  message?: string
  is_fatal?: boolean
}

function realtimeUrl(base: string, deps: SarvamRealtimeSttDeps): string {
  const url = new URL(base)
  url.searchParams.set('language_code', deps.language)
  url.searchParams.set('model', deps.model)
  url.searchParams.set('stream_type', deps.streamType ?? 'fast')
  url.searchParams.set('mode', 'transcribe')
  url.searchParams.set('endpointing', deps.endpointing ?? 'manual')
  url.searchParams.set('encoding', 'linear16')
  url.searchParams.set('sample_rate', '16000')
  return url.toString()
}

/**
 * Sarvam Realtime Streaming STT. One upstream WebSocket per voice session.
 * Manual endpointing: speech_start on first audio of an utterance, then
 * speech_end + flush on finalize(). Partials never leave this adapter as
 * interview answers.
 */
export function createSarvamRealtimeStt(deps: SarvamRealtimeSttDeps): SttProvider {
  const WsImpl = deps.WebSocketImpl ?? WebSocket
  const finalizeTimeoutMs = deps.finalizeTimeoutMs ?? VOICE_LIMITS.sttFinalizeTimeoutMs
  const maxQueued = deps.maxQueuedFrames ?? VOICE_LIMITS.sttMaxQueuedFrames
  const endpointing = deps.endpointing ?? 'manual'

  return {
    startStream(): SttStream {
      let partialCb: ((text: string) => void) | null = null
      let finalCb: ((text: string) => void) | null = null
      let errorCb: ((err: Error) => void) | null = null
      let socket: WebSocket | null = null
      let closed = false
      let utteranceOpen = false
      let utteranceFinalized = false
      let _droppedFrames = 0
      const queue: Buffer[] = []
      let pendingFinal: {
        resolve: (text: string) => void
        reject: (err: Error) => void
        timer: ReturnType<typeof setTimeout>
      } | null = null
      let pingTimer: ReturnType<typeof setInterval> | null = null
      let connectFailed = false
      let readyResolve: () => void = () => {}
      let readyReject: (err: Error) => void = () => {}
      const ready = new Promise<void>((resolve, reject) => {
        readyResolve = resolve
        readyReject = reject
      })
      void ready.catch(() => undefined)

      function sendJson(payload: unknown) {
        if (!socket || socket.readyState !== WebSocket.OPEN) return
        socket.send(JSON.stringify(payload))
      }

      function flushQueue() {
        while (queue.length && socket?.readyState === WebSocket.OPEN) {
          const chunk = queue.shift()!
          sendJson({ event: 'audio_input', audio: chunk.toString('base64') })
        }
      }

      function ensureUtterance() {
        if (utteranceOpen || endpointing !== 'manual') return
        utteranceOpen = true
        utteranceFinalized = false
        sendJson({ event: 'speech_start' })
      }

      function handleMessage(raw: WebSocket.RawData) {
        if (closed) return
        let msg: ProviderEvent
        try {
          msg = JSON.parse(String(raw)) as ProviderEvent
        } catch {
          return
        }
        if (msg.event === 'transcript.partial' && typeof msg.text === 'string') {
          if (!closed && !utteranceFinalized) partialCb?.(msg.text)
          return
        }
        if (msg.event === 'transcript.final' && typeof msg.text === 'string') {
          if (utteranceFinalized && !pendingFinal) return
          utteranceFinalized = true
          utteranceOpen = false
          finalCb?.(msg.text)
          if (pendingFinal) {
            clearTimeout(pendingFinal.timer)
            pendingFinal.resolve(msg.text)
            pendingFinal = null
          }
          return
        }
        if (msg.event === 'error') {
          const err = new Error(msg.code ? `sarvam_realtime_${msg.code}` : 'sarvam_realtime_error')
          errorCb?.(err)
          if (msg.is_fatal) abort()
          pendingFinal?.reject(err)
          pendingFinal = null
        }
      }

      function connect() {
        const url = realtimeUrl(deps.realtimeUrl, deps)
        socket = new WsImpl(url, {
          headers: { 'api-subscription-key': deps.apiKey },
        })
        socket.on('open', () => {
          pingTimer = setInterval(() => sendJson({ event: 'ping' }), VOICE_LIMITS.clientPingMs)
          if (pingTimer.unref) pingTimer.unref()
          readyResolve()
          flushQueue()
        })
        socket.on('message', handleMessage)
        socket.on('close', () => {
          connectFailed = true
          if (closed) return
          if (pendingFinal) {
            pendingFinal.reject(new Error('sarvam_realtime_disconnected'))
            pendingFinal = null
            errorCb?.(new Error('sarvam_realtime_disconnected'))
            return
          }
          // Provider often closes after a flushed utterance. Do not surface that
          // as a client error; the gateway will open a fresh stream next turn.
          if (!utteranceFinalized) errorCb?.(new Error('sarvam_realtime_disconnected'))
        })
        socket.on('error', () => {
          connectFailed = true
          readyReject(new Error('sarvam_realtime_socket_error'))
          errorCb?.(new Error('sarvam_realtime_socket_error'))
        })
      }

      function abort() {
        closed = true
        utteranceOpen = false
        if (pingTimer) clearInterval(pingTimer)
        pingTimer = null
        if (pendingFinal) {
          clearTimeout(pendingFinal.timer)
          pendingFinal.reject(new Error('stream_aborted'))
          pendingFinal = null
        }
        try {
          sendJson({ event: 'end' })
          socket?.close()
        } catch {
          /* already closed */
        }
        socket = null
        queue.length = 0
      }

      connect()

      return {
        sendAudio(chunk: Buffer) {
          if (closed || connectFailed) return
          if (utteranceFinalized) {
            utteranceFinalized = false
            utteranceOpen = false
          }
          if (socket?.readyState === WebSocket.OPEN) {
            ensureUtterance()
            sendJson({ event: 'audio_input', audio: chunk.toString('base64') })
            return
          }
          if (queue.length >= maxQueued) {
            _droppedFrames += 1
            return
          }
          queue.push(Buffer.from(chunk))
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
          if (closed) throw new Error('stream_aborted')
          if (utteranceFinalized && !pendingFinal) throw new Error('already_finalized')
          try {
            await Promise.race([
              ready,
              new Promise((_, reject) => setTimeout(() => reject(new Error('sarvam_realtime_disconnected')), 4000)),
            ])
          } catch {
            throw new Error('sarvam_realtime_disconnected')
          }
          if (connectFailed && socket?.readyState !== WebSocket.OPEN) {
            throw new Error('sarvam_realtime_disconnected')
          }
          ensureUtterance()
          if (endpointing === 'manual') sendJson({ event: 'speech_end' })
          sendJson({ event: 'flush' })
          return await new Promise<string>((resolve, reject) => {
            pendingFinal = {
              resolve,
              reject,
              timer: setTimeout(() => {
                pendingFinal = null
                reject(new Error('stt_finalize_timeout'))
              }, finalizeTimeoutMs),
            }
          })
        },
        abort,
        isClosed() {
          return closed || connectFailed
        },
        whenReady() {
          return ready
        },
      }
    },
  }
}
