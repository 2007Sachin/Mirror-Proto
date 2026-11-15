import { useEffect, useRef, useState } from 'react'
import '../landing.css'
import './firstInterview.css'
import { api, ApiError, type Profile } from '../lib/api'
import { LiveOrb, type OrbState } from '../components/LiveOrb'
import { AudioCapture, pcm16ToBytes } from '../voice/audioCapture'

const MIN = 20 // characters; matches the interview's own minimum
const SKIPPED_PROMPT = 'Tell me the last thing you did at work that you’re actually proud of. One story. No LinkedIn language.'
const EYEBROW = { story: 'Start with what you’ve done', pressure: 'One question', contract: 'Here’s what I heard' } as const

type Step = keyof typeof EYEBROW
type Contract = { summary: string; gap: string; role: string; firstQuestion: string }

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
  const [step, setStep] = useState<Step>('story')
  const [text, setText] = useState('')
  const [resume, setResume] = useState('')
  const [fileName, setFileName] = useState('')
  const [opening, setOpening] = useState('')
  const [story, setStory] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [contract, setContract] = useState<Contract | null>(null)
  const [other, setOther] = useState(false)
  const [reading, setReading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [note, setNote] = useState('')
  const inflight = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const dictation = useDictation(t => setText(prev => (prev.trim() ? `${prev.trim()} ${t}` : t)))

  const working = busy || reading
  const orb: OrbState = dictation.state === 'recording' ? 'listening' : working || dictation.state === 'transcribing' ? 'thinking' : 'idle'
  const ready = text.trim().length >= MIN

  const run = async (job: () => Promise<void>) => {
    if (inflight.current) return
    inflight.current = true
    setBusy(true)
    setNote('')
    try {
      await job()
    } catch {
      setNote('Something went wrong. Try again.')
    }
    inflight.current = false
    setBusy(false)
  }

  const takeFile = async (file: File | undefined) => {
    if (!file || reading || inflight.current) return
    setNote('')
    setReading(true)
    try {
      const { text: resumeText } = await api.resume(file)
      const { text: line } = await api.onboardingStep({ step: 'opening', resume: resumeText })
      setResume(resumeText)
      setFileName(file.name)
      setOpening(line)
    } catch (err) {
      setNote(
        err instanceof ApiError && err.status === 422
          ? 'I couldn’t find any text in that PDF. You can just start talking.'
          : 'I couldn’t use that file. You can just start talking.',
      )
    }
    setReading(false)
  }

  const removeFile = () => {
    setResume('')
    setFileName('')
    setOpening('')
  }

  const send = () =>
    run(async () => {
      const said = text.trim()
      if (step === 'story') {
        const next = await api.onboardingStep({ step: 'pressure', story: said, resume: resume || undefined })
        setStory(said)
        setQuestion(next.question)
        setStep('pressure')
      } else {
        const next = await api.onboardingStep({ step: 'contract', story, question, answer: said, resume: resume || undefined })
        setAnswer(said)
        setContract(next as Contract)
        setStep('contract')
      }
      setText('')
    })

  const finish = (focus: string, firstQuestion: string) =>
    run(async () => {
      const profile: Profile = {
        role: contract!.role,
        story,
        pressureQuestion: question,
        pressureAnswer: answer,
        summary: contract!.summary,
        focus,
        firstQuestion,
        resumeText: resume || null,
        resumeName: fileName || null,
        mode: dictation.usedVoice() ? 'voice' : 'text',
      }
      let saved = true
      try {
        await api.saveProfile(profile)
      } catch {
        saved = false // keep going: the person shouldn't lose the conversation to a storage hiccup
      }
      onDone(profile, saved)
    })

  const agent = step === 'story' ? opening || SKIPPED_PROMPT : step === 'pressure' ? question : contract!.summary
  const stepNumber = step === 'story' ? 1 : step === 'pressure' ? 2 : 3

  return (
    <div className="mirror-landing ml-fi">
      <header className="ml-nav">
        <div className="ml-glass ml-nav-bar">
          <button type="button" className="ml-logo ml-fi-logo" onClick={onBack}>MIRROR</button>
          <ol className="ml-fi-steps" aria-label="Where you are">
            {[1, 2, 3].map(n => (
              <li key={n} aria-current={n === stepNumber ? 'step' : undefined} className={n <= stepNumber ? 'is-on' : ''}>
                <span className="ml-sr">Moment {n}</span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className="ml-wrap ml-fi-main">
        <div className="ml-orb ml-fi-orb" data-state={orb} aria-hidden="true"><LiveOrb state={orb} /></div>
        <p className="ml-eyebrow">{EYEBROW[step]}</p>
        <div aria-live="polite">
          <div className="ml-glass ml-fi-agent" key={`${step}-${agent}`}>{agent}</div>
        </div>

        {step === 'story' && (
          <div
            className={`ml-fi-drop${over ? ' is-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); void takeFile(e.dataTransfer.files[0]) }}
          >
            <input ref={fileInput} type="file" accept="application/pdf,.pdf" hidden onChange={e => { void takeFile(e.target.files?.[0]); e.target.value = '' }} />
            {fileName ? (
              <span className="ml-fi-file">
                {fileName}
                <button type="button" onClick={removeFile} aria-label={`Remove ${fileName}`}>Remove</button>
              </span>
            ) : (
              <>
                <span>{reading ? 'Reading it…' : 'Upload your resume or LinkedIn PDF, or just start talking.'}</span>
                {!reading && <button type="button" className="ml-fi-pick" onClick={() => fileInput.current?.click()}>Choose a PDF</button>}
              </>
            )}
          </div>
        )}

        {step !== 'contract' ? (
          <div className="ml-glass ml-fi-composer">
            <textarea
              key={step}
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={step === 'story' ? 'What happened, and what did you do?' : 'Take your time. Say it the way you’d say it out loud.'}
              aria-label={step === 'story' ? 'Your story' : 'Your answer'}
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
              <button type="button" className="ml-btn" disabled={!ready || working} onClick={() => void send()}>
                {step === 'story' ? 'Continue' : 'Answer'}
              </button>
            </div>
          </div>
        ) : (
          <div className="ml-fi-contract">
            <p className="ml-fi-ask">
              The biggest gap I see for the roles you want is <b>{contract!.gap}</b>. Want me to attack that first, or do you have something else?
            </p>
            <div className="ml-fi-options">
              <button type="button" className="ml-btn" disabled={busy} onClick={() => void finish(contract!.gap, contract!.firstQuestion)}>
                Attack that first
              </button>
              <button type="button" className="ml-btn ml-btn--quiet" aria-expanded={other} disabled={busy} onClick={() => { setOther(o => !o); setText('') }}>
                Something else
              </button>
            </div>
            {other && (
              <div className="ml-glass ml-fi-composer">
                <textarea autoFocus maxLength={280} value={text} onChange={e => setText(e.target.value)} placeholder="What should we work on first?" aria-label="What to work on first" />
                <div className="ml-fi-row">
                  <button
                    type="button"
                    className="ml-btn"
                    disabled={text.trim().length < 3 || busy}
                    onClick={() => void finish(text.trim(), `You said you want to work on “${text.trim()}”. Tell me about a real moment where that mattered.`)}
                  >
                    Start
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="ml-fi-note" role="status">
          {dictation.error || note || (text.length > 0 && !ready && step !== 'contract' ? 'A little more, so I have something real to work with.' : '')}
        </p>
      </main>
    </div>
  )
}
