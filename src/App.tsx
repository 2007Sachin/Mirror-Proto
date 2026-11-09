import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, type Reflection } from './lib/api'
import { LiveOrb, type OrbState } from './components/LiveOrb'
import Landing from './pages/Landing'
import { useVoiceSession } from './voice/useVoiceSession'
import {
  ArrowLeft, ArrowRight, AudioLines, BarChart3, BookOpen, BriefcaseBusiness,
  Check, ChevronDown, Circle, Clock3, FileText, Fingerprint, Home as HomeIcon,
  Layers3, LockKeyhole, Menu, MessageCircle, Mic, MicOff, Pause,
  Plus, RotateCcw, Settings, ShieldCheck, Square, Target,
  Trash2, TrendingUp, Volume2, WandSparkles, X,
} from 'lucide-react'

type View = 'home' | 'goal' | 'direction' | 'story' | 'review' | 'workspace' | 'stories' | 'interviews' | 'interview' | 'roles' | 'roleReview' | 'reports' | 'report' | 'profile' | 'settings'
type Answer = { question: string; answer: string }
type FlowState = 'idle' | 'starting' | 'saving' | 'waiting_nim' | 'generating_reflection' | 'provider_unavailable' | 'retryable_failure' | 'validation_failure'

function flowLabel(state: FlowState): string | null {
  switch (state) {
    case 'starting': return 'Starting your interview…'
    case 'saving': return 'Saving your answer…'
    case 'waiting_nim': return 'Waiting for the next question…'
    case 'generating_reflection': return 'Generating your reflection…'
    case 'provider_unavailable': return 'The reflection provider is unavailable. You can retry without losing saved answers.'
    case 'retryable_failure': return 'That request failed. Retry when you are ready — saved answers are kept.'
    case 'validation_failure': return 'The reflection could not be validated against your answers.'
    default: return null
  }
}

function classifyApiError(err: unknown): FlowState {
  if (err instanceof ApiError) {
    if (err.code.includes('unavailable') || err.status === 503) return 'provider_unavailable'
    if (err.status === 400 && (err.code.startsWith('invalid_') || err.code === 'empty_answer')) return 'validation_failure'
    if (err.status >= 500 || err.status === 409 || err.status === 502) return 'retryable_failure'
  }
  return 'retryable_failure'
}

const goals = [
  { id: 'interview', icon: BriefcaseBusiness, title: 'Prepare for an interview', text: 'Build a focused plan for the conversation ahead.' },
  { id: 'communication', icon: MessageCircle, title: 'Communicate with clarity', text: 'Make your answers structured, natural, and memorable.' },
  { id: 'strengths', icon: Fingerprint, title: 'Understand my strengths', text: 'See what your real experiences already demonstrate.' },
  { id: 'confidence', icon: TrendingUp, title: 'Build quiet confidence', text: 'Practise privately, without performance pressure.' },
]
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
function OnboardingShell({ step, children, goHome }: { step: number; children: ReactNode; goHome: () => void }) {
  return <main className="onboarding-shell"><header className="onboarding-header"><Brand onClick={goHome} /><div className="step-indicator"><span>0{step}</span><i><b style={{ width: `${step * 25}%` }} /></i><span>04</span></div></header>{children}</main>
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [goal, setGoal] = useState('')
  const [role, setRole] = useState('Product Analyst')
  const [industry, setIndustry] = useState('Technology / SaaS')
  const [timing, setTiming] = useState('2–4 weeks')
  const [story, setStory] = useState('')
  const [extraStories, setExtraStories] = useState<string[]>([])
  const [newStory, setNewStory] = useState('')
  const [addingStory, setAddingStory] = useState(false)
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
  const [selectedRole, setSelectedRole] = useState('Product Analyst')
  const [directionReturn, setDirectionReturn] = useState<View>('review')
  const [calmMotion, setCalmMotion] = useState(false)
  const [toast, setToast] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [reflection, setReflection] = useState<Reflection | null>(null)
  const [serverLive, setServerLive] = useState(false)
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [currentQuestion, setCurrentQuestion] = useState('Tell me about a project or moment at work that you’re genuinely proud of.')
  const [busy, setBusy] = useState(false)
  const currentQuestionRef = useRef(currentQuestion)
  currentQuestionRef.current = currentQuestion
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId
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
  const storyCount = (story.trim() ? 1 : 0) + extraStories.length
  const roleHistory = [
    { name: role, industry, status: 'Preparing now', sessions: completed ? 1 : 0, last: completed ? 'Today' : 'Not started', readiness: completed ? '62–72' : 'Not assessed', note: 'Analytical thinking, ownership, and communicating product decisions.' },
    ...[
      { name: 'Product Manager', industry: 'Technology / SaaS', status: 'Previously prepared', sessions: 6, last: '12 days ago', readiness: '68–78', note: 'Prioritisation, stakeholder alignment, and product judgment.' },
      { name: 'Business Analyst', industry: 'Consulting', status: 'Previously prepared', sessions: 3, last: '1 month ago', readiness: '58–68', note: 'Structured thinking, problem framing, and measurable outcomes.' },
    ].filter(item => item.name !== role),
  ]
  const reviewedRole = roleHistory.find(item => item.name === selectedRole) || roleHistory[0]
  const readinessRangeLabel = reflection?.readinessRange ? `${reflection.readinessRange.low}–${reflection.readinessRange.high}` : 'Not assessed'
  const focusHeadline = reflection?.focus ?? 'Complete a reflection to see your focus.'
  const evidenceCards = reflection
    ? reflection.evidence.map((item, i) => ({ title: item.competency, text: item.observation, quote: item.quote, tag: 'Clear evidence', n: i + 1 }))
    : []

  const go = (next: View) => { setView(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const startInterview = async (roleName = role) => {
    if (busy) return
    setBusy(true)
    setFlowState('starting')
    setQuestionIndex(0); setAnswers([]); setAssessedRole(roleName); setAnswer(''); setOrbState('thinking'); setReflection(null); setSessionId(null)
    try {
      const session = await api.createInterview(roleName, industry)
      setSessionId(session.id)
      sessionStorage.setItem(SESSION_STORAGE_KEY, session.id)
      setServerLive(true)
      setCurrentQuestion(session.currentQuestion ?? session.questions[0])
      setQuestionIndex(session.nextQuestionIndex ?? 0)
      setFlowState('idle')
      setOrbState('speaking')
      go('interview')
      if (voiceMode) {
        void voice.start(session.id).then(ok => {
          if (!ok) notify('Voice is unavailable — type your answer instead.')
        })
      }
    } catch (err) {
      setFlowState(classifyApiError(err))
      notify('Could not start the interview. The practice server did not accept the request.')
    } finally {
      setBusy(false)
    }
  }
  const openRoleReview = (roleName: string) => { setSelectedRole(roleName); go('roleReview') }
  const practiseRole = (roleName: string) => { setRole(roleName); startInterview(roleName) }
  const submitAnswer = async () => {
    if (busy) return
    if (!sessionId) { setFlowState('retryable_failure'); notify('Start an interview before sending an answer.'); return }
    if (answer.trim().length < 20) { notify('Add a little more detail so MIRROR has something real to reflect on.'); return }
    const trimmed = answer.trim()
    const currentIndex = questionIndex
    setBusy(true)
    setFlowState('saving')
    setOrbState('thinking')
    try {
      const result = await api.submitTurn(sessionId, currentIndex, trimmed)
      setServerLive(true)
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

  const retryReflection = async () => {
    if (!sessionId || busy) return
    setBusy(true)
    setFlowState('generating_reflection')
    try {
      await api.complete(sessionId)
      const report = await api.reflect(sessionId)
      setReflection(report)
      setFlowState('idle')
    } catch (err) {
      setFlowState(classifyApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const endSession = async () => {
    voice.stop()
    setVoiceMode(false)
    if (sessionId) {
      try { await api.abandon(sessionId) } catch { /* keep local exit */ }
    }
    go('workspace')
  }
  const resetDemo = () => {
    if (!window.confirm('Reset all demonstration data and return to the beginning?')) return
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    voice.stop()
    setVoiceMode(false)
    setGoal(''); setStory(''); setExtraStories([]); setAnswers([]); setAnswer(''); setRole('Product Analyst'); setSessionId(null); setReflection(null); go('home'); notify('Prototype data reset.')
  }

  useEffect(() => {
    document.title = 'MIRROR — You already have the moment'
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!saved) return
    void api.getInterview(saved)
      .then(session => {
        setSessionId(session.id)
        setServerLive(true)
        setRole(session.role)
        setAssessedRole(session.role)
        if (session.industry) setIndustry(session.industry)
        setAnswers(session.turns.map(t => ({ question: t.question, answer: t.answer })))
        if (session.reflection) setReflection(session.reflection)
        if (session.currentQuestion) setCurrentQuestion(session.currentQuestion)
        if (session.nextQuestionIndex !== null) setQuestionIndex(session.nextQuestionIndex)
      })
      .catch(() => sessionStorage.removeItem(SESSION_STORAGE_KEY))
  }, [])

  useEffect(() => {
    if (view !== 'interview' || !sessionId) return
    api.getInterview(sessionId)
      .then(session => {
        setServerLive(true)
        setAnswers(session.turns.map(t => ({ question: t.question, answer: t.answer })))
        if (session.nextQuestionIndex !== null) setQuestionIndex(session.nextQuestionIndex)
        if (session.currentQuestion) setCurrentQuestion(session.currentQuestion)
        if (session.pendingFollowUp) setFlowState('waiting_nim')
      })
      .catch(err => setFlowState(classifyApiError(err)))
  }, [view, sessionId])

  if (view === 'home') return <Landing onTry={() => go('goal')} />

  if (['goal', 'direction', 'story', 'review'].includes(view)) {
    const step = view === 'goal' ? 1 : view === 'direction' ? 2 : view === 'story' ? 3 : 4
    return <div className={`app ${calmMotion ? 'reduce-motion' : ''}`}><div className="ambient ambient--one" /><OnboardingShell step={step} goHome={() => go('home')}>
      {view === 'goal' && <div className="onboarding-content"><div className="onboarding-title"><div className="eyebrow">START WITH WHAT MATTERS</div><h1>What brings you<br />to MIRROR?</h1><p>Choose the starting point that feels most useful.<br />You can change this at any time.</p></div><div className="goal-layout"><div className="goal-grid">{goals.map(item => <button key={item.id} className={`goal-card ${goal === item.id ? 'selected' : ''}`} onClick={() => setGoal(item.id)}><item.icon size={23} /><span><b>{item.title}</b><small>{item.text}</small></span><i>{goal === item.id && <Check size={14} />}</i></button>)}</div><aside className="onboarding-aside"><LiveOrb compact /><h3>No perfect answer needed.</h3><p>We’ll begin with your experiences, not assumptions about who you are.</p><span><LockKeyhole size={13} /> No scores during setup</span></aside></div><div className="onboarding-actions"><button className="text-link" onClick={() => go('workspace')}>Skip for now</button><Button disabled={!goal} onClick={() => { setDirectionReturn('review'); go('direction') }}>Continue <ArrowRight size={16} /></Button></div></div>}
      {view === 'direction' && <div className="onboarding-content"><div className="onboarding-title compact-title"><div className="eyebrow">YOUR DIRECTION</div><h1>Where would you like to grow?</h1><p>A little context helps MIRROR ask more relevant questions.</p></div><div className="direction-layout"><div className="form-stack"><div><FieldLabel>Target role</FieldLabel><div className="select-wrap"><select value={role} onChange={e => setRole(e.target.value)}><option>Product Analyst</option><option>Product Manager</option><option>Software Engineer</option><option>Data Analyst</option><option>UX Designer</option><option>Consultant</option></select><ChevronDown size={17} /></div></div><div><FieldLabel optional>Industry or company type</FieldLabel><div className="select-wrap"><select value={industry} onChange={e => setIndustry(e.target.value)}><option>Technology / SaaS</option><option>Financial services</option><option>Healthcare</option><option>Consumer / Retail</option><option>Other</option></select><ChevronDown size={17} /></div></div><div><FieldLabel>When is your interview?</FieldLabel><div className="segmented">{['Within a week', '2–4 weeks', 'No date yet'].map(item => <button className={timing === item ? 'active' : ''} key={item} onClick={() => setTiming(item)}>{item}</button>)}</div></div><div><FieldLabel optional>Job description</FieldLabel><textarea className="jd-input" placeholder="Paste a job description to make practice more specific…" /></div></div><aside className="direction-preview"><div className="eyebrow">YOUR STARTING POINT</div><Target size={34} /><h2>{role}</h2><p>{industry}</p><div className="preview-rule" /><span>MIRROR will explore evidence of</span><div className="preview-tags"><i>Ownership</i><i>Decisions</i><i>Impact</i></div><small><LockKeyhole size={13} /> Editable at any time</small></aside></div><div className="onboarding-actions"><button className="text-link" onClick={() => go(directionReturn)}><ArrowLeft size={15} /> Back</button><Button disabled={!role.trim()} onClick={() => go('story')}>Continue <ArrowRight size={16} /></Button></div></div>}
      {view === 'story' && <div className="onboarding-content"><div className="onboarding-title compact-title"><div className="eyebrow">YOUR FIRST STORY</div><h1>Tell us about something<br />you’re proud of.</h1><p>Rough is fine. Write a few lines, or let MIRROR guide you.</p></div><div className="story-prompts"><span><b>01</b> What was happening?</span><span><b>02</b> What did you do?</span><span><b>03</b> What changed?</span></div><div className="story-editor"><textarea value={story} onChange={e => setStory(e.target.value)} placeholder="“I was working on… The difficult part was… I decided to…”" /><div><button className="voice-text" onClick={() => { setVoiceMode(!voiceMode); notify(voiceMode ? 'Voice preview stopped.' : 'Voice preview on. Speech transcription is not connected.') }}><Mic size={17} /> {voiceMode ? 'Stop voice preview' : 'Prefer speaking? Preview voice mode'}</button><span>{story.length} characters</span></div></div><div className="story-bottom"><button className="text-link" onClick={() => startInterview()}>Not ready? Start with a guided interview <ArrowRight size={15} /></button><span><WandSparkles size={14} /> Your words become the evidence.</span></div><div className="onboarding-actions"><button className="text-link" onClick={() => go('direction')}><ArrowLeft size={15} /> Back</button><Button onClick={() => story.trim().length >= 20 ? go('review') : notify('Write at least a sentence, or choose the guided interview instead.')}>Review my profile <ArrowRight size={16} /></Button></div></div>}
      {view === 'review' && <div className="onboarding-content review-content"><div className="onboarding-title compact-title"><div className="eyebrow">YOUR STARTING PROFILE</div><h1>A place to begin.<br />Not a verdict.</h1><p>Review your direction. Your readiness appears only after real practice.</p></div><div className="review-grid"><section><span>YOUR GOAL</span><h3>{goals.find(g => g.id === goal)?.title || 'Interview practice'}</h3><button onClick={() => go('goal')}>Edit</button></section><section><span>YOUR DIRECTION</span><h3>{role}</h3><p>{industry} · {timing}</p><button onClick={() => go('direction')}>Edit</button></section><section><span>YOUR STORY BANK</span><h3>{storyCount} story started</h3><p>Private demonstration content</p><button onClick={() => go('story')}>Edit</button></section><section className="readiness-empty"><span>READINESS</span><h3>Not assessed yet</h3><p>A reflection appears after your interview answers.</p></section></div><div className="onboarding-actions"><button className="text-link" onClick={() => go('story')}><ArrowLeft size={15} /> Back</button><Button onClick={() => go('workspace')}>Enter my workspace <ArrowRight size={16} /></Button></div></div>}
    </OnboardingShell>{toast && <div className="toast">{toast}</div>}</div>
  }

  const navItems: { id: View; label: string; icon: typeof HomeIcon }[] = [
    { id: 'workspace', label: 'Overview', icon: HomeIcon }, { id: 'stories', label: 'My stories', icon: BookOpen },
    { id: 'interviews', label: 'Interviews', icon: MessageCircle }, { id: 'roles', label: 'Role history', icon: BriefcaseBusiness },
    { id: 'reports', label: 'Reflections', icon: BarChart3 },
  ]
  return <div className={`app workspace-app ${calmMotion ? 'reduce-motion' : ''}`}><div className="ambient ambient--two" />
    <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}><div className="sidebar-top"><Brand onClick={() => go('home')} /><button className="mobile-close" onClick={() => setMobileNav(false)}><X /></button></div><nav>{navItems.map(item => <button key={item.id} className={view === item.id || (view === 'report' && item.id === 'reports') || (view === 'roleReview' && item.id === 'roles') ? 'active' : ''} onClick={() => go(item.id)}><item.icon size={18} />{item.label}</button>)}</nav><div className="sidebar-bottom"><button onClick={() => go('settings')} className={view === 'settings' ? 'active' : ''}><Settings size={18} />Settings</button><button className="demo-profile" onClick={() => go('profile')}><span>{profileName.charAt(0)}</span><div><b>{profileName}’s workspace</b><small>View candidate profile</small></div></button></div></aside>
    {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="workspace-main"><header className="workspace-header"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={21} /></button><div><span className="workspace-breadcrumb">MIRROR / {view === 'report' ? 'REFLECTION' : view.toUpperCase()}</span></div><div className="header-actions"><span className="demo-badge"><Circle size={7} fill="currentColor" /> DEMO</span><button className="avatar-button" onClick={() => go('profile')} aria-label="Open candidate profile">{profileName.charAt(0)}</button></div></header>
      {view === 'workspace' && <div className="workspace-content"><div className="welcome"><div><p className="eyebrow">YOUR PRIVATE PRACTICE SPACE</p><h1>Good evening, {profileName.split(' ')[0]}.</h1><p>{completed ? 'Your reflection is ready. What would you like to strengthen next?' : 'Your first reflection is ready when you are.'}</p></div><span className="date-label">A quiet moment, well spent.</span></div><section className="workspace-hero"><div><div className="hero-card-label"><span>{role.toUpperCase()}</span><i />10 MINUTES</div><h2>{completed ? 'One more conversation.\nA little more clarity.' : 'Let’s find the story\nbehind your experience.'}</h2><p>A guided conversation. One honest story. Useful next steps.</p><Button onClick={() => void startInterview()}>{completed ? 'Practise again' : 'Start first reflection'} <ArrowRight size={16} /></Button></div><div className="workspace-orb"><LiveOrb compact state="idle" /><span>Ready when you are</span></div></section><div className="status-grid"><section><div className="card-label"><BriefcaseBusiness size={17} /> YOUR DIRECTION</div><h3>{role}</h3><p>{industry} · {timing}</p><button onClick={() => go('direction')}>Edit direction <ArrowRight size={13} /></button></section><section><div className="card-label"><BookOpen size={17} /> STORY BANK</div><h3>{storyCount || 'No'} {storyCount === 1 ? 'story' : storyCount ? 'stories' : 'stories yet'}</h3><p>{storyCount ? 'Real moments to draw from in practice.' : 'Add a moment that mattered to you.'}</p><button onClick={() => go('stories')}>{storyCount ? 'Open story bank' : 'Add your first story'} <ArrowRight size={13} /></button></section><section><div className="card-label"><BarChart3 size={17} /> READINESS</div><h3>{completed ? 'Evidence gathered' : 'Not assessed yet'}</h3><p>{completed ? 'A reflection based on your latest answers.' : 'A reflection appears after real interview evidence.'}</p><button onClick={() => completed ? go('report') : startInterview()}>{completed ? 'View reflection' : 'Begin practice'} <ArrowRight size={13} /></button></section></div><section className="next-step"><div><div className="eyebrow">A USEFUL NEXT STEP</div><h3>{completed ? 'Turn one insight into a stronger answer.' : storyCount ? 'See how your story sounds in conversation.' : 'Capture one experience before your first session.'}</h3><p>{completed ? 'A short retry is often more useful than starting from scratch.' : 'Different experiences give MIRROR a fuller picture—without guessing.'}</p></div><Button variant="secondary" onClick={() => completed ? startInterview() : go('stories')}>{completed ? 'Practise again' : 'Add a story'} <Plus size={16} /></Button></section></div>}
      {view === 'stories' && <div className="workspace-content"><div className="page-title"><div><p className="eyebrow">YOUR EXPERIENCE, IN YOUR WORDS</p><h1>My stories</h1><p>Collect real moments now. Find the right example when you need it.</p></div><Button onClick={() => setAddingStory(true)}><Plus size={16} /> Add a story</Button></div>{addingStory && <section className="inline-editor"><FieldLabel>New experience</FieldLabel><textarea value={newStory} onChange={e => setNewStory(e.target.value)} placeholder="What happened? What was your part? What changed?" autoFocus /><div><span>{newStory.length} characters</span><Button variant="ghost" onClick={() => { setAddingStory(false); setNewStory('') }}>Cancel</Button><Button onClick={() => { if (newStory.trim().length < 20) return notify('Add a little more detail before saving.'); setExtraStories([...extraStories, newStory.trim()]); setNewStory(''); setAddingStory(false); notify('Story added to this prototype.') }}>Save story</Button></div></section>}<div className="story-list">{story && <article><div className="story-icon"><FileText size={20} /></div><div><span>ONBOARDING STORY · DRAFT</span><h3>A moment I’m proud of</h3><p>{story}</p><small>{story.length} characters · {role}</small></div></article>}{extraStories.map((item, i) => <article key={i}><div className="story-icon"><Layers3 size={20} /></div><div><span>EXPERIENCE {String(i + 1).padStart(2, '0')}</span><h3>Untitled reflection</h3><p>{item}</p><small>{item.length} characters · {role}</small></div></article>)}{!storyCount && !addingStory && <div className="empty-state"><BookOpen size={30} /><h2>Your story bank is empty.</h2><p>Start with one project, decision, challenge, or moment of change.</p><Button onClick={() => setAddingStory(true)}>Capture your first story <ArrowRight size={15} /></Button></div>}</div></div>}
      {view === 'interviews' && <div className="workspace-content"><div className="page-title"><div><p className="eyebrow">PRACTICE, AT YOUR PACE</p><h1>Interviews</h1><p>Guided conversations shaped around your real experiences.</p></div><Button onClick={() => void startInterview()}><Plus size={16} /> New reflection</Button></div><section className="interview-start-card"><LiveOrb compact state="idle" /><div><span className="eyebrow">RECOMMENDED · ABOUT 10 MINUTES</span><h2>Experience deep-dive</h2><p>Explore one meaningful experience through four connected questions. Type or preview voice interaction.</p><div className="preview-tags"><i>Ownership</i><i>Decisions</i><i>Challenge</i><i>Impact</i></div><Button onClick={() => void startInterview()}>Start conversation <ArrowRight size={16} /></Button></div></section>{completed && <section className="history-row"><div className="history-icon"><Check size={18} /></div><div><span>LATEST REFLECTION</span><h3>Experience deep-dive</h3><p>4 answers · Evidence-linked reflection available</p></div><Button variant="secondary" onClick={() => go('report')}>View reflection</Button></section>}</div>}
      {view === 'interview' && <div className="interview-shell"><div className="interview-top"><div><span>EXPERIENCE DEEP-DIVE</span><small>Question {questionIndex + 1} of {QUESTION_COUNT}</small></div><button onClick={endSession}><Square size={13} /> End session</button></div><div className="interview-progress"><i style={{ width: `${((questionIndex + 1) / QUESTION_COUNT) * 100}%` }} /></div><div className="interview-stage"><LiveOrb state={interviewOrb} inputLevel={voice.active ? voice.inputLevel : undefined} outputLevel={voice.active ? voice.outputLevel : undefined} /><div className="orb-state-label"><span />{interviewOrb === 'listening' ? (voice.active ? 'Listening' : 'Listening preview') : interviewOrb === 'thinking' ? 'Reflecting on your answer' : interviewOrb === 'speaking' ? 'MIRROR is asking' : 'Ready for you'}</div><h1>{currentQuestion}</h1><p>Take your time. Specific, honest detail is more useful than a polished answer.</p>{voice.active && voice.voiceState === 'listening' && voice.partialTranscript && <p className="flow-banner" role="status">Listening: {voice.partialTranscript}</p>}{voice.active && voice.voiceState === 'processing_speech' && <p className="flow-banner" role="status">Finishing your spoken answer…</p>}{voice.active && voice.finalTranscript && voice.voiceState !== 'listening' && <p className="flow-banner" role="status">Final answer ready.</p>}{voice.error && <p className="flow-banner" role="status">{voice.error.message}</p>}{flowLabel(flowState) && <p className="flow-banner" role="status">{flowLabel(flowState)}</p>}{(flowState === 'provider_unavailable' || flowState === 'retryable_failure' || flowState === 'waiting_nim') && <Button variant="secondary" onClick={retryFollowUp} disabled={busy}>Retry next question</Button>}</div><div className="answer-composer"><textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder={voice.active ? 'Voice is live — you can still type as a fallback…' : 'Write what happened, in your own words…'} disabled={busy || flowState === 'waiting_nim'} /><div className="composer-bottom"><div><button className={`mic-button ${voice.active ? 'active' : ''}`} onClick={() => { if (voice.active) { voice.continueByTyping(); setVoiceMode(false); setOrbState('idle'); notify('Continuing by typing.'); return } setVoiceMode(true); if (sessionId) { void voice.start(sessionId).then(ok => { if (!ok) notify('Voice is unavailable — type your answer instead.') }) } else notify('Start the interview, then speak.') }}>{voice.active ? <MicOff size={19} /> : <Mic size={19} />}{voice.active ? 'Type instead' : 'Speak'}</button>{voice.active && <button className="mic-button" onClick={() => voice.mute(!voice.isMuted)}>{voice.isMuted ? 'Unmute' : 'Mute'}</button>}{voice.active && interviewOrb === 'speaking' && <button className="mic-button" onClick={() => voice.interrupt()}>Stop speaking</button>}{voice.error?.recoverable && <button className="mic-button" onClick={() => voice.retry()}>Reconnect</button>}</div><div className="send-group"><span>{voice.active ? (voice.voiceState === 'processing_speech' ? 'Processing…' : voice.finalTranscript ? 'Spoken answer captured' : `${answer.length} characters`) : `${answer.length} characters`}</span>{voice.active && voice.voiceState === 'listening' && <Button variant="secondary" onClick={() => voice.commitSpokenAnswer()}>Send spoken answer</Button>}<Button onClick={submitAnswer} disabled={busy || flowState === 'waiting_nim' || voice.voiceState === 'processing_speech'}>{questionIndex === QUESTION_COUNT - 1 ? 'Complete reflection' : 'Send answer'} <ArrowRight size={16} /></Button></div></div></div><div className="interview-note"><ShieldCheck size={13} /> {voice.active ? 'Spoken answers use the same interview state machine as typed answers. Audio is not stored. Live captions are not saved until you send the spoken answer.' : 'Answers are saved on the practice server before the next question is generated'}</div></div>}
      {view === 'roles' && <div className="workspace-content"><div className="page-title"><div><p className="eyebrow">YOUR PREPARATION, OVER TIME</p><h1>Role history</h1><p>Revisit every direction you’ve prepared for and see what changed.</p></div><Button onClick={() => go('direction')}><Plus size={16} /> Prepare a new role</Button></div><div className="role-history-list">{roleHistory.map((item, index) => <article key={`${item.name}-${index}`} className={index === 0 ? 'current-role' : ''}><div className="role-monogram">{item.name.split(' ').map(word => word[0]).join('').slice(0,2)}</div><div className="role-main"><div className="role-status-line"><span>{item.status.toUpperCase()}</span>{index === 0 && <i>CURRENT</i>}</div><h2>{item.name}</h2><p>{item.industry} · {item.note}</p><div className="role-metrics"><span><MessageCircle size={14} />{item.sessions} {item.sessions === 1 ? 'session' : 'sessions'}</span><span><Clock3 size={14} />{item.last}</span><span><BarChart3 size={14} />{item.readiness}</span></div></div><Button variant="secondary" onClick={() => openRoleReview(item.name)}>Review role <ArrowRight size={15} /></Button></article>)}</div><div className="history-note"><ShieldCheck size={16} /><p>Role readiness is kept separate from overall interview readiness. Historical values shown here are demonstration data.</p></div></div>}
      {view === 'roleReview' && <div className="workspace-content"><button className="back-link" onClick={() => go('roles')}><ArrowLeft size={15} /> Back to role history</button><div className="role-review-heading"><div><p className="eyebrow">{reviewedRole.status.toUpperCase()}</p><h1>{reviewedRole.name}</h1><p>{reviewedRole.industry} · {reviewedRole.sessions} practice {reviewedRole.sessions === 1 ? 'session' : 'sessions'} · {reviewedRole.last}</p></div><Button onClick={() => practiseRole(reviewedRole.name)}><RotateCcw size={15} /> Practise this role</Button></div><div className="role-review-grid"><section className="role-readiness-panel"><div className="card-label">ROLE READINESS <span>BOUNDED RANGE</span></div>{reviewedRole.readiness === 'Not assessed' ? <><div className="role-empty-score">Not assessed yet</div><p>Complete a reflection for this role before drawing conclusions.</p></> : <><div className="range-value">{reviewedRole.readiness}</div><p>{reviewedRole.name === role ? 'A promising foundation. Make outcomes more concrete in your next answer.' : 'Clear foundational answers, with room for stronger evidence of impact.'}</p><div className="range-track"><i /><b /></div><div className="range-labels"><span>Developing</span><span>Clear</span><span>Compelling</span></div></>}</section><section className="role-focus-panel"><div className="card-label"><Target size={16} /> ROLE FOCUS</div><h2>{reviewedRole.note}</h2><p>MIRROR uses your target direction to shape relevant questions while keeping feedback tied to your actual answers.</p><Button variant="secondary" onClick={() => { setRole(reviewedRole.name); setDirectionReturn('roleReview'); go('direction') }}>Edit role direction <ArrowRight size={14} /></Button></section></div><div className="report-section-title"><h2>Preparation review</h2><span>{reviewedRole.sessions} recorded sessions</span></div><div className="role-review-details"><article><span>WHAT’S WORKING</span><h3>{reviewedRole.readiness === 'Not assessed' ? 'Your direction is clear' : 'Ownership and structured thinking'}</h3><p>{reviewedRole.readiness === 'Not assessed' ? 'You have a target role. The next step is to gather genuine answer evidence.' : 'Your answers explain the actions you personally took and how you approached decisions.'}</p></article><article><span>WHAT TO STRENGTHEN</span><h3>{reviewedRole.readiness === 'Not assessed' ? 'No assessment yet' : 'Quantify the result'}</h3><p>{reviewedRole.readiness === 'Not assessed' ? 'MIRROR will not infer readiness from a role title or profile alone.' : 'Close more answers with a measurable result, observable change, or specific learning.'}</p></article><article><span>RECOMMENDED NEXT STEP</span><h3>{reviewedRole.readiness === 'Not assessed' ? 'Start a guided reflection' : 'Practise one focused follow-up'}</h3><p>A short, targeted retry will be more useful than repeating an entire generic interview.</p><button onClick={() => practiseRole(reviewedRole.name)}>Begin practice <ArrowRight size={13} /></button></article></div>{reviewedRole.name === role && completed && <section className="next-step"><div><div className="eyebrow">LATEST EVIDENCE-LINKED REFLECTION</div><h3>Your latest reflection is ready.</h3><p>Review the exact answers behind this role’s current readiness range.</p></div><Button variant="secondary" onClick={() => go('report')}>Open reflection <ArrowRight size={15} /></Button></section>}</div>}
      {view === 'profile' && <div className="workspace-content profile-content"><div className="page-title"><div><p className="eyebrow">YOUR CANDIDATE PROFILE</p><h1>Profile</h1><p>Shape the context MIRROR uses. Nothing here becomes an assessment by itself.</p></div><Button onClick={() => notify('Profile changes saved in this prototype.')}><Check size={15} /> Save profile</Button></div><section className="profile-identity"><div className="profile-avatar">{profileName.charAt(0)}</div><div><h2>{profileName}</h2><p>{role} · {profileLocation}</p><span><Circle size={7} fill="currentColor" /> Prototype profile · No account connected</span></div><Button variant="secondary" onClick={() => go('roles')}>View role history <ArrowRight size={14} /></Button></section><div className="profile-layout"><section className="profile-form"><div className="profile-form-title"><h2>About you</h2><p>Keep this brief. Your interview answers provide the real evidence.</p></div><div className="profile-field-grid"><div><FieldLabel>Display name</FieldLabel><input value={profileName} onChange={e => setProfileName(e.target.value)} /></div><div><FieldLabel>Location</FieldLabel><input value={profileLocation} onChange={e => setProfileLocation(e.target.value)} /></div><div><FieldLabel>Experience</FieldLabel><div className="select-wrap"><select value={profileExperience} onChange={e => setProfileExperience(e.target.value)}><option>Student / recent graduate</option><option>0–2 years</option><option>2–4 years</option><option>5–8 years</option><option>8+ years</option></select><ChevronDown size={16} /></div></div><div><FieldLabel>Current direction</FieldLabel><button className="profile-role-link" onClick={() => go('direction')}>{role}<ArrowRight size={15} /></button></div></div><FieldLabel>Short introduction</FieldLabel><textarea value={profileBio} onChange={e => setProfileBio(e.target.value)} /></section><aside className="profile-summary"><div className="card-label">PROFILE SNAPSHOT</div><h3>{goals.find(item => item.id === goal)?.title || 'Interview practice'}</h3><dl><div><dt>Experience</dt><dd>{profileExperience}</dd></div><div><dt>Stories</dt><dd>{storyCount}</dd></div><div><dt>Roles prepared</dt><dd>{roleHistory.length}</dd></div><div><dt>Reflections</dt><dd>{completed ? 1 : 0}</dd></div></dl><div className="profile-evidence-note"><Fingerprint size={17} /><p>Profile details personalise your practice. They never generate a readiness score.</p></div></aside></div></div>}
      {(view === 'reports' || view === 'report') && <div className="workspace-content">{!completed ? <><div className="page-title"><div><p className="eyebrow">EVIDENCE BEFORE ASSESSMENT</p><h1>Reflections</h1><p>Your feedback will appear here after a completed conversation.</p></div></div><div className="empty-state"><BarChart3 size={30} /><h2>No reflection yet.</h2><p>MIRROR won’t guess your readiness from a profile. Complete one interview to create an evidence-linked reflection.</p><Button onClick={() => void startInterview()}>Start first reflection <ArrowRight size={15} /></Button></div></> : <><div className="report-heading"><div><p className="eyebrow">LATEST REFLECTION · EXPERIENCE DEEP-DIVE</p><h1>{reflection ? 'A strong story is taking shape.' : 'Your answers are saved.'}</h1><p>{reflection ? 'Every observation below is linked to a quote from this session.' : 'The reflection has not been generated yet. Saved answers were not duplicated.'}</p></div><Button onClick={() => void startInterview()}><RotateCcw size={15} /> Practise again</Button></div>{flowLabel(flowState) && <p className="flow-banner" role="status">{flowLabel(flowState)}</p>}{!reflection && (flowState === 'provider_unavailable' || flowState === 'retryable_failure' || flowState === 'validation_failure' || flowState === 'generating_reflection') && <Button variant="secondary" onClick={() => void retryReflection()} disabled={busy}>Retry reflection</Button>}<div className="report-overview"><section className="readiness-card"><div className="card-label">INTERVIEW READINESS <span>BOUNDED RANGE</span></div><div className="range-value">{readinessRangeLabel}</div><p>{reflection ? 'A bounded range from this session’s evidence — not a hiring prediction.' : 'No numeric readiness without validated evidence from this interview.'}</p><div className="range-track"><i /><b /></div><div className="range-labels"><span>Developing</span><span>Clear</span><span>Compelling</span></div><small>{serverLive ? 'Evidence and readiness stay isolated to this role and session.' : 'Connect the practice server to generate a live reflection.'}</small></section><section className="focus-card"><div className="card-label"><Target size={16} /> YOUR FOCUS</div><h2 style={{ whiteSpace: 'pre-line' }}>{focusHeadline}</h2><p>{reflection ? 'Use this as the next practice target, grounded in your own words.' : 'Retry generation once the provider is available. Your four answers remain saved.'}</p><Button variant="secondary" onClick={() => void startInterview()}>Retry this story <ArrowRight size={15} /></Button></section></div><div className="report-section-title"><h2>What your answers demonstrate</h2><span>4 answers · {evidenceCards.length} evidence links</span></div><div className="evidence-grid">{evidenceCards.length ? evidenceCards.map((item, i) => <article key={`${item.title}-${i}`}><div className="evidence-top"><span>0{i + 1}</span><i><Check size={12} />{item.tag}</i></div><h3>{item.title}</h3><p>{item.text}</p><blockquote>“{item.quote}”</blockquote><small>LINKED TO THIS SESSION</small></article>) : <article><div className="evidence-top"><span>00</span></div><h3>No evidence yet</h3><p>MIRROR will not invent experience or show a demonstration report after a failed request.</p></article>}</div><section className="next-step"><div><div className="eyebrow">YOUR NEXT PRACTICE</div><h3>End with what changed.</h3><p>Use this shape: “As a result, [observable outcome]. Looking back, I would [learning].”</p></div><Button onClick={() => void startInterview()}>Practise the ending <ArrowRight size={16} /></Button></section></>}</div>}
      {view === 'settings' && <div className="workspace-content settings-content"><div className="page-title"><div><p className="eyebrow">MAKE THE EXPERIENCE YOURS</p><h1>Settings</h1><p>Preferences for this interactive prototype. No account is connected.</p></div></div><section className="settings-section"><div><h3>Voice experience</h3><p>Preview the interface planned for Sarvam speech-to-text and text-to-speech.</p></div><div className="setting-row"><span><Volume2 size={18} /><b>Voice playback speed</b></span><div className="segmented">{['Slow', 'Natural', 'Fast'].map(item => <button key={item} className={voiceSpeed === item ? 'active' : ''} onClick={() => { setVoiceSpeed(item); notify(`Voice speed set to ${item.toLowerCase()} for this preview.`) }}>{item}</button>)}</div></div><div className="setting-row"><span><AudioLines size={18} /><b>Conversation language</b></span><div className="select-wrap small-select"><select value={language} onChange={e => setLanguage(e.target.value)}><option>English</option><option>हिन्दी</option><option>தமிழ்</option><option>తెలుగు</option></select><ChevronDown size={16} /></div></div></section><section className="settings-section"><div><h3>Comfort</h3><p>Reduce visual movement while preserving the live orb’s current state.</p></div><div className="setting-row"><span><Pause size={18} /><b>Calm motion</b></span><button className={`switch ${calmMotion ? 'on' : ''}`} onClick={() => setCalmMotion(!calmMotion)} role="switch" aria-checked={calmMotion}><i /></button></div></section><section className="settings-section"><div><h3>Technology plan</h3><p>The intended production integrations for the next build phase.</p></div><div className="tech-plan"><span>NVIDIA NIM<small>LLM orchestration</small></span><span>Sarvam<small>STT + TTS</small></span><span>Supabase<small>Backend</small></span></div></section><section className="settings-section danger-section"><div><h3>Reset prototype</h3><p>Clear demonstration answers, stories, and onboarding selections.</p></div><Button variant="ghost" onClick={resetDemo}><Trash2 size={15} /> Reset demo data</Button></section></div>}
    </main>{toast && <div className="toast">{toast}</div>}</div>
}
