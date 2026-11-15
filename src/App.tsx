import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, type Profile, type Reflection } from './lib/api'
import type { OrbState } from './components/LiveOrb'
import Landing from './pages/Landing'
import FirstInterview from './pages/FirstInterview'
import Overview from './pages/Overview'
import Targets from './pages/Targets'
import Practice from './pages/Practice'
import Interview from './pages/Interview'
import Sessions from './pages/Sessions'
import { useVoiceSession } from './voice/useVoiceSession'
import {
  AudioLines, BookOpen,
  Check, ChevronDown, Circle, Fingerprint, Home as HomeIcon,
  Menu, MessageCircle, Pause,
  Settings, Target,
  Trash2, Volume2, X,
} from 'lucide-react'

type View = 'home' | 'firstInterview' | 'workspace' | 'targets' | 'practice' | 'interview' | 'reports' | 'report' | 'profile' | 'settings'
type Answer = { question: string; answer: string }
type FlowState = 'not_completed' | 'idle' | 'starting' | 'saving' | 'waiting_nim' | 'generating_reflection' | 'provider_unavailable' | 'retryable_failure' | 'validation_failure'

function flowLabel(state: FlowState): string | null {
  switch (state) {
    case 'starting': return 'Starting your interview…'
    case 'saving': return 'Saving your answer…'
    case 'waiting_nim': return 'Getting the next question…'
    case 'generating_reflection': return 'Putting your notes together…'
    case 'provider_unavailable': return 'MIRROR cannot reach the question service right now. Your answers are saved. Try again.'
    case 'retryable_failure': return 'That did not go through. Your answers are saved. Try again when you are ready.'
    case 'validation_failure': return 'Your notes could not be put together from these answers.'
    case 'not_completed': return 'This session was not completed, so there are no notes.'
    default: return null
  }
}

function classifyApiError(err: unknown): FlowState {
  if (err instanceof ApiError) {
    if (err.code === 'interview_incomplete' || err.code === 'interview_abandoned') return 'not_completed'
    if (err.code.includes('unavailable') || err.status === 503) return 'provider_unavailable'
    if (err.status === 400 && (err.code.startsWith('invalid_') || err.code === 'empty_answer')) return 'validation_failure'
    if (err.status >= 500 || err.status === 409 || err.status === 502) return 'retryable_failure'
  }
  return 'retryable_failure'
}

const QUESTION_COUNT = 4
const SESSION_STORAGE_KEY = 'mirror.phase1.sessionId'

function Brand({ onClick }: { onClick: () => void }) {
  return <button className="brand" onClick={onClick} aria-label="MIRROR home"><span className="brand-mark"><i /><i /></span><span>MIRROR</span></button>
}
function Button({ children, onClick, variant = 'primary', disabled = false, type = 'button', className = '' }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; type?: 'button' | 'submit'; className?: string }) {
  return <button type={type} className={`button button--${variant} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
}
function FieldLabel({ children, optional = false }: { children: ReactNode; optional?: boolean }) {
  return <label className="field-label">{children}{optional && <span>Optional</span>}</label>
}
export default function App() {
  const [view, setView] = useState<View>('home')
  const [targetId, setTargetId] = useState<string | null>(null)
  const [role, setRole] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [practiceItem, setPracticeItem] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [assessedRole, setAssessedRole] = useState('')
  const [answer, setAnswer] = useState('')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [voiceMode, setVoiceMode] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [voiceSpeed, setVoiceSpeed] = useState('Natural')
  const [language, setLanguage] = useState('English')
  const [profileName, setProfileName] = useState('Alex Morgan')
  const [profileLocation, setProfileLocation] = useState('Bengaluru, India')
  const [profileExperience, setProfileExperience] = useState('2–4 years')
  const [profileBio, setProfileBio] = useState('I enjoy turning ambiguous problems into clear, useful product decisions.')
  const [calmMotion, setCalmMotion] = useState(false)
  const [toast, setToast] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [reflection, setReflection] = useState<Reflection | null>(null)
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [currentQuestion, setCurrentQuestion] = useState('Tell me about a project or moment at work that you’re genuinely proud of.')
  const [busy, setBusy] = useState(false)
  const currentQuestionRef = useRef(currentQuestion)
  useEffect(() => { currentQuestionRef.current = currentQuestion }, [currentQuestion])
  const sessionIdRef = useRef(sessionId)
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  const voice = useVoiceSession({
    onQuestion: (text, index) => {
      setCurrentQuestion(text)
      setQuestionIndex(index)
    },
    onFinalTranscript: text => {
      const question = currentQuestionRef.current
      setAnswers(prev => (prev.some(item => item.answer === text && item.question === question) ? prev : [...prev, { question, answer: text }]))
    },
    onCompleted: () => {
      const id = sessionIdRef.current ?? sessionStorage.getItem(SESSION_STORAGE_KEY)
      setVoiceMode(false) // the voice hook has already stopped itself on completion
      if (!id) return
      setFlowState('generating_reflection')
      void (async () => {
        try {
          await api.complete(id)
          const report = await api.reflect(id)
          setReflection(report)
          setFlowState('idle')
          setOrbState('idle')
          go('report')
        } catch (err) {
          setFlowState(classifyApiError(err))
          setOrbState('idle')
          go('report')
        }
      })()
    },
  })
  const interviewOrb = voice.active ? voice.orbState : orbState

  const completed = answers.length === QUESTION_COUNT && assessedRole === role && Boolean(sessionId)

  const go = (next: View) => { setView(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const startInterview = async (roleName = role, openingQuestion?: string, voiceOn = voiceMode) => {
    if (busy) return
    if (!roleName) return go('firstInterview')
    setBusy(true)
    setFlowState('starting')
    setQuestionIndex(0); setAnswers([]); setAssessedRole(roleName); setAnswer(''); setOrbState('thinking'); setReflection(null); setSessionId(null)
    try {
      const session = await api.createInterview(roleName, undefined, openingQuestion)
      setSessionId(session.id)
      sessionStorage.setItem(SESSION_STORAGE_KEY, session.id)
      setCurrentQuestion(session.currentQuestion ?? session.questions[0])
      setQuestionIndex(session.nextQuestionIndex ?? 0)
      setFlowState('idle')
      setOrbState('speaking')
      go('interview')
      if (voiceOn) {
        void voice.start(session.id).then(ok => {
          if (!ok) { setVoiceMode(false); notify(voice.failureNotice()) }
        })
      }
    } catch (err) {
      setFlowState(classifyApiError(err))
      notify('Could not start the interview. The practice server did not accept the request.')
    } finally {
      setBusy(false)
    }
  }
  /** Re-enter an interview that is still open. The interview screen re-reads its progress from the server. */
  const resumeInterview = (id: string, roleName: string) => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
    setSessionId(id); setAssessedRole(roleName); setReflection(null); setAnswer(''); setFlowState('idle'); setOrbState('idle')
    go('interview')
  }
  const submitAnswer = async () => {
    if (busy) return
    if (!sessionId) { setFlowState('retryable_failure'); notify('Start an interview before sending an answer.'); return }
    if (answer.trim().length < 20) { notify('Add a little more detail so MIRROR has something real to work with.'); return }
    const trimmed = answer.trim()
    const currentIndex = questionIndex
    setBusy(true)
    setFlowState('saving')
    setOrbState('thinking')
    try {
      const result = await api.submitTurn(sessionId, currentIndex, trimmed)
      setAnswers(prev => [...prev, { question: currentQuestion, answer: trimmed }])
      setAnswer('')
      if (result.status === 'completed' || result.nextQuestionIndex === null) {
        setFlowState('generating_reflection')
        try {
          await api.complete(sessionId)
          const report = await api.reflect(sessionId)
          setReflection(report)
          setFlowState('idle')
          setOrbState('idle')
          go('report')
        } catch (err) {
          setFlowState(classifyApiError(err))
          setOrbState('idle')
          go('report')
        }
      } else {
        if (result.nextQuestion) {
          setCurrentQuestion(result.nextQuestion)
          setQuestionIndex(result.nextQuestionIndex ?? currentIndex + 1)
          setFlowState('idle')
          setOrbState('speaking')
        } else {
          setFlowState('waiting_nim')
        }
      }
    } catch (err) {
      const state = classifyApiError(err)
      setFlowState(state)
      if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'saved' in err.body && (err.body as { saved?: boolean }).saved) {
        setAnswers(prev => [...prev, { question: currentQuestion, answer: trimmed }])
        setAnswer('')
        notify('Your answer was saved. The next question is still generating.')
      } else {
        notify('Your answer was not accepted. Nothing extra was stored.')
      }
    } finally {
      setBusy(false)
    }
  }

  const retryFollowUp = async () => {
    if (!sessionId || busy) return
    setBusy(true)
    setFlowState('waiting_nim')
    try {
      const result = await api.nextQuestion(sessionId)
      setCurrentQuestion(result.nextQuestion)
      setQuestionIndex(result.nextQuestionIndex)
      setFlowState('idle')
      setOrbState('speaking')
    } catch (err) {
      setFlowState(classifyApiError(err))
    } finally {
      setBusy(false)
    }
  }

  /** Never let a voice teardown problem block leaving the screen. */
  const stopVoice = () => { try { voice.stop() } catch { /* already closed */ } }
  /** Leave and come back: the session stays open on the server and in this tab. */
  const continueLater = () => {
    stopVoice()
    setVoiceMode(false); setOrbState('idle')
    if (sessionId) sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId)
    go('workspace')
    notify('Saved. You can pick this up from Today.')
  }
  /** Leave now; the server is told in the background so a slow network never holds the screen. */
  const endSession = () => {
    const id = sessionId
    stopVoice()
    setVoiceMode(false); setOrbState('idle')
    go('workspace')
    if (id) void api.abandon(id).catch(() => undefined)
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    setSessionId(null)
    notify('Session ended.')
  }
  const switchToType = () => {
    voice.continueByTyping(); setVoiceMode(false); setOrbState('idle')
  }
  const switchToSpeak = () => {
    if (!sessionId) return notify('Start the interview, then speak.')
    setVoiceMode(true)
    void voice.start(sessionId).then(ok => {
      if (!ok) { setVoiceMode(false); notify(voice.failureNotice()) }
    })
  }
  /** Let an unfinished interview go: close it on the server and forget it here. */
  const letGo = async (id: string) => {
    try { await api.abandon(id) } catch { /* it may already be closed */ }
    if (sessionStorage.getItem(SESSION_STORAGE_KEY) === id) { sessionStorage.removeItem(SESSION_STORAGE_KEY); setSessionId(null) }
  }
  const resetDemo = () => {
    if (!window.confirm('Reset all demonstration data and return to the beginning?')) return
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    void api.deleteProfile().catch(() => undefined)
    stopVoice()
    setVoiceMode(false)
    setAnswers([]); setAnswer(''); setRole(''); setProfile(null); setSessionId(null); setReflection(null); go('home'); notify('Prototype data reset.')
  }

  const profileFresh = useRef(false) // set when The First Interview finishes here, so a slow fetch can't overwrite it
  useEffect(() => {
    api.getProfile()
      .then(p => {
        if (profileFresh.current) return
        setProfile(p); setRole(p.role); setVoiceMode(p.mode === 'voice')
        setView(v => (v === 'firstInterview' ? 'workspace' : v)) // clicked Start before this arrived
      })
      .catch(() => undefined) // 404 = not onboarded yet
  }, [])

  useEffect(() => {
    document.title = 'MIRROR — You know what you did'
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!saved) return
    // Completed, abandoned or missing: forget it and show the normal Overview.
    const forget = () => { sessionStorage.removeItem(SESSION_STORAGE_KEY); setView('workspace') }
    void api.getInterview(saved)
      .then(session => {
        if (session.status !== 'in_progress') return forget()
        // Only what the server returned: the exact question, the answers so far, no guessed progress.
        setSessionId(session.id)
        setRole(session.role)
        setAssessedRole(session.role)
        setAnswers(session.turns.map(t => ({ question: t.question, answer: t.answer })))
        if (session.currentQuestion) setCurrentQuestion(session.currentQuestion)
        if (session.nextQuestionIndex !== null) setQuestionIndex(session.nextQuestionIndex)
        setOrbState(session.pendingFollowUp ? 'thinking' : 'idle')
        setView('workspace') // the Overview's Continue panel is the way back in
      })
      // Only a missing session is forgotten; a network slip keeps the breadcrumb so the open interview is not lost.
      .catch(err => (err instanceof ApiError && err.status === 404 ? forget() : setView('workspace')))
  }, [])

  useEffect(() => {
    if (view !== 'interview' || !sessionId) return
    api.getInterview(sessionId)
      .then(session => {
        setAnswers(session.turns.map(t => ({ question: t.question, answer: t.answer })))
        if (session.nextQuestionIndex !== null) setQuestionIndex(session.nextQuestionIndex)
        if (session.currentQuestion) setCurrentQuestion(session.currentQuestion)
        if (session.pendingFollowUp) { setFlowState('waiting_nim'); setOrbState('thinking') }
      })
      .catch(err => setFlowState(classifyApiError(err)))
  }, [view, sessionId])

  if (view === 'home') return <Landing onTry={() => go(profile ? 'workspace' : 'firstInterview')} />

  if (view === 'firstInterview') {
    return <FirstInterview
      onBack={() => go('home')}
      onDone={(p, saved) => {
        profileFresh.current = true
        setProfile(p); setRole(p.role); setVoiceMode(p.mode === 'voice')
        if (!saved) notify('Your first interview is ready, but it could not be saved to the practice server.')
        go('workspace')
      }}
    />
  }

  if (view === 'interview') {
    return <>
      <Interview
        question={currentQuestion}
        questionIndex={questionIndex}
        totalDots={QUESTION_COUNT}
        isLast={questionIndex === QUESTION_COUNT - 1}
        focusLabel={profile?.focus}
        answers={answers}
        orb={interviewOrb}
        voice={voice}
        flowText={flowLabel(flowState)}
        canRetry={flowState === 'provider_unavailable' || flowState === 'retryable_failure' || flowState === 'waiting_nim'}
        waiting={flowState === 'waiting_nim'}
        busy={busy}
        answer={answer}
        setAnswer={setAnswer}
        sessionId={sessionId}
        onSubmit={() => void submitAnswer()}
        onRetry={() => void retryFollowUp()}
        onContinueLater={continueLater}
        onEnd={endSession}
        onSwitchToType={switchToType}
        onSwitchToSpeak={switchToSpeak}
      />
      {toast && <div className="toast">{toast}</div>}
    </>
  }

  const navItems: { id: View; label: string; icon: typeof HomeIcon }[] = [
    { id: 'workspace', label: 'Today', icon: HomeIcon },
    { id: 'practice', label: 'Practice', icon: BookOpen },
    { id: 'targets', label: 'Targets', icon: Target },
    { id: 'reports', label: 'Sessions', icon: MessageCircle },
  ]
  return <div className={`app workspace-app ${calmMotion ? 'reduce-motion' : ''}`}><div className="ambient ambient--two" />
    <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}><div className="sidebar-top"><Brand onClick={() => go('home')} /><button className="mobile-close" onClick={() => setMobileNav(false)}><X /></button></div><nav>{navItems.map(item => <button key={item.id} className={view === item.id || (view === 'report' && item.id === 'reports') ? 'active' : ''} onClick={() => { if (item.id === 'targets') setTargetId(null); go(item.id) }}><item.icon size={18} />{item.label}</button>)}</nav><div className="sidebar-bottom"><button onClick={() => go('settings')} className={view === 'settings' ? 'active' : ''}><Settings size={18} />Settings</button><button className="demo-profile" onClick={() => go('profile')}><span>{profileName.charAt(0)}</span><div><b>{profileName}’s workspace</b><small>View candidate profile</small></div></button></div></aside>
    {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="workspace-main"><header className="workspace-header"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={21} /></button><div><span className="workspace-breadcrumb">MIRROR / {view === 'workspace' ? 'TODAY' : view === 'report' || view === 'reports' ? 'SESSIONS' : view.toUpperCase()}</span></div><div className="header-actions"><span className="demo-badge"><Circle size={7} fill="currentColor" /> DEMO</span><button className="avatar-button" onClick={() => go('profile')} aria-label="Open candidate profile">{profileName.charAt(0)}</button></div></header>
      {view === 'workspace' && <Overview profile={profile} busy={busy} onStart={(question, speak) => { setVoiceMode(speak); void startInterview(role, question, speak) }} onContinue={resumeInterview} onLetGo={letGo} onOpenItem={id => { setPracticeItem(id); go('practice') }} />}
      {view === 'targets' && <Targets openId={targetId} onOpen={setTargetId} onPractise={r => void startInterview(r)} />}
      {view === 'practice' && <Practice initialItemId={practiceItem} onInitialConsumed={() => setPracticeItem(null)} />}
      {view === 'profile' && <div className="workspace-content profile-content"><div className="page-title"><div><p className="eyebrow">YOUR CANDIDATE PROFILE</p><h1>Profile</h1><p>Shape the context MIRROR uses. Nothing here becomes an assessment by itself.</p></div><Button onClick={() => notify('Profile changes saved in this prototype.')}><Check size={15} /> Save profile</Button></div><section className="profile-identity"><div className="profile-avatar">{profileName.charAt(0)}</div><div><h2>{profileName}</h2><p>{role} · {profileLocation}</p><span><Circle size={7} fill="currentColor" /> Prototype profile · No account connected</span></div></section><div className="profile-layout"><section className="profile-form"><div className="profile-form-title"><h2>About you</h2><p>Keep this brief. Your interview answers matter more than this form.</p></div><div className="profile-field-grid"><div><FieldLabel>Display name</FieldLabel><input value={profileName} onChange={e => setProfileName(e.target.value)} /></div><div><FieldLabel>Location</FieldLabel><input value={profileLocation} onChange={e => setProfileLocation(e.target.value)} /></div><div><FieldLabel>Experience</FieldLabel><div className="select-wrap"><select value={profileExperience} onChange={e => setProfileExperience(e.target.value)}><option>Student / recent graduate</option><option>0–2 years</option><option>2–4 years</option><option>5–8 years</option><option>8+ years</option></select><ChevronDown size={16} /></div></div><div><FieldLabel>Current direction</FieldLabel><div className="profile-role-link">{role}</div></div></div><FieldLabel>Short introduction</FieldLabel><textarea value={profileBio} onChange={e => setProfileBio(e.target.value)} /></section><aside className="profile-summary"><div className="card-label">PROFILE SNAPSHOT</div><h3>{profile?.focus ?? 'Interview practice'}</h3><dl><div><dt>Experience</dt><dd>{profileExperience}</dd></div><div><dt>Sessions done</dt><dd>{completed ? 1 : 0}</dd></div></dl><div className="profile-evidence-note"><Fingerprint size={17} /><p>Profile details personalise your practice. They never generate a readiness score.</p></div></aside></div></div>}
      {(view === 'reports' || view === 'report') && <Sessions openId={view === 'report' ? sessionId : null} refreshKey={reflection?.interviewId} onPractise={() => void startInterview()} />}
      {view === 'settings' && <div className="workspace-content settings-content"><div className="page-title"><div><p className="eyebrow">MAKE THE EXPERIENCE YOURS</p><h1>Settings</h1><p>Preferences for this interactive prototype. No account is connected.</p></div></div><section className="settings-section"><div><h3>Voice experience</h3><p>Preview the interface planned for Sarvam speech-to-text and text-to-speech.</p></div><div className="setting-row"><span><Volume2 size={18} /><b>Voice playback speed</b></span><div className="segmented">{['Slow', 'Natural', 'Fast'].map(item => <button key={item} className={voiceSpeed === item ? 'active' : ''} onClick={() => { setVoiceSpeed(item); notify(`Voice speed set to ${item.toLowerCase()} for this preview.`) }}>{item}</button>)}</div></div><div className="setting-row"><span><AudioLines size={18} /><b>Conversation language</b></span><div className="select-wrap small-select"><select value={language} onChange={e => setLanguage(e.target.value)}><option>English</option><option>हिन्दी</option><option>தமிழ்</option><option>తెలుగు</option></select><ChevronDown size={16} /></div></div></section><section className="settings-section"><div><h3>Comfort</h3><p>Reduce visual movement while preserving the live orb’s current state.</p></div><div className="setting-row"><span><Pause size={18} /><b>Calm motion</b></span><button className={`switch ${calmMotion ? 'on' : ''}`} onClick={() => setCalmMotion(!calmMotion)} role="switch" aria-checked={calmMotion}><i /></button></div></section><section className="settings-section"><div><h3>Technology plan</h3><p>The intended production integrations for the next build phase.</p></div><div className="tech-plan"><span>NVIDIA NIM<small>LLM orchestration</small></span><span>Sarvam<small>STT + TTS</small></span><span>Supabase<small>Backend</small></span></div></section><section className="settings-section danger-section"><div><h3>Reset prototype</h3><p>Clear demonstration answers, stories, and onboarding selections.</p></div><Button variant="ghost" onClick={resetDemo}><Trash2 size={15} /> Reset demo data</Button></section></div>}
    </main>{toast && <div className="toast">{toast}</div>}</div>
}
