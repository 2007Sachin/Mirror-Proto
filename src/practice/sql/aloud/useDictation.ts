import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../../../lib/api'
import { AudioCapture, pcm16ToBytes } from '../../../voice/audioCapture'

// ponytail: a COPY of useDictation from src/pages/FirstInterview.tsx (that file is not ours to edit), plus a "voice not set up" state.
// Merge the two into one shared hook when someone owns both files.
/** Tap the mic to talk, tap again to turn speech into text. Audio is sent once and not kept. */
export function useDictation(onText: (text: string) => void) {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(false)
  const capture = useRef<AudioCapture | null>(null)
  const chunks = useRef<Int16Array[]>([])
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; capture.current?.stop() }
  }, [])

  const toggle = async () => {
    setError('')
    if (state === 'transcribing') return
    if (state === 'idle') {
      chunks.current = []
      const mic = new AudioCapture({ onChunk: chunk => chunks.current.push(chunk) })
      capture.current = mic
      try {
        await mic.start()
        if (!alive.current) return mic.stop()
        setState('recording')
      } catch {
        mic.stop(); capture.current = null
        setError('Microphone unavailable. You can type instead.')
      }
      return
    }
    capture.current?.stop(); capture.current = null
    setState('transcribing')
    const bytes = new Uint8Array(await new Blob(chunks.current.map(pcm16ToBytes)).arrayBuffer())
    chunks.current = [] // no audio is kept after the upload
    if (bytes.length === 0) return setState('idle')
    try {
      const { text } = await api.transcribe(bytes)
      if (text) onText(text)
      else setError('I didn’t catch that. Try again, or type it.')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'voice_unavailable') setUnavailable(true)
      else setError('I couldn’t hear that. Try again, or type it.')
    }
    setState('idle')
  }
  return { state, error, unavailable, toggle }
}
