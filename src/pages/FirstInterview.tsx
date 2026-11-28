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


/** RMS loudness of a PCM chunk, 0..1 (speech is usually well under 0.3, so it is boosted for display). */
const loudness = (c: Int16Array) => {
  let sum = 0
  for (let i = 0; i < c.length; i++) sum += (c[i] / 32768) ** 2
  return Math.min(1, Math.sqrt(sum / Math.max(1, c.length)) * 5)
}
const LIVE_EVERY_MS = 3500 // how often what you have said so far is turned into text while you speak

/**
 * Tap the mic to talk, tap again to stop. While you speak, every few seconds the newest audio is turned into text and added
 * to the answer box, so you can see what MIRROR heard. `level` is how loud you are right now (it drives the orb). The text stays editable.
 */
function useDictation(onText: (text: string) => void) {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const [error, setError] = useState('')
  const [level, setLevel] = useState(0)
  const capture = useRef<AudioCapture | null>(null)
  const chunks = useRef<Int16Array[]>([])
  const used = useRef(false)
  const alive = useRef(true)
  const timer = useRef(0)
  const queue = useRef<Promise<void>>(Promise.resolve()) // sends go one after another, so the text stays in order
  const onTextRef = useRef(onText)
  useEffect(() => { onTextRef.current = onText })

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      window.clearInterval(timer.current)
      capture.current?.stop()
    }
  }, [])

  /** Sends what has been recorded since the last send. Resolves when its text has been added. */
  const flush = () => {
    const part = chunks.current.splice(0)
    if (part.length === 0) return queue.current
    queue.current = queue.current.then(async () => {
      const bytes = new Uint8Array(await new Blob(part.map(pcm16ToBytes)).arrayBuffer())
      if (bytes.length < 3200) return // under 0.1 second: nothing to hear
      try {
        const { text } = await api.transcribe(bytes)
        if (text && alive.current) { used.current = true; onTextRef.current(text) }
      } catch {
        if (alive.current) setError('I missed a bit. You can fix it in the box or say it again.')
      }
    })
    return queue.current
  }

  const toggle = async () => {
    setError('')
    if (state === 'transcribing') return
    if (state === 'idle') {
      chunks.current = []
      const mic = new AudioCapture({ onChunk: chunk => { chunks.current.push(chunk); setLevel(loudness(chunk)) } })
      capture.current = mic
      try {
        await mic.start()
        if (!alive.current) return mic.stop() // left the page while the permission prompt was open
        setState('recording')
        timer.current = window.setInterval(() => { void flush() }, LIVE_EVERY_MS)
      } catch {
        mic.stop()
        capture.current = null
        setError('Microphone unavailable. You can type instead.')
      }
      return
    }
    window.clearInterval(timer.current)
    capture.current?.stop()
    capture.current = null
    setLevel(0)
    setState('transcribing') // before any await, so a second tap can't stop and send twice
    await flush()
    if (alive.current) { if (!used.current) setError('I didn’t catch that. Try again, or type it.'); setState('idle') }
  }
  return { state, error, level, toggle, usedVoice: () => used.current }
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

  // The orb reacts to you: each keystroke or word gives it a push that fades, so it is alive while you type.
  const [typing, setTyping] = useState(0)
  useEffect(() => {
    if (typing <= 0) return
    const id = window.setTimeout(() => setTyping(t => Math.max(0, t - 0.12)), 80)
    return () => window.clearTimeout(id)
  }, [typing])
  const orb: OrbState = dictation.state === 'recording' || typing > 0 ? 'listening' : busy || dictation.state === 'transcribing' ? 'thinking' : 'idle'
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

  // The room wakes up in beats: a hello, a calm line, then the question word by word, then the input rises.
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [beat, setBeat] = useState(reduce ? 3 : 0)
  useEffect(() => {
    if (beat >= 3) return
    const id = window.setTimeout(() => setBeat(b => b + 1), beat === 0 ? 1500 : beat === 1 ? 1700 : 2400)
    return () => window.clearTimeout(id)
  }, [beat])
  const box = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
    el.scrollTop = el.scrollHeight // keep the newest words in view while you speak
  }, [text])
  const words = ONE_QUESTION.split(' ')
  const caption = dictation.state === 'recording' ? (text.trim() ? 'I’m listening. Your words appear below.' : 'I’m listening. Go ahead.') : dictation.state === 'transcribing' ? 'Writing down the last bit…' : busy ? 'One moment.' : typing > 0 ? 'I’m with you.' : beat >= 3 ? 'Take your time.' : ''

  return (
    <div className="mirror-landing ml-fi" data-state={orb} data-beat={beat} style={{ ['--lvl' as string]: String(Math.min(1, Math.max(typing, dictation.level))) }}>
      <div className="ml-fi-glow" aria-hidden="true" />
      <header className="ml-fi-top">
        <button type="button" className="ml-fi-logo" onClick={onBack}>MIRROR</button>
      </header>
      <main className="ml-fi-main" aria-labelledby="fi-q">
        <div className="ml-fi-stage" aria-hidden="true">
          <div className="ml-fi-orb"><LiveOrb state={orb} inputLevel={Math.max(typing, dictation.level)} /></div>
        </div>
        <div className="ml-fi-center">
        <p className="ml-fi-hello" aria-live="polite">
          <span className="ml-fi-line is-on">Hi, I’m MIRROR.</span>
          <span className={`ml-fi-line${beat >= 1 ? ' is-on' : ''}`}>No one is judging this. It’s just a conversation.</span>
        </p>
        <h1 id="fi-q" className={`ml-fi-question${beat >= 2 ? ' is-on' : ''}`} aria-label={ONE_QUESTION}>
          {words.map((w, i) => <span key={i} aria-hidden="true" style={{ ['--i' as string]: i }}>{w} </span>)}
        </h1>
        </div>
        <div className={`ml-fi-dock${beat >= 3 ? ' is-on' : ''}`}>
          <p className="ml-fi-caption" role="status">{dictation.error || note || (text.length > 0 && !ready ? 'A little more, so I have something real to work with.' : caption)}</p>
          <div className="ml-fi-bar">
            <textarea
              ref={box}
              autoFocus
              rows={2}
              value={text}
              onChange={e => { setText(e.target.value); setTyping(0.9) }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && ready && !busy) void send() }}
              placeholder="Say it the way you’d say it out loud…"
              aria-label="About you"
              readOnly={busy}
              maxLength={5000}
              tabIndex={beat >= 3 ? 0 : -1}
            />
            <button type="button" className="ml-fi-round" aria-pressed={dictation.state === 'recording'} aria-label={dictation.state === 'recording' ? 'Stop speaking' : 'Speak instead'} disabled={busy || dictation.state === 'transcribing'} onClick={() => void dictation.toggle()}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>
            <button type="button" className="ml-fi-round ml-fi-round--go" aria-label="Start practising" disabled={!ready || busy} onClick={() => void send()}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
          <p className="ml-fi-hint">Press Ctrl or Cmd and Enter to start. You can also speak.</p>
          <FallbackNote source={fellBack ? 'fallback' : null} />
        </div>
      </main>
    </div>
  )
}
