import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import '../landing.css'
import './interview.css'
import { LiveOrb, type OrbState } from '../components/LiveOrb'
import { CHANGED, DID, countWords } from '../lib/analyse'
import ReplayPanel from '../features/replay/ReplayPanel'
import type { VoiceSessionApi } from '../voice/useVoiceSession'
import { screenLine, screenMilestone } from '../features/screen/countdown'
import { ArrowRight, Captions, CircleHelp, Mic, MicOff, MessageSquare, Pause, Play, Repeat, RotateCcw, Square, Volume2, VolumeX, X } from 'lucide-react'

const MIN = 20 // characters; matches the interview's own minimum
const draftKey = (sessionId: string | null, index: number) => `mirror.draft.${sessionId ?? 'none'}:${index}`

const readDraft = (key: string): string => {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
}
const writeDraft = (key: string, value: string) => {
  try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key) } catch { /* storage can be blocked */ }
}

const DESKTOP = '(min-width: 960px)'
const REDUCED = '(prefers-reduced-motion: reduce)'
const matches = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// The keyword rules live in lib/analyse.ts so Replay, the screen debrief and Stories read answers the same way.
const coverage = (t: string) => ({ happened: countWords(t) > 30, did: DID.test(t), changed: CHANGED.test(t) })

/** Reveals `text` word by word while `active` (about 3.2 words a second, at most 12 seconds). Returns how many words to show and a replay trigger. */
function useReveal(text: string, active: boolean) {
  const total = countWords(text)
  const [run, setRun] = useState(0)
  const [forced, setForced] = useState(false)
  const key = `${text}|${run}`
  const [st, setSt] = useState({ key, n: 0 })
  if (st.key !== key) setSt({ key, n: 0 })
  const live = (active || forced) && !matches(REDUCED)
  useEffect(() => {
    if (!live || total === 0) return
    const id = window.setInterval(() => {
      setSt(s => {
        if (s.n + 1 >= total) { window.clearInterval(id); setForced(false) }
        return s.key === key ? { key, n: s.n + 1 } : s
      })
    }, Math.min(1000 / 3.2, 12000 / total))
    return () => window.clearInterval(id)
  }, [live, key, total])
  const shown = live ? (st.key === key ? st.n : 0) : total
  return { shown, replay: () => { setForced(true); setRun(r => r + 1) } }
}

export type InterviewProps = {
  question: string
  questionIndex: number
  /** Number of calm progress dots. */
  totalDots: number
  isLast: boolean
  /** What this practice stays on, when known. */
  focusLabel?: string
  answers: { question: string; answer: string }[]
  orb: OrbState
  voice: VoiceSessionApi
  /** Calm status line from the interview flow, if any. */
  flowText: string | null
  /** The last request failed in a way "Try again" can fix. */
  canRetry: boolean
  /** The next question is still being made. */
  waiting: boolean
  busy: boolean
  answer: string
  setAnswer: (value: string) => void
  sessionId: string | null
  onSubmit: () => void
  onRetry: () => void
  onContinueLater: () => void
  onEnd: () => void
  onSwitchToType: () => void
  onSwitchToSpeak: () => void
  /** Adds a Replay tab: a calm look at the latest answer and a way to say it again. */
  replay?: boolean
  /** Realistic screening call: no hints, no tips, no counts, a calm time line, and a plain way to end. */
  screen?: { remainingSeconds: number | null; totalSeconds: number | null; onEnd: () => void }
}

const SHORTCUTS: [string, string][] = [['M', 'Mute or unmute'], ['K', 'Pause or resume'], ['C', 'Captions on or off'], ['T', 'Switch between speaking and typing'], ['P', 'Show or hide the side panel'], ['R', 'Repeat the question'], ['Esc', 'Close a dialog or panel']]

export default function Interview(p: InterviewProps) {
  const { voice, answer, setAnswer } = p
  const sc = p.screen
  const [confirming, setConfirming] = useState(false)
  const [panel, setPanel] = useState(() => matches(DESKTOP))
  const [desktop, setDesktop] = useState(() => matches(DESKTOP))
  const [tab, setTab] = useState<'chat' | 'tips' | 'replay'>('chat')
  const [captions, setCaptions] = useState(true)
  const [help, setHelp] = useState(false)
  const [sec, setSec] = useState(0)
  // A pause stops the session clock and the microphone; a screening call cannot be paused (its clock is the server's).
  const [paused, setPaused] = useState(false)
  const [pauseSec, setPauseSec] = useState(0)
  const wasMuted = useRef(false)
  const resumeBtn = useRef<HTMLButtonElement>(null)
  const [answerFrom, setAnswerFrom] = useState({ q: p.questionIndex, at: 0 })
  const [speakFrom, setSpeakFrom] = useState<number | null>(null)
  const [t0] = useState(() => Date.now())
  const [stamps, setStamps] = useState<string[]>([])
  const area = useRef<HTMLTextAreaElement>(null)
  const endBtn = useRef<HTMLButtonElement>(null)
  const keepBtn = useRef<HTMLButtonElement>(null)
  const typeRadio = useRef<HTMLButtonElement>(null)
  const speakRadio = useRef<HTMLButtonElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const stuck = useRef(true)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const lastMode = useRef<boolean | null>(null)

  const speaking = voice.active || voice.voiceState === 'requesting_permission'
  const key = draftKey(p.sessionId, p.questionIndex)

  // Per-question timers (whole seconds, no clock reads during render).
  if (answerFrom.q !== p.questionIndex) { setAnswerFrom({ q: p.questionIndex, at: sec }); setSpeakFrom(null) }
  // Times for the chat bubbles, noted as answers arrive.
  if (stamps.length < p.answers.length) setStamps([...stamps, ...Array.from({ length: p.answers.length - stamps.length }, () => new Date(t0 + sec * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))])
  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => setSec(s => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [paused])
  useEffect(() => {
    if (!paused) return
    const id = window.setInterval(() => setPauseSec(s => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [paused])
  useEffect(() => { if (paused) resumeBtn.current?.focus() }, [paused])

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP)
    const on = () => setDesktop(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Restore a saved draft when you land on (or return to) a question.
  useEffect(() => {
    const saved = readDraft(key)
    if (saved) setAnswer(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the question changes
  }, [key])

  // Drafts for questions already answered are not needed any more.
  useEffect(() => {
    for (let i = 0; i < p.questionIndex; i += 1) writeDraft(draftKey(p.sessionId, i), '')
  }, [p.sessionId, p.questionIndex])

  // Grow with the text.
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [answer, speaking, panel])

  // Moving to typing puts the cursor in the box.
  useEffect(() => {
    if (lastMode.current === true && !speaking && panel) area.current?.focus()
    lastMode.current = speaking
  }, [speaking, panel])

  const change = (value: string) => { setAnswer(value); writeDraft(key, value) }

  const spoken = [voice.finalTranscript, voice.partialTranscript].filter(Boolean).join(' ')
  const hasSpoken = Boolean(spoken)
  if (speaking && hasSpoken && speakFrom === null) setSpeakFrom(sec)

  const words = countWords(answer)
  const ready = answer.trim().length >= MIN
  const canSend = ready && !p.busy && !p.waiting
  const canSpeakSend = voice.active && voice.voiceState === 'listening' && hasSpoken
  const sendOk = !paused && (speaking ? canSpeakSend : canSend)

  const mic = speaking && voice.active
  const muted = mic && voice.isMuted
  const thinking = p.busy || p.orb === 'thinking'
  const chip = paused ? 'Paused' : thinking ? 'Thinking about it' : muted ? 'Muted' : p.orb === 'speaking' ? 'MIRROR is speaking' : speaking && p.orb === 'listening' ? 'Listening to you' : 'Your turn'
  // While paused the orb is calm, whatever the interview underneath is doing.
  const orbShown: OrbState = paused ? 'idle' : p.orb
  const level = paused || muted ? 0 : Math.min(1, p.orb === 'speaking' ? voice.outputLevel : speaking ? voice.inputLevel : 0)
  const hint = p.orb === 'speaking' ? 'Listen first, then answer in your own words.' : speaking ? 'Say what happened, what you did, what changed.' : 'Write what happened, what you did, what changed.'

  const { shown, replay } = useReveal(p.question, p.orb === 'speaking')
  const qWords = p.question.split(/\s+/).filter(Boolean)

  const openConfirm = () => setConfirming(true)
  const closeConfirm = () => { setConfirming(false); window.setTimeout(() => endBtn.current?.focus(), 0) }
  useEffect(() => { if (confirming) keepBtn.current?.focus() }, [confirming])

  const micPress = () => { if (mic) voice.mute(!voice.isMuted); else if (!speaking) p.onSwitchToSpeak() }
  const toggleMode = () => { if (speaking) p.onSwitchToType(); else p.onSwitchToSpeak() }
  const openPanel = (next: boolean) => { setPanel(next); if (next && !desktop) window.setTimeout(() => closeBtn.current?.focus(), 0) }
  const send = () => { if (speaking) voice.commitSpokenAnswer(); else p.onSubmit() }

  // Pause: MIRROR stops talking, the microphone goes quiet and the clock stops. Resume puts the question back on screen.
  const pause = () => {
    if (sc || paused) return
    wasMuted.current = voice.isMuted
    if (p.orb === 'speaking' && voice.active) voice.interrupt()
    if (mic && !voice.isMuted) voice.mute(true)
    setPauseSec(0)
    setPaused(true)
  }
  const resume = () => {
    if (!paused) return
    if (mic && !wasMuted.current) voice.mute(false)
    setPaused(false)
    replay()
  }
  const togglePause = () => { if (paused) resume(); else pause() }

  // Keyboard shortcuts (not while typing) and Esc.
  const handlers = useRef({ micPress, toggleMode, replay, openPanel, closeConfirm, togglePause })
  useEffect(() => { handlers.current = { micPress, toggleMode, replay, openPanel, closeConfirm, togglePause } })
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const h = handlers.current
      if (e.key === 'Escape') {
        if (confirming) { e.stopPropagation(); h.closeConfirm() } else if (help) { setHelp(false) } else if (panel && !desktop) { setPanel(false) }
        return
      }
      const t = e.target as HTMLElement | null
      if (e.ctrlKey || e.metaKey || e.altKey || confirming || t?.closest('textarea, input, select, [contenteditable="true"]')) return
      const k = e.key.toLowerCase()
      if (paused && k !== 'k' && e.key !== '?') return // while paused only Resume and the shortcut list work
      if (k === 'k' && !sc) h.togglePause()
      else if (k === 'm') h.micPress()
      else if (k === 'c' && !sc) setCaptions(c => !c)
      else if (k === 't') h.toggleMode()
      else if (k === 'p') h.openPanel(!panel)
      else if (k === 'r') h.replay()
      else if (e.key === '?') setHelp(v => !v)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirming, help, panel, desktop, sc, paused])

  // Keep the chat pinned to the newest line unless you scrolled up.
  useEffect(() => {
    const el = list.current
    if (el && stuck.current) el.scrollTop = el.scrollHeight
  }, [p.answers.length, p.question, spoken, tab, panel])

  const onTextKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (canSend) p.onSubmit()
    }
  }
  const onRadioKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (speaking) { p.onSwitchToType(); typeRadio.current?.focus() } else { p.onSwitchToSpeak(); speakRadio.current?.focus() }
    }
  }
  const onTabKey = (e: KeyboardEvent) => {
    if (sc || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    e.preventDefault()
    const order: ('chat' | 'tips' | 'replay')[] = p.replay ? ['chat', 'tips', 'replay'] : ['chat', 'tips']
    const next = order[(order.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length]
    setTab(next)
    tabs.current[order.indexOf(next)]?.focus()
  }
  // Light focus trap while the panel is a bottom sheet.
  const onPanelKey = (e: KeyboardEvent) => {
    if (desktop || e.key !== 'Tab' || !panelRef.current) return
    const f = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), [tabindex="0"]')
    if (!f.length) return
    const first = f[0], last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  const errorText = voice.error?.message ?? null
  const micBlocked = Boolean(errorText && /permission|microphone|denied|not allowed/i.test(errorText))
  const statusText = (micBlocked ? null : errorText) ?? p.flowText
  const link = voice.error ? (voice.error.recoverable ? 'Reconnecting' : 'Connection lost') : voice.active ? 'Connected' : speaking ? 'Connecting' : 'Typing'

  const cov = coverage(speaking ? spoken : answer)
  const speakSecs = speakFrom === null ? 0 : sec - speakFrom
  const wpm = speaking && speakSecs >= 6 && countWords(spoken) >= 8 ? Math.round(countWords(spoken) * 60 / speakSecs) : null
  const pace = wpm === null ? 'Pace shows up once you start speaking.' : wpm < 110 ? `Try speeding up a little (about ${wpm} words a minute).` : wpm > 170 ? `Try slowing down a little (about ${wpm} words a minute).` : `A steady pace (about ${wpm} words a minute).`
  const showCaptions = !sc && captions && speaking && hasSpoken && !muted

  // One Send button, shown in the call bar and, on phones, inside the open sheet (the sheet hides the bar).
  const sendButton = (
    <button type="button" className="ml-btn" onClick={send} disabled={!sendOk} aria-describedby={speaking ? undefined : 'iv-need'}>
      {p.busy ? 'Saving…' : p.isLast && !sc ? 'Finish' : 'Send answer'}{!p.busy && <ArrowRight size={16} aria-hidden="true" />}
    </button>
  )
  const sheetOpen = panel && !desktop
  const endFromSheet = () => { setPanel(false); setConfirming(true) }

  const tabPanelHidden = (t: 'chat' | 'tips' | 'replay') => tab !== t

  return (
    <div className={`mirror-landing iv ${panel ? 'has-panel' : ''} ${sheetOpen ? 'has-sheet' : ''}`}>
      <div className={`iv-stage${paused ? ' is-paused' : ''}`} style={{ ['--level' as string]: level }}>
        <header className="iv-top">
          <div className="iv-top-l">
            <span className="iv-timer" aria-label={`Session time ${clock(sec)}`}>{clock(sec)}</span>
            <span className="iv-link" data-ok={link === 'Connected' || link === 'Typing'}><i aria-hidden="true" />{link}</span>
            <span className="iv-brand">MIRROR practice</span>
          </div>
          <div className="iv-top-r">
            {sc ? (
              sc.remainingSeconds !== null && (
                <p className="iv-screen-time" role="timer" aria-live="off">
                  {screenLine(sc.remainingSeconds * 1000)}{(() => { const m = screenMilestone(sc.remainingSeconds * 1000, (sc.totalSeconds ?? 0) * 1000); return m ? <> <b>{m}</b></> : null })()}
                </p>
              )
            ) : (
              <>
                <ol className="iv-dots" aria-hidden="true">
                  {Array.from({ length: p.totalDots }, (_, i) => <li key={i} className={i <= p.questionIndex ? 'is-on' : ''} />)}
                </ol>
                <p className="iv-qn">Question {p.questionIndex + 1}{p.focusLabel ? ` · ${p.focusLabel}` : ''}</p>
              </>
            )}
            <div className="iv-help">
              <button type="button" className="iv-ico" aria-label="Keyboard shortcuts" aria-expanded={help} aria-controls="iv-keys" onClick={() => setHelp(v => !v)}><CircleHelp size={20} aria-hidden="true" /></button>
              {help && (
                <div id="iv-keys" className="ml-glass iv-pop">
                  <p className="iv-pop-t">Keyboard shortcuts</p>
                  <dl>{SHORTCUTS.filter(([k]) => !(sc && k === 'C')).map(([k, d]) => <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>)}</dl>
                </div>
              )}
            </div>
          </div>
        </header>

        {confirming && (
          <section className="ml-glass iv-confirm" role="alertdialog" aria-labelledby="iv-confirm-t" aria-describedby="iv-confirm-d">
            <h2 id="iv-confirm-t">{sc ? 'End the call?' : 'End this practice?'}</h2>
            <p id="iv-confirm-d">{sc ? 'Your answers so far are kept, and you will see your debrief.' : 'Your answers so far stay in Sessions, but you will not get notes for this one.'}</p>
            <div className="iv-row">
              <button type="button" className="ml-btn ml-btn--sm" onClick={sc ? sc.onEnd : p.onEnd}>{sc ? 'End the call' : 'End session'}</button>
              <button ref={keepBtn} type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={closeConfirm}>Keep going</button>
            </div>
          </section>
        )}

        {paused && (
          <section className="iv-pause" role="region" aria-labelledby="iv-pause-t">
            <div className="ml-glass iv-pause-card">
              <div className="iv-breathe" aria-hidden="true"><i /><span><b>Breathe in</b><b>Breathe out</b></span></div>
              <h2 id="iv-pause-t">Paused</h2>
              <p>Your place is saved. The clock and the microphone are stopped until you resume.</p>
              <p className="iv-pause-time" role="timer" aria-live="off">Paused for {clock(pauseSec)}</p>
              <div className="iv-row">
                <button ref={resumeBtn} type="button" className="ml-btn" onClick={resume}><Play size={16} aria-hidden="true" />Resume</button>
                <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={p.onContinueLater}>Continue later</button>
                <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={openConfirm}><Square size={14} aria-hidden="true" />End session</button>
              </div>
            </div>
          </section>
        )}

        <main className="iv-center">
          <div className="iv-orbbox" data-state={orbShown}>
            <div className="iv-ring" aria-hidden="true" />
            <div className="iv-ripples" aria-hidden="true"><i /><i /><i /></div>
            <div className="ml-orb iv-orb" data-state={orbShown}><LiveOrb state={orbShown} inputLevel={voice.active ? voice.inputLevel : undefined} outputLevel={voice.active ? voice.outputLevel : undefined} /></div>
          </div>
          <div className="iv-wave" data-state={muted ? 'idle' : orbShown} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <p className="iv-chip" data-state={thinking ? 'thinking' : muted ? 'muted' : p.orb}><i aria-hidden="true" />{chip}</p>

          <h1 className="iv-question" aria-label={p.question}>
            <span aria-hidden="true">{qWords.map((w, i) => <span key={i} className={i < shown ? 'is-in' : ''}>{w} </span>)}</span>
          </h1>
          {!sc && <p className="iv-hint">{hint}</p>}

          {micBlocked && (
            <div className="ml-glass iv-card" role="alert">
              <p>MIRROR cannot hear you. Allow the microphone in your browser, or type instead.</p>
              <button type="button" className="ml-btn ml-btn--sm" onClick={p.onSwitchToType}>Type instead</button>
            </div>
          )}

          <div className={`iv-cap ${showCaptions ? 'is-on' : ''}`} aria-live="polite" aria-label="Live captions">
            {showCaptions && <p><b>You</b>{voice.finalTranscript}{voice.finalTranscript && voice.partialTranscript ? ' ' : ''}<span className="iv-partial">{voice.partialTranscript}</span></p>}
          </div>

          <div className="iv-status" role="status">
            {statusText && <p>{statusText}</p>}
            {voice.nudgeText && <p className="iv-nudge" aria-live="polite">{voice.nudgeText}</p>}
            {p.canRetry && <button type="button" className="ml-btn ml-btn--sm" onClick={p.onRetry} disabled={p.busy}>Try again</button>}
          </div>
        </main>

        <div className="iv-bar" role="toolbar" aria-label="Call controls">
          <div className="iv-bar-g">
            <div className="iv-cbw">
              <button type="button" className={`iv-cb iv-cb--mic ${muted ? 'is-off' : ''}`} style={{ ['--lvl' as string]: muted ? 0 : level }} onClick={micPress} aria-pressed={mic ? muted : undefined} aria-label={mic ? (muted ? 'Unmute microphone' : 'Mute microphone') : 'Speak'} title={mic ? 'Mute (M)' : 'Speak (M)'}>
                {muted || !mic ? <MicOff size={22} aria-hidden="true" /> : <Mic size={22} aria-hidden="true" />}
              </button>
              <span>{mic ? (muted ? 'Unmute' : 'Mute') : 'Speak'}</span>
            </div>
            {!sc && (
              <div className="iv-cbw">
                <button type="button" className="iv-cb" onClick={() => setCaptions(c => !c)} aria-pressed={captions} aria-label="Captions" title="Captions (C)"><Captions size={22} aria-hidden="true" /></button>
                <span>Captions</span>
              </div>
            )}
            <div className="iv-cbw">
              <button type="button" className="iv-cb" onClick={() => openPanel(!panel)} aria-pressed={panel} aria-label={sc ? 'Chat' : 'Chat and tips'} title="Chat panel (P)"><MessageSquare size={22} aria-hidden="true" /></button>
              <span>Chat</span>
            </div>
            <div className="iv-cbw">
              <button type="button" className="iv-cb" onClick={replay} aria-label="Show the question again" title="Show the question again (R)"><Repeat size={22} aria-hidden="true" /></button>
              <span>Repeat</span>
            </div>
            {!sc && (
              <div className="iv-cbw">
                <button type="button" className="iv-cb" onClick={togglePause} aria-label="Pause" title="Pause (K)"><Pause size={22} aria-hidden="true" /></button>
                <span>Pause</span>
              </div>
            )}
            {p.orb === 'speaking' && voice.active && (
              <div className="iv-cbw">
                <button type="button" className="iv-cb" onClick={() => voice.interrupt()} aria-label="Stop speaking"><VolumeX size={22} aria-hidden="true" /></button>
                <span>Stop</span>
              </div>
            )}
            {voice.error?.recoverable && (
              <div className="iv-cbw">
                <button type="button" className="iv-cb" onClick={() => voice.retry()} aria-label="Reconnect"><RotateCcw size={22} aria-hidden="true" /></button>
                <span>Reconnect</span>
              </div>
            )}
          </div>
          <div className="iv-bar-g iv-bar-g--end">
            {sendButton}
            {!sc && <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={p.onContinueLater}>Continue later <ArrowRight size={16} aria-hidden="true" /></button>}
            <button ref={endBtn} type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={openConfirm} aria-expanded={confirming}><Square size={14} aria-hidden="true" />{sc ? 'End the call' : 'End session'}</button>
          </div>
        </div>
      </div>

      {panel && !desktop && <div className="iv-backdrop" onClick={() => setPanel(false)} aria-hidden="true" />}
      {panel && (
        <aside ref={panelRef} className="ml-glass iv-panel" aria-label={sc ? 'Chat' : 'Chat and tips'} onKeyDown={onPanelKey}>
          <div className="iv-panel-h">
            <div role="tablist" aria-label="Side panel" className="iv-tabs" onKeyDown={onTabKey}>
              {(sc ? (['chat'] as const) : p.replay ? (['chat', 'tips', 'replay'] as const) : (['chat', 'tips'] as const)).map((t, i) => (
                <button key={t} ref={el => { tabs.current[i] = el }} type="button" role="tab" id={`iv-tab-${t}`} aria-selected={tab === t} aria-controls={`iv-tp-${t}`} tabIndex={tab === t ? 0 : -1} onClick={() => setTab(t)}>{t === 'chat' ? 'Chat' : t === 'tips' ? 'Tips' : 'Replay'}</button>
              ))}
            </div>
            <button ref={closeBtn} type="button" className="iv-ico" aria-label="Close side panel" onClick={() => setPanel(false)}><X size={20} aria-hidden="true" /></button>
          </div>

          <div id="iv-tp-chat" role="tabpanel" aria-labelledby="iv-tab-chat" hidden={tabPanelHidden('chat')} className="iv-tp">
            <div ref={list} className="iv-chat" role="log" aria-live="polite" aria-label="Conversation so far" tabIndex={0}
              onScroll={e => { const el = e.currentTarget; stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40 }}>
              {p.answers.map((item, i) => (
                <div key={i} className="iv-turns">
                  <div className="iv-b iv-b--m"><span className="iv-who">MIRROR</span><p>{item.question}</p></div>
                  <div className="iv-b iv-b--u"><span className="iv-who">You{stamps[i] ? <time> · {stamps[i]}</time> : null}</span><p>{item.answer}</p></div>
                </div>
              ))}
              <div className="iv-b iv-b--m"><span className="iv-who">MIRROR</span><p>{p.question}</p></div>
              {speaking && hasSpoken && (
                <div className="iv-b iv-b--u iv-b--live"><span className="iv-who">You · speaking</span><p>{spoken}<span className="iv-caret" aria-hidden="true" /></p></div>
              )}
            </div>
          </div>

          {!sc && <div id="iv-tp-tips" role="tabpanel" aria-labelledby="iv-tab-tips" hidden={tabPanelHidden('tips')} className="iv-tp iv-tips">
            <p className="iv-note">Gentle guidance for this answer. It does not rank you.</p>
            <ul className="iv-check">
              {([['happened', 'What happened'], ['did', 'What you did'], ['changed', 'What changed']] as const).map(([k, label]) => (
                <li key={k} data-on={cov[k]}><i aria-hidden="true">{cov[k] ? '✓' : ''}</i><span>{label}<span className="ml-sr">{cov[k] ? ', covered' : ', not yet'}</span></span></li>
              ))}
            </ul>
            <p className="iv-pace" aria-live="off">{pace}</p>
            <p className="iv-pace">Time on this answer: <span className="iv-num">{clock(sec - answerFrom.at)}</span></p>
          </div>}

          {p.replay && (
            <div id="iv-tp-replay" role="tabpanel" aria-labelledby="iv-tab-replay" hidden={tabPanelHidden('replay')} className="iv-tp">
              <ReplayPanel interviewId={p.sessionId} answers={p.answers} />
            </div>
          )}

          <div className="iv-comp">
            <div className="iv-seg" role="radiogroup" aria-label="How you answer">
              <button ref={speakRadio} type="button" role="radio" aria-checked={speaking} tabIndex={speaking ? 0 : -1} onKeyDown={onRadioKey} onClick={() => { if (!speaking) p.onSwitchToSpeak() }}>
                <Mic size={16} aria-hidden="true" />Speak
              </button>
              <button ref={typeRadio} type="button" role="radio" aria-checked={!speaking} tabIndex={speaking ? -1 : 0} onKeyDown={onRadioKey} onClick={() => { if (speaking) p.onSwitchToType() }}>
                Type
              </button>
            </div>
            {speaking ? (
              <p className="iv-hint iv-hint--c">Speak your answer — it appears here as you talk.</p>
            ) : (
              <>
                <label className="ml-sr" htmlFor="iv-text">Your answer</label>
                <textarea
                  id="iv-text" ref={area} rows={3} value={answer}
                  onChange={e => change(e.target.value)} onKeyDown={onTextKey}
                  placeholder="Write what happened, in your own words."
                  disabled={p.busy || p.waiting || paused}
                />
                <p className="iv-count">{words} {words === 1 ? 'word' : 'words'}{sc ? '' : ' · about 80–150 words works well'}</p>
                <p id="iv-need" className="iv-count">{ready ? 'Ctrl or Cmd + Enter sends.' : `Send unlocks at ${MIN} characters — a little more detail first.`}</p>
              </>
            )}
            <div className="iv-actions">
              {sendButton}
              {!sc && <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={p.onContinueLater}>Continue later</button>}
              <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={endFromSheet}><Square size={14} aria-hidden="true" />{sc ? 'End the call' : 'End session'}</button>
            </div>
          </div>
          <p className="iv-foot"><Volume2 size={14} aria-hidden="true" />Saved as you go. MIRROR doesn’t keep your audio.</p>
        </aside>
      )}
    </div>
  )
}
