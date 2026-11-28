import { useEffect, useRef, useState } from 'react'
import '../landing.css'
import './firstInterview.css'
import { api, type Profile } from '../lib/api'
import { LiveOrb, type OrbState } from '../components/LiveOrb'
import FallbackNote from '../components/FallbackNote'
import { AudioCapture, pcm16ToBytes } from '../voice/audioCapture'

const MIN = 20 // characters; matches the interview's own minimum
// A single opening question, as a real interview opens. No upload: a résumé belongs with a job you bring, not here.
const ONE_QUESTION = 'Tell me a little about yourself: what you do now, and the kind of role you want next.'


/** Tap the mic to talk, tap again to turn speech into text for the answer box. The text stays editable. */
function useDictation(onText: (text: string) => void) {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const [error, setError] = useState('')
  const capture = useRef<AudioCapture | null>(null)
  const chunks = useRef<Int16Array[]>([])
  const used = useRef(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      capture.current?.stop()
    }
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
        if (!alive.current) return mic.stop() // left the page while the permission prompt was open
        setState('recording')
      } catch {
        mic.stop()
        capture.current = null
        setError('Microphone unavailable. You can type instead.')
      }
      return
    }
    capture.current?.stop()
    capture.current = null
    setState('transcribing') // before any await, so a second tap can't stop and send twice
    const bytes = new Uint8Array(await new Blob(chunks.current.map(pcm16ToBytes)).arrayBuffer())
    if (bytes.length === 0) return setState('idle')
    try {
      const { text } = await api.transcribe(bytes)
      if (text) {
        used.current = true
        onText(text)
      } else setError('I didn’t catch that. Try again, or type it.')
    } catch {
      setError('I couldn’t hear that. Try again, or type it.')
    }
    setState('idle')
  }
  return { state, error, toggle, usedVoice: () => used.current }
}

export default function FirstInterview({
  onDone,
  onBack,
}: {
  onDone: (profile: Profile, saved: boolean) => void
  onBack: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [fellBack, setFellBack] = useState(false)
  const inflight = useRef(false)
  const dictation = useDictation(t => setText(prev => (prev.trim() ? `${prev.trim()} ${t}` : t)))

  const orb: OrbState = dictation.state === 'recording' ? 'listening' : busy || dictation.state === 'transcribing' ? 'thinking' : 'idle'
  const ready = text.trim().length >= MIN

  // One answer is enough: it gives the role, the first focus and the first question, and then the practice starts.
  const send = async () => {
    if (inflight.current) return
    inflight.current = true
    setBusy(true)
    setNote('')
    try {
      const said = text.trim()
      const next = await api.onboardingStep({ step: 'contract', story: said, question: ONE_QUESTION, answer: said })
      if (next.source === 'fallback') setFellBack(true)
      const profile: Profile = {
        role: next.role,
        story: said,
        pressureQuestion: ONE_QUESTION,
        pressureAnswer: said,
        summary: next.summary,
        focus: next.gap,
        firstQuestion: next.firstQuestion,
        resumeText: null,
        resumeName: null,
        mode: dictation.usedVoice() ? 'voice' : 'text',
      }
      let saved = true
      try {
        await api.saveProfile(profile)
      } catch {
        saved = false // keep going: the person shouldn't lose their answer to a storage hiccup
      }
      onDone(profile, saved)
    } catch {
      setNote('That did not go through. What you wrote is still here. Try again.')
    }
    inflight.current = false
    setBusy(false)
  }

  return (
    <div className="mirror-landing ml-fi">
      <header className="ml-nav">
        <div className="ml-glass ml-nav-bar">
          <button type="button" className="ml-logo ml-fi-logo" onClick={onBack}>MIRROR</button>
        </div>
      </header>
      <main className="ml-wrap ml-fi-main">
        <div className="ml-orb ml-fi-orb" data-state={orb} aria-hidden="true"><LiveOrb state={orb} /></div>
        <p className="ml-fi-purpose">MIRROR is practice before the interview. Tell it a little about you, then you are in the room.</p>
        <p className="ml-eyebrow">Start here</p>
        <div aria-live="polite">
          <div className="ml-glass ml-fi-agent">{ONE_QUESTION}</div>
        </div>
        <div className="ml-glass ml-fi-composer">
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Take your time. Say it the way you’d say it out loud."
            aria-label="About you"
            readOnly={busy}
            maxLength={5000}
          />
          <div className="ml-fi-row">
            <button
              type="button"
              className="ml-btn ml-btn--quiet"
              aria-pressed={dictation.state === 'recording'}
              disabled={busy || dictation.state === 'transcribing'}
              onClick={() => void dictation.toggle()}
            >
              {dictation.state === 'recording' ? 'Stop' : dictation.state === 'transcribing' ? 'Listening back…' : 'Speak instead'}
            </button>
            <button type="button" className="ml-btn" disabled={!ready || busy} onClick={() => void send()}>
              {busy ? 'One moment…' : 'Start practising'}
            </button>
          </div>
        </div>
        <p className="ml-fi-note" role="status">
          {dictation.error || note || (text.length > 0 && !ready ? 'A little more, so I have something real to work with.' : '')}
        </p>
        <FallbackNote source={fellBack ? 'fallback' : null} />
      </main>
    </div>
  )
}
