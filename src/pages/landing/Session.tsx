import { useEffect, useReducer } from 'react'
import { LiveOrb, type OrbState } from '../../components/LiveOrb'

const QUESTIONS = [
  'Tell me about a project you worked on.',
  'What was your part in it, specifically?',
  'What was the hardest call, and how did you make it?',
  'What would you do differently now?',
]
const ANSWERS = [
  'So, um… it was a group project, and we basically rebuilt the checkout flow…',
  'I owned the payment step, and I wrote the retry logic…',
  'We had to choose between speed and safety, so I tested both…',
  'I’d write the handover notes earlier, honestly.',
]

type Phase = 'idle' | 'asking' | 'listening' | 'thinking' | 'done'
type State = { q: number; phase: Phase; t: number; playing: boolean }
type Action = 'play' | 'pause' | 'next' | 'tick'

const TICK = 50
const HOLD: Record<Phase, number> = { idle: 0, asking: 3200, listening: 3400, thinking: 1400, done: 0 }
const ASK_MS = 22 // per character
const ANSWER_MS = 28

const ORB: Record<Phase, OrbState> = { idle: 'idle', asking: 'speaking', listening: 'listening', thinking: 'thinking', done: 'idle' }
const PILL: Record<Phase, string> = {
  idle: 'Ready when you are',
  asking: 'MIRROR is asking…',
  listening: 'Listening to you…',
  thinking: 'Thinking about what you said…',
  done: 'Your notes are ready',
}

function reducer(s: State, a: Action): State {
  switch (a) {
    case 'play':
      return s.phase === 'idle' || s.phase === 'done' ? { q: 0, phase: 'asking', t: 0, playing: true } : { ...s, playing: true }
    case 'pause':
      return { ...s, playing: false }
    case 'next':
      if (s.phase === 'idle' || s.phase === 'done') return reducer(s, 'play')
      if (s.q === QUESTIONS.length - 1) return { ...s, phase: 'done', t: 0, playing: false }
      return { q: s.q + 1, phase: 'asking', t: 0, playing: true }
    case 'tick': {
      if (!s.playing) return s
      const t = s.t + TICK
      if (t < HOLD[s.phase]) return { ...s, t }
      if (s.phase === 'asking') return { ...s, phase: 'listening', t: 0 }
      if (s.phase === 'listening') return { ...s, phase: 'thinking', t: 0 }
      if (s.q < QUESTIONS.length - 1) return { q: s.q + 1, phase: 'asking', t: 0, playing: true }
      return { ...s, phase: 'done', t: 0, playing: false }
    }
  }
}

export default function Session({ reduced }: { reduced: boolean }) {
  const [s, send] = useReducer(reducer, { q: 0, phase: 'idle', t: 0, playing: false })

  useEffect(() => {
    if (!s.playing) return
    const id = window.setInterval(() => send('tick'), TICK)
    return () => window.clearInterval(id)
  }, [s.playing])

  const question = QUESTIONS[s.q]
  const answer = ANSWERS[s.q]
  const typed = (text: string, ms: number) => (reduced ? text : text.slice(0, Math.floor(s.t / ms)))

  const caption =
    s.phase === 'idle' ? 'Press play to begin.'
    : s.phase === 'done' ? 'That’s the session. Your notes are ready.'
    : s.phase === 'asking' ? typed(question, ASK_MS)
    : question
  const yours =
    s.phase === 'idle' ? 'Your words appear here as you speak.'
    : s.phase === 'done' ? 'See them just below.'
    : s.phase === 'asking' ? '…'
    : s.phase === 'listening' ? typed(answer, ANSWER_MS)
    : answer

  // Announced once per phase, never per character.
  const spoken =
    s.phase === 'asking' ? `MIRROR asks: ${question}`
    : s.phase === 'listening' ? `You answer: ${answer}`
    : s.phase === 'done' ? 'That’s the session. Your notes are ready.'
    : ''

  const started = s.phase !== 'idle'
  const progress = s.phase === 'done' ? 100 : started ? ((s.q + 1) / QUESTIONS.length) * 100 : 0
  const primary = s.playing ? 'Pause' : s.phase === 'done' ? 'Replay' : started ? 'Resume' : 'Play sample session'

  return (
    <div className="ml-glass ml-call">
      <div className="ml-call-bar">
        <span className="ml-call-dots" aria-hidden="true"><i /><i /><i /></span>
        <span>Sample session{started && s.phase !== 'done' ? ` · Question ${s.q + 1}` : ''}</span>
        <span className="ml-safe">Audio isn’t stored</span>
      </div>
      <div className="ml-call-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>

      <div className="ml-room">
        <div className="ml-room-main">
          <span className="ml-name">MIRROR</span>
          <div className="ml-orb ml-orb--call" data-state={ORB[s.phase]} aria-hidden="true">
            <LiveOrb state={ORB[s.phase]} />
          </div>
          <p className="ml-pill" aria-hidden="true">{PILL[s.phase]}</p>
          <p className="ml-caption" aria-hidden="true">{caption}</p>
        </div>
        <div className="ml-room-side" aria-hidden="true">
          <div className="ml-tile" data-on={s.phase === 'listening' ? '1' : '0'}>
            <span className="ml-name ml-name--static">You</span>
            <span className="ml-avatar">You</span>
            <span className="ml-wave"><i /><i /><i /><i /><i /></span>
          </div>
          <div className="ml-tile"><p className="ml-yours">{yours}</p></div>
        </div>
      </div>
      <p className="ml-sr" role="status" aria-live="polite">{spoken}</p>

      <div className="ml-call-tools">
        <button type="button" className="ml-btn" onClick={() => send(s.playing ? 'pause' : 'play')}>{primary}</button>
        <button type="button" className="ml-btn ml-btn--quiet" onClick={() => send('next')}>Next question</button>
      </div>
    </div>
  )
}
