import { Suspense, useEffect, useRef, useState } from 'react'
import PageSkeleton from './ui/PageSkeleton'
import { api, authApi, ApiError, type Profile, type Reflection } from './lib/api'
import type { OrbState } from './components/LiveOrb'
import Landing from './pages/Landing'
import FirstInterview from './pages/FirstInterview'
import Overview from './pages/Overview'
import Today from './pages/Today'
import Practice from './pages/Practice'
import Interview from './pages/Interview'
import Sessions from './pages/Sessions'
import Stories from './pages/Stories'
import InterviewPrep from './pages/InterviewPrep'
import SettingsPage from './pages/Settings'
import Privacy from './pages/Privacy'
import Account from './pages/Account'
import { saveStoryFromAnswer } from './stories/saveStory'
import { useVoiceSession } from './voice/useVoiceSession'
import * as data from './lib/data'
import { KEEP_ON_SIGN_OUT, clearBrowserKeys } from './features/privacy/dataTools'
import { useSession } from './features/auth/useSession'
import AuthGate from './features/auth/AuthGate'
import AccountMenu from './features/auth/AccountMenu'
import './styles/app-shell.css'
import { useScreenClock } from './features/screen/countdown'
import { ScreenDebriefPage } from './features/screen/ScreenDebrief'
import { createScreen } from './lib/screenApi'
import { matchSite, SITE_HOME_LIVE } from './site/router'
import { SiteProvider } from './site/SiteContext'
import {
  BookMarked, BookOpen, ClipboardList,
  Circle, Home as HomeIcon,
  Menu, MessageCircle, PanelLeftClose, PanelLeftOpen,
  Settings,
  X,
} from 'lucide-react'

type View = 'home' | 'firstInterview' | 'workspace' | 'targets' | 'practice' | 'interview' | 'reports' | 'report' | 'stories' | 'prep' | 'screen' | 'profile' | 'settings' | 'privacy'
type Answer = { question: string; answer: string }
type FlowState = 'not_completed' | 'session_lost' | 'idle' | 'starting' | 'saving' | 'waiting_nim' | 'generating_reflection' | 'provider_unavailable' | 'retryable_failure' | 'validation_failure'

function flowLabel(state: FlowState): string | null {
  switch (state) {
    case 'starting': return 'Starting your interview…'
    case 'saving': return 'Saving your answer…'
    case 'waiting_nim': return 'Getting the next question…'
    case 'generating_reflection': return 'Putting your notes together…'
    case 'provider_unavailable': return 'MIRROR cannot reach the question service right now. Your answers are saved. Try again.'
    case 'retryable_failure': return 'That did not go through. Your answers are saved. Try again when you are ready.'
    case 'validation_failure': return 'Your notes could not be put together from these answers.'
    case 'session_lost': return 'This interview could not be found, so your answer was not saved. Start a new one.'
    case 'not_completed': return 'This session was not completed, so there are no notes.'
    default: return null
  }
}

function classifyApiError(err: unknown): FlowState {
  if (err instanceof ApiError) {
    if (err.status === 404) return 'session_lost'
    if (err.code === 'interview_incomplete' || err.code === 'interview_abandoned') return 'not_completed'
    if (err.code.includes('unavailable') || err.status === 503) return 'provider_unavailable'
    if (err.status === 400 && (err.code.startsWith('invalid_') || err.code === 'empty_answer')) return 'validation_failure'
    if (err.status >= 500 || err.status === 409 || err.status === 502) return 'retryable_failure'
  }
  return 'retryable_failure'
}

// DELETE AFTER 2026-11-30
const TODAY_V1 = import.meta.env.VITE_TODAY_V1 === '1'
const QUESTION_COUNT = 4
const SESSION_STORAGE_KEY = 'mirror.phase1.sessionId'

const NAV_KEY = 'mirror.nav.collapsed'
function useNavCollapsed(): [boolean, () => void] {
  const [collapsed, set] = useState(() => { try { return localStorage.getItem(NAV_KEY) === '1' } catch { return false } })
  const toggle = () => set(c => { try { localStorage.setItem(NAV_KEY, c ? '0' : '1') } catch { /* private mode: the choice lasts this visit */ } return !c })
  return [collapsed, toggle]
}

function Brand({ onClick }: { onClick: () => void }) {
  return <button className="brand" onClick={onClick} aria-label="MIRROR home"><span className="brand-mark"><i /><i /></span><span>MIRROR</span></button>
}
// Pages that can be opened straight from the address bar. Interview, report and screen need a live session id, so they open the dashboard.
const URL_VIEWS: Record<string, View> = {
  '': 'home', workspace: 'workspace', targets: 'targets', practice: 'practice', reports: 'reports',
  stories: 'stories', prep: 'prep', profile: 'profile', settings: 'settings', privacy: 'privacy', firstInterview: 'firstInterview',
}
function viewFromPath(pathname: string): View {
  const key = pathname.replace(/^\/+|\/+$/g, '')
  if (key in URL_VIEWS) return URL_VIEWS[key]
  if (matchSite(pathname)) return 'home' // a marketing page (src/site); App renders it before any view logic
  return key ? 'workspace' : 'home'
}

export default function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname))
  // Auth: who is signed in. The landing is public; every other view needs a session (or the local demo).
  const session = useSession()
  const authed = session.status === 'signedIn' || session.status === 'demo'
  const signOut = async () => {
    try { await authApi.signOut() } catch { /* the cookie may already be gone */ }
    session.clear()
    // Only each person's own SQL progress (mirror.data.v1.<id>.sql.*) stays for their next sign-in; every other mirror.* key goes.
    clearBrowserKeys(localStorage, KEEP_ON_SIGN_OUT); clearBrowserKeys(sessionStorage)
    // signed-in user: return to dashboard; unsigned: landing page
    if (session.status === 'signedIn' || session.status === 'demo') {
      window.history.pushState({}, '', '/workspace')
    } else {
      window.location.assign('/')
    }
  }
  const [targetId, setTargetId] = useState<string | null>(null)
  const [role, setRole] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileStatus, setProfileStatus] = useState<'loading' | 'none' | 'ready' | 'error'>('loading')

const viewToUrl = (view: View): string => {
  const mapping: Record<View, string> = {
    'home': '',
    'firstInterview': 'firstInterview',
    'workspace': 'workspace',
    'targets': 'targets',
    'practice': 'practice',
    'interview': 'interview',
    'reports': 'reports',
    'screen': 'screen',
    'report': 'report',
    'stories': 'stories',
    'prep': 'prep',
    'profile': 'profile',
    'settings': 'settings',
    'privacy': 'privacy',
  }
  return mapping[view]
}

// Sync view to URL when navigation occurs (in go function)
// Listen for popstate to update view on back/forward
useEffect(() => {
  const handler = (e: PopStateEvent) => {
    setView(e.state && e.state.mirrorView !== undefined ? e.state.mirrorView as View : viewFromPath(window.location.pathname))
  }
  window.addEventListener('popstate', handler)
  return () => window.removeEventListener('popstate', handler)
}, [view])

// Ensure we also sync on beforeunload
useEffect(() => {
  const handler = () => {
    localStorage.setItem('mirror:view-sync', JSON.stringify(view))
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [view])
  const [practiceItem, setPracticeItem] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [answer, setAnswer] = useState('')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [voiceMode, setVoiceMode] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [navCollapsed, toggleNav] = useNavCollapsed()
  const [voiceSpeed, setVoiceSpeed] = useState('Natural')
  const [language, setLanguage] = useState('English')
  const [calmMotion, setCalmMotion] = useState(false)
  const [toast, setToast] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  /** A screening call sets its own length; null means the practice default. */
  const [questionCap, setQuestionCap] = useState<number | null>(null)
  /** A realistic screening call in progress: its absolute start (survives a reload) and length. */
  const [screen, setScreen] = useState<{ startedAt: number; capSeconds: number } | null>(null)
  const screenRef = useRef(screen)
  useEffect(() => { screenRef.current = screen }, [screen])
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

  const total = questionCap ?? QUESTION_COUNT

  const [storyQuestion, setStoryQuestion] = useState<string | null>(null)
  /** A theme Today wants a new story for ('' = any); null when nothing was asked. */
  const [storyTheme, setStoryTheme] = useState<string | null>(null)
  /** Opens the Story bank, optionally with a question to suggest a story for (Today and Interview can call this). */
  const openStories = (question?: string) => { setStoryQuestion(question ?? null); go('stories') }
  const addStory = (theme: string | null) => { setStoryTheme(theme ?? ''); go('stories') }
  // A finished screening call goes to its debrief instead of the plain notes page.
  const go = (next: View, replace = false) => {
    const isReportToScreen = next === 'report' && screenRef.current
    setView(isReportToScreen ? 'screen' : next)
    setScreen(c => (next === 'interview' || next === 'report' ? c : null))
    setMobileNav(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Sync view to URL
    const url = viewToUrl(isReportToScreen ? 'screen' : next)
    const newUrl = url ? `/${url}` : '/'
    window.history[replace ? 'replaceState' : 'pushState']({ mirrorView: isReportToScreen ? 'screen' : next }, '', newUrl)
    localStorage.setItem('mirror:view-sync', JSON.stringify(view))
  }
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const startInterview = async (roleName = role, openingQuestion?: string, voiceOn = voiceMode, fromTargetId?: string) => {
    if (busy) return
    if (!roleName) return go('firstInterview')
    setBusy(true)
    setFlowState('starting')
    setQuestionIndex(0); setAnswers([]); setAnswer(''); setOrbState('thinking'); setReflection(null); setSessionId(null); setQuestionCap(null); setScreen(null)
    try {
      const session = await api.createInterview(roleName, undefined, openingQuestion, fromTargetId)
      setSessionId(session.id)
      setQuestionCap(session.questionCap ?? null)
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
    setSessionId(id); setRole(roleName); setReflection(null); setAnswer(''); setFlowState('idle'); setOrbState('idle')
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
      if (state === 'session_lost') {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
      } else if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'saved' in err.body && (err.body as { saved?: boolean }).saved) {
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
  /** The server builds the questions from the target and keeps the clock; here we only follow it. */
  const startScreening = async (targetId: string, voiceOn = voiceMode) => {
    if (busy) return
    setBusy(true)
    setFlowState('starting')
    setQuestionIndex(0); setAnswers([]); setAnswer(''); setOrbState('thinking'); setReflection(null); setSessionId(null); setQuestionCap(null); setScreen(null)
    try {
      const session = await createScreen(role || 'Screening call', targetId)
      setSessionId(session.id)
      setQuestionCap(session.questionCap ?? null)
      setScreen({ startedAt: session.startedAt ? Date.parse(session.startedAt) : Date.now(), capSeconds: session.timeCapSeconds ?? 480 })
      sessionStorage.setItem(SESSION_STORAGE_KEY, session.id)
      setCurrentQuestion(session.currentQuestion ?? session.questions[0])
      setQuestionIndex(session.nextQuestionIndex ?? 0)
      setFlowState('idle')
      setOrbState('speaking')
      go('interview')
      if (voiceOn) void voice.start(session.id).then(ok => { if (!ok) { setVoiceMode(false); notify(voice.failureNotice()) } })
    } catch (err) {
      setFlowState(classifyApiError(err))
      notify(err instanceof ApiError && err.code === 'target_has_no_skills' ? 'This target has no skills yet, so a screening call cannot be built.' : 'Could not start the call. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }
  /** After a 404 on submit: drop the lost interview and go back to the Briefing. */
  const startNewAfterLoss = () => {
    stopVoice()
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    setVoiceMode(false); setOrbState('idle')
    setSessionId(null); setScreen(null); setAnswer(''); setFlowState('idle')
    go('workspace')
  }
  const finishing = useRef(false)
  /** The time cap or "End the call": stop voice, end early, put the notes together, then show the debrief. */
  // ponytail: an answer typed at the very last second may be dropped; the server's 20 s grace covers one already sent.
  const finishScreen = async () => {
    const id = sessionIdRef.current
    if (!id || finishing.current) return
    finishing.current = true
    stopVoice()
    setVoiceMode(false); setOrbState('idle')
    setFlowState('generating_reflection')
    try {
      await api.complete(id, { early: true })
    } catch {
      // Nothing was answered, so there is nothing to show.
      void api.abandon(id).catch(() => undefined)
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
      setSessionId(null); setScreen(null); setFlowState('idle'); finishing.current = false
      go('workspace'); notify('The call ended before any answer was saved.')
      return
    }
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    try { setReflection(await api.reflect(id)) } catch { /* the debrief does not need the notes */ }
    setFlowState('idle'); finishing.current = false
    go('screen')
  }
  const screenLeft = useScreenClock(view === 'interview' && screen ? screen.startedAt : null, screen?.capSeconds ?? null, () => void finishScreen())
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
    if (!window.confirm('Clear what MIRROR has saved in this browser and start again? Your saved account data is removed from Settings, under Your data.')) return
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    void api.deleteProfile().catch(() => undefined)
    void data.clearAll()
    stopVoice()
    setVoiceMode(false)
    setAnswers([]); setAnswer(''); setRole(''); setProfile(null); setSessionId(null); setReflection(null); go('home'); notify('Prototype data reset.')
  }

  /** After Settings > Delete all my data: the server and browser are already clear; empty the screen state and land on Today. */
  const afterDataDeleted = () => {
    stopVoice()
    setVoiceMode(false)
    setAnswers([]); setAnswer(''); setRole(''); setProfile(null); setSessionId(null); setReflection(null); go('workspace'); notify('Your data is deleted. Your sign-in account is still here.')
  }

  const profileFresh = useRef(false) // set when The First Interview finishes here, so a slow fetch can't overwrite it
  const loadProfile = () => {
    api.getProfile()
      .then(p => {
        if (profileFresh.current) return
        setProfile(p); setRole(p.role); setVoiceMode(p.mode === 'voice')
        setProfileStatus('ready')
        setView(v => (v === 'firstInterview' ? 'workspace' : v)) // clicked Start before this arrived
      })
      .catch(err => {
        if (profileFresh.current) return
        // Only a 404 means there is no profile yet; any other failure is an error with a retry, never onboarding.
        setProfileStatus(err instanceof ApiError && err.status === 404 ? 'none' : 'error')
      })
  }
  useEffect(() => {
    if (!authed) return
    loadProfile()
  }, [authed])

  // The website at / always opens as the website, signed in or not. Its button goes to the workspace (or sign-in).
  // Only "none" shows onboarding.
  useEffect(() => {
    if (authed && view === 'workspace' && profileStatus === 'none' && !profileFresh.current) go('firstInterview', true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, view, profileStatus])

  useEffect(() => {
    document.title = 'MIRROR — Practise for the job you want'
  }, [])

  // Marketing site (src/site): rendered before the normal view logic. Re-render when SiteLink or back/forward changes the path.
  const [, setPathTick] = useState(0)
  useEffect(() => {
    const on = () => setPathTick(n => n + 1)
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [])
  const sitePath = window.location.pathname
  const siteRoute = matchSite(sitePath)
  const isAuthRoute = siteRoute?.id === 'login' || siteRoute?.id === 'signup'
  useEffect(() => {
    if (authed && isAuthRoute) go('workspace', true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, isAuthRoute])

  useEffect(() => {
    if (!authed) return
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!saved) return
    // Completed, abandoned or missing: forget it and show the normal Overview.
    const forget = () => sessionStorage.removeItem(SESSION_STORAGE_KEY)
    void api.getInterview(saved)
      .then(session => {
        if (session.status !== 'in_progress') return forget()
        // Only what the server returned: the exact question, the answers so far, no guessed progress.
        setSessionId(session.id)
        setQuestionCap(session.questionCap ?? null)
        setScreen(session.kind === 'screen' && session.startedAt ? { startedAt: Date.parse(session.startedAt), capSeconds: session.timeCapSeconds ?? 480 } : null)
        setRole(session.role)
        setAnswers(session.turns.map(t => ({ question: t.question, answer: t.answer })))
        if (session.currentQuestion) setCurrentQuestion(session.currentQuestion)
        if (session.nextQuestionIndex !== null) setQuestionIndex(session.nextQuestionIndex)
        setOrbState(session.pendingFollowUp ? 'thinking' : 'idle')
        // The view stays where the URL says; the Briefing's Continue panel is the way back in.
      })
      // Only a missing session is forgotten; a network slip keeps the breadcrumb so the open interview is not lost.
      .catch(err => { if (err instanceof ApiError && err.status === 404) forget() })
  }, [authed])

  useEffect(() => {
    if (view !== 'interview' || !sessionId) return
    api.getInterview(sessionId)
      .then(session => {
        setQuestionCap(session.questionCap ?? null)
        setScreen(session.kind === 'screen' && session.startedAt ? { startedAt: Date.parse(session.startedAt), capSeconds: session.timeCapSeconds ?? 480 } : null)
        setAnswers(session.turns.map(t => ({ question: t.question, answer: t.answer })))
        if (session.nextQuestionIndex !== null) setQuestionIndex(session.nextQuestionIndex)
        if (session.currentQuestion) setCurrentQuestion(session.currentQuestion)
        if (session.pendingFollowUp) { setFlowState('waiting_nim'); setOrbState('thinking') }
      })
      .catch(err => setFlowState(classifyApiError(err)))
  }, [view, sessionId])

  if (isAuthRoute) {
    if (authed) return null // the effect above is sending them to the workspace
    return <AuthGate session={session} notice={null} onBack={() => go('home')}><></></AuthGate>
  }
  // `/` keeps the existing Landing until SITE_HOME_LIVE is flipped (src/site/router.tsx); signed-in visitors always keep it.
  if (siteRoute?.Component && !(siteRoute.id === 'home' && (authed || !SITE_HOME_LIVE))) {
    const Page = siteRoute.Component
    return (
      <SiteProvider value={{ onTry: () => go(profileStatus === 'none' ? 'firstInterview' : 'workspace') }}>
        <Suspense fallback={<div role="status" aria-label="Loading the page" style={{ minHeight: '100vh' }} />}>
          <Page key={sitePath} params={siteRoute.params} />
        </Suspense>
      </SiteProvider>
    )
  }

  if (view === 'home') return <Landing onTry={() => go(profileStatus === 'none' ? 'firstInterview' : 'workspace')} />

  if (!authed) {
    const failed = new URLSearchParams(window.location.search).get('auth') === 'failed'
    return <AuthGate session={session} notice={failed ? 'That link did not work. Please ask for a new one.' : null} onBack={() => go('home')}><></></AuthGate>
  }

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
        totalDots={total}
        isLast={questionIndex === total - 1}
        focusLabel={profile?.focus}
        answers={answers}
        orb={interviewOrb}
        voice={voice}
        flowText={flowLabel(flowState)}
        canRetry={flowState === 'provider_unavailable' || flowState === 'retryable_failure' || flowState === 'waiting_nim'}
        startsTyping={!voiceMode}
        onStartNew={flowState === 'session_lost' ? startNewAfterLoss : undefined}
        waiting={flowState === 'waiting_nim'}
        busy={busy}
        answer={answer}
        setAnswer={setAnswer}
        sessionId={sessionId}
        replay
        onSubmit={() => void submitAnswer()}
        onRetry={() => void retryFollowUp()}
        onContinueLater={continueLater}
        onEnd={endSession}
        onSwitchToType={switchToType}
        onSwitchToSpeak={switchToSpeak}
        screen={screen ? { remainingSeconds: screenLeft === null ? null : Math.ceil(screenLeft / 1000), totalSeconds: screen.capSeconds, onEnd: () => void finishScreen() } : undefined}
      />
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  }

  const navItems: { id: View; label: string; icon: typeof HomeIcon }[] = [
    { id: 'workspace', label: 'Briefing', icon: HomeIcon },
    { id: 'practice', label: 'Practice', icon: BookOpen },
    { id: 'reports', label: 'Sessions', icon: MessageCircle },
    { id: 'stories', label: 'Stories', icon: BookMarked },
    { id: 'prep', label: 'Interview Prep', icon: ClipboardList },
  ]
  return <div className={`app workspace-app ${calmMotion ? 'reduce-motion' : ''} ${navCollapsed ? 'shell-collapsed' : ''}`}><div className="ambient ambient--two" />
    <aside id="app-sidebar" className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}><div className="sidebar-top"><Brand onClick={() => go('home')} /><button type="button" className="shell-collapse" aria-expanded={!navCollapsed} aria-controls="app-sidebar" aria-label={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggleNav}>{navCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button><button className="mobile-close" onClick={() => setMobileNav(false)}><X /></button></div><nav>{navItems.map(item => <button key={item.id} className={view === item.id || (view === 'report' && item.id === 'reports') || (view === 'targets' && item.id === 'prep') ? 'active' : ''} onClick={() => { if (item.id === 'prep') setTargetId(null); go(item.id) }}><item.icon size={18} /><span className="nav-label">{item.label}</span></button>)}</nav><div className="sidebar-bottom"><button onClick={() => go('settings')} className={view === 'settings' ? 'active' : ''}><Settings size={18} /><span className="nav-label">Settings</span></button><button className="demo-profile" onClick={() => go('profile')}>{session.status === 'signedIn'
      ? <><span>{(session.user.email ?? '?').charAt(0).toUpperCase()}</span><div className="nav-label"><b>{session.user.email ?? 'Your account'}</b><small>Account</small></div></>
      : <><span>D</span><div className="nav-label"><b>Demo account</b><small>Not saved to an account</small></div></>}</button></div></aside>
    {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="workspace-main"><header className="workspace-header"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={21} /></button><div /><div className="header-actions">{session.status === 'demo' && <span className="demo-badge"><Circle size={7} fill="currentColor" /> DEMO</span>}<AccountMenu email={session.status === 'signedIn' ? session.user.email : null} onSignOut={() => void signOut()} /></div></header>
      {view === 'workspace' && (profileStatus === 'loading' || profileStatus === 'none') && <PageSkeleton label="Loading your workspace" />}
      {view === 'workspace' && profileStatus === 'error' && <div className="workspace-error" role="alert"><p>We could not load your profile.</p><button className="m-btn" onClick={() => { setProfileStatus('loading'); loadProfile() }}>Try again</button></div>}
      {view === 'workspace' && profileStatus === 'ready' && (TODAY_V1
        ? <Overview profile={profile} busy={busy} onStart={(question, speak) => { setVoiceMode(speak); void startInterview(role, question, speak) }} onContinue={resumeInterview} onLetGo={letGo} onScreen={id => void startScreening(id)} onOpenStories={openStories} onReplay={id => { setSessionId(id); go('report') }} onOpenItem={id => { setPracticeItem(id); go('practice') }} />
        : <Today
          busy={busy}
          onStart={(question, speak) => { setVoiceMode(speak); void startInterview(role, question, speak) }}
          onContinue={id => resumeInterview(id, role)}
          onLetGo={letGo}
          onScreen={id => void startScreening(id)}
          onOpenStories={addStory}
          onReplay={id => { setSessionId(id); go('report') }}
          onSayItAgain={id => { setSessionId(id); go('report') }}
          onOpenItem={id => { setPracticeItem(id); go('practice') }}
          onOpenReplays={id => { setPracticeItem(id); go('practice') }}
          onOpenTarget={id => { setTargetId(id); go('targets') }}
          onAddTarget={() => { setTargetId('new'); go('targets') }}
          onFirstInterview={() => go('firstInterview')}
        />)}
      {view === 'screen' && sessionId && <ScreenDebriefPage interviewId={sessionId} onDone={() => { setScreen(null); go('workspace') }} />}
      {view === 'practice' && <Practice initialItemId={practiceItem} onInitialConsumed={() => setPracticeItem(null)} />}
      {view === 'profile' && <Account session={session} role={role} onSettings={() => go('settings')} />}
      {(view === 'reports' || view === 'report') && <Sessions openId={view === 'report' ? sessionId : null} refreshKey={reflection?.interviewId} onPractise={() => void startInterview()} onSaveStory={turn => void saveStoryFromAnswer({ question: turn.question, answer: turn.answer, sourceInterviewId: sessionId, sourceTurnId: turn.id }).then(() => notify('Saved to your stories.')).catch(() => notify('Could not save that story just now.'))} />}
      {(view === 'prep' || view === 'targets') && (
        <InterviewPrep
          onStart={(r, q, speak) => { setVoiceMode(speak); void startInterview(r, q, speak) }}
          jobId={targetId} onOpenJob={setTargetId}
          onPractise={(r, o) => { if (o?.speak !== undefined) setVoiceMode(o.speak); void startInterview(r, o?.question, o?.speak ?? voiceMode, o?.targetId) }}
          onPractiseProbe={q => void startInterview(role, q)} onScreen={id => void startScreening(id)} onAddStory={theme => addStory(theme)}
        />
      )}
      {view === 'stories' && <Stories initialQuestion={storyQuestion} initialTheme={storyTheme} onInitialConsumed={() => { setStoryQuestion(null); setStoryTheme(null) }} />}
      {view === 'settings' && <SettingsPage voiceSpeed={voiceSpeed} setVoiceSpeed={setVoiceSpeed} language={language} setLanguage={setLanguage} calmMotion={calmMotion} setCalmMotion={setCalmMotion} notify={notify} onResetDemo={resetDemo} onOpenPrivacy={() => go('privacy')} onDeleted={afterDataDeleted} />}
      {view === 'privacy' && <Privacy onBack={() => go('settings')} onOpenSettings={() => go('settings')} />}
    </main>{toast && <div className="toast" role="status">{toast}</div>}</div>
}
