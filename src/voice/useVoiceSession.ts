// Client-side voice-session orchestration for MIRROR.
// The voice server owns canonical state; this hook mirrors it and adds the
// purely client-side `requesting_permission` phase. It wires the WebSocket
// client, mic capture, and TTS playback together and exposes a React-friendly
// surface for the interview UI.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VoiceClient } from './VoiceClient'
import { AudioCapture, pcm16ToBytes } from './audioCapture'
import { AudioPlayback } from './audioPlayback'
import {
  MSG,
  voiceStateToOrbState,
  type OrbState,
  type VoiceState,
} from './protocol'

export type MirroredVoiceState = VoiceState | 'requesting_permission' | 'inactive'

export interface VoiceError {
  code: string
  message: string
  recoverable: boolean
}

export interface VoiceSessionApi {
  voiceState: MirroredVoiceState
  orbState: OrbState
  partialTranscript: string
  finalTranscript: string
  questionText: string
  error: VoiceError | null
  inputLevel: number
  outputLevel: number
  isMuted: boolean
  /** True once the mic is live and the WS session is established. */
  active: boolean
  start: (interviewId: string) => Promise<boolean>
  stop: () => void
  retry: () => void
  interrupt: () => void
  mute: (muted: boolean) => void
  /** Leave voice mode without touching the text composer. */
  continueByTyping: () => void
  /** Finalize the current spoken turn (user finished answering). */
  commitSpokenAnswer: () => void
}

export function useVoiceSession(options: {
  /** Called when a final transcript arrives for the active turn. Exactly once per turn. */
  onFinalTranscript?: (text: string) => void
  /** Called when the server pushes a question (voice turn accepted / next question). */
  onQuestion?: (text: string, questionIndex: number) => void
  /** Called when the voice session completes (server state `completed`). */
  onCompleted?: () => void
} = {}): VoiceSessionApi {
  const [voiceState, setVoiceState] = useState<MirroredVoiceState>('inactive')
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [error, setError] = useState<VoiceError | null>(null)
  const [inputLevel, setInputLevel] = useState(0)
  const [outputLevel, setOutputLevel] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [active, setActive] = useState(false)

  const optionsRef = useRef(options)
  optionsRef.current = options
  const interviewIdRef = useRef<string | null>(null)

  const clientRef = useRef<VoiceClient | null>(null)
  const captureRef = useRef<AudioCapture | null>(null)
  const playbackRef = useRef<AudioPlayback | null>(null)
  // Track which turnId has already produced a final transcript / playback_complete.
  const finalizedTurnsRef = useRef(new Set<string>())
  const playbackCompletedRef = useRef(new Set<string>())
  const finalizeSentRef = useRef(new Set<string>())
  const lastTurnIdRef = useRef<string | null>(null)
  // True while the server is speaking: mic chunks are suppressed (half-duplex).
  const serverSpeakingRef = useRef(false)
  const stoppedByUserRef = useRef(false)

  const syncState = useCallback((state: VoiceState) => {
    setVoiceState(state)
    setOrbState(voiceStateToOrbState(state))
    if (state === 'listening') serverSpeakingRef.current = false
    if (state === 'speaking') serverSpeakingRef.current = true
    if (state === 'completed') optionsRef.current.onCompleted?.()
  }, [])

  const teardown = useCallback((nextState: MirroredVoiceState = 'inactive') => {
    clientRef.current?.close('client_stop')
    clientRef.current = null
    captureRef.current?.stop()
    captureRef.current = null
    playbackRef.current?.dispose()
    playbackRef.current = null
    finalizedTurnsRef.current.clear()
    playbackCompletedRef.current.clear()
    finalizeSentRef.current.clear()
    lastTurnIdRef.current = null
    serverSpeakingRef.current = false
    setVoiceState(nextState)
    setOrbState('idle')
    setPartialTranscript('')
    setFinalTranscript('')
    setQuestionText('')
    setError(null)
    setInputLevel(0)
    setOutputLevel(0)
    setIsMuted(false)
    setActive(false)
  }, [])

  const start = useCallback(async (interviewId: string): Promise<boolean> => {
    stoppedByUserRef.current = false
    setError(null)
    setPartialTranscript('')
    setFinalTranscript('')
    interviewIdRef.current = interviewId

    // 1. Mic permission is a purely client-side, user-gated phase.
    setVoiceState('requesting_permission')
    setOrbState('idle')
    const capture = new AudioCapture({
      onChunk: chunk => {
        // Half-duplex: never send mic audio while the server is speaking.
        if (serverSpeakingRef.current) return
        clientRef.current?.sendAudioChunk(pcm16ToBytes(chunk))
      },
      onLevel: level => setInputLevel(level),
      onError: err => {
        setError({ code: 'mic_error', message: err.message, recoverable: true })
        setVoiceState('error')
      },
    })
    captureRef.current = capture
    try {
      await capture.start()
    } catch {
      setVoiceState('error')
      setActive(false)
      return false
    }
    setIsMuted(false)

    // 2. Connect to the voice gateway.
    setVoiceState('connecting')
    const client = new VoiceClient()
    clientRef.current = client

    client.on(MSG.PARTIAL_TRANSCRIPT, payload => {
      const { text } = payload as { text: string }
      setPartialTranscript(text) // UI only — never submitted.
    })

    client.on(MSG.FINAL_TRANSCRIPT, payload => {
      const { text } = payload as { text: string; confidence?: number }
      const turnId = client.currentTurnId ?? lastTurnIdRef.current
      // Swallow duplicates for the same turn.
      if (turnId && finalizedTurnsRef.current.has(turnId)) return
      if (turnId) finalizedTurnsRef.current.add(turnId)
      setFinalTranscript(text)
      setPartialTranscript('')
      optionsRef.current.onFinalTranscript?.(text)
    })

    client.on(MSG.QUESTION, payload => {
      const { turnId, text, questionIndex } = payload as { turnId: string; text: string; questionIndex: number }
      lastTurnIdRef.current = turnId
      playbackCompletedRef.current.delete(turnId)
      finalizedTurnsRef.current.delete(turnId)
      setQuestionText(text)
      setFinalTranscript('')
      setPartialTranscript('')
      optionsRef.current.onQuestion?.(text, questionIndex)
    })

    client.on(MSG.TTS_START, payload => {
      const { turnId } = payload as { turnId: string }
      lastTurnIdRef.current = turnId
      playbackCompletedRef.current.delete(turnId)
      playbackRef.current?.startTurn(turnId)
    })

    client.on(MSG.TTS_AUDIO, payload => {
      const data = payload as ArrayBuffer | Blob
      if (data instanceof Blob) {
        void data.arrayBuffer().then(buf => playbackRef.current?.enqueue(buf))
        return
      }
      playbackRef.current?.enqueue(data)
    })

    client.on(MSG.TURN_ACCEPTED, payload => {
      const { turnId } = payload as { turnId: string; questionIndex: number }
      lastTurnIdRef.current = turnId
      playbackCompletedRef.current.delete(turnId)
      finalizedTurnsRef.current.delete(turnId)
    })

    client.on(MSG.TURN_REJECTED, payload => {
      const { reason, code } = payload as { turnId: string; reason: string; code: string }
      const turnId = client.currentTurnId ?? lastTurnIdRef.current
      if (turnId) finalizeSentRef.current.delete(turnId)
      const message =
        code === 'empty_transcript'
          ? 'No speech detected. Try speaking again, or type instead.'
          : code === 'turn_too_long'
            ? reason
            : reason
      setError({ code, message, recoverable: true })
      setPartialTranscript('')
    })

    client.on(MSG.STATE, payload => {
      const { state } = payload as { state: VoiceState }
      syncState(state)
    })

    client.on(MSG.TTS_END, () => {
      /* playback_complete is sent from AudioPlayback.onComplete */
    })

    client.on(MSG.ERROR, payload => {
      const err = payload as { code: string; message: string; recoverable: boolean }
      setError(err)
      if (err.code === 'turn_too_long') {
        const turnId = client.currentTurnId ?? lastTurnIdRef.current
        if (turnId) finalizeSentRef.current.delete(turnId)
      }
      if (!err.recoverable) setVoiceState('error')
    })

    client.on(MSG.CLOSE_SERVER, payload => {
      const { reason } = payload as { reason?: string }
      if (stoppedByUserRef.current) return
      setError({ code: 'server_close', message: reason ?? 'Voice session closed by server.', recoverable: true })
      syncState('error')
    })

    const playback = new AudioPlayback({
      onComplete: turnId => {
        // Send playback_complete exactly once per turn.
        if (playbackCompletedRef.current.has(turnId)) return
        playbackCompletedRef.current.add(turnId)
        client.playbackComplete(turnId)
      },
      onLevel: level => setOutputLevel(level),
    })
    playbackRef.current = playback

    try {
      await client.connect(interviewId)
    } catch {
      // Gateway unreachable: surface a recoverable error, keep text flow alive.
      capture.stop()
      captureRef.current = null
      setError({ code: 'connection_failed', message: 'Voice service unreachable — continuing with typing.', recoverable: true })
      setVoiceState('error')
      setActive(false)
      return false
    }

    setActive(true)
    return true
  }, [syncState])

  const stop = useCallback(() => {
    stoppedByUserRef.current = true
    teardown()
  }, [teardown])

  const retry = useCallback(() => {
    const interviewId = interviewIdRef.current
    if (!interviewId) return
    setError(null)
    void start(interviewId)
  }, [start])

  const interrupt = useCallback(() => {
    const client = clientRef.current
    if (!client) return
    const turnId = client.currentTurnId ?? undefined
    client.interrupt(turnId)
    playbackRef.current?.cancel()
    serverSpeakingRef.current = false
  }, [])

  const mute = useCallback((muted: boolean) => {
    setIsMuted(muted)
    captureRef.current?.mute(muted)
    clientRef.current?.mute(muted)
  }, [])

  const continueByTyping = useCallback(() => {
    stop()
  }, [stop])

  const commitSpokenAnswer = useCallback(() => {
    const client = clientRef.current
    if (!client) return
    const turnId = client.currentTurnId ?? lastTurnIdRef.current
    if (!turnId || finalizeSentRef.current.has(turnId)) return
    finalizeSentRef.current.add(turnId)
    client.finalizeTurn(turnId)
  }, [])

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      stoppedByUserRef.current = true
      clientRef.current?.close('unmount')
      captureRef.current?.stop()
      playbackRef.current?.dispose()
    }
  }, [])

  return useMemo(() => ({
    voiceState,
    orbState,
    partialTranscript,
    finalTranscript,
    questionText,
    error,
    inputLevel,
    outputLevel,
    isMuted,
    active,
    start,
    stop,
    retry,
    interrupt,
    mute,
    continueByTyping,
    commitSpokenAnswer,
  }), [
    voiceState, orbState, partialTranscript, finalTranscript, questionText, error,
    inputLevel, outputLevel, isMuted, active, start, stop, retry, interrupt, mute, continueByTyping, commitSpokenAnswer,
  ])
}
