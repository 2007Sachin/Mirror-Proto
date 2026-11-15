import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'
import type { Env } from './config.js'
import { isNimConfigured, isSarvamConfigured, isSupabaseConfigured } from './config.js'
import { FALLBACK_QUESTIONS, totalFor } from './domain/questions.js'
import { interviewContext, nextFollowUp, persistFollowUp as persistFollowUpDomain } from './domain/followUp.js'
import { fallbackNotes } from './domain/fallbacks.js'
import { addTurnSchema, createInterviewSchema } from './domain/schemas.js'
import { extractResumeText, onboardingStepSchema, profileSchema, runOnboardingStep, MAX_RESUME_BYTES } from './domain/onboarding.js'
import { createMockStt } from './voice/stt/mockStt.js'
import { sttProviderName } from './voice/sttProvider.js'
import { createRestSarvamStt } from './voice/stt/createStt.js'
import type { SttProvider } from './voice/providers/types.js'
import { addTurn, canAbandon, canComplete, validateEvidence } from './domain/stateMachine.js'
import { PHASE1_TABLES } from './repo/supabase.js'
import type { AgentEvent, Debrief, InterviewRow, ProfileRow, ReflectionRow, Repository, Target, TurnRow } from './repo/types.js'
import { z } from 'zod'
import { summarise } from './domain/practice.js'
import { buildRounds, extractSkills } from './domain/scout.js'
import { extractClaims, matchClaims } from './domain/resume.js'
import type { ReflectionProvider } from './providers/types.js'
import { ProviderFailure, createNimClient, withDeadline, type NimLog } from './providers/nim.js'
import { requireUser } from './auth/requireUser.js'
import { originCheck } from './auth/csrf.js'
import type { AuthClientFactory } from './auth/supabaseAuth.js'
import type { AuthProvider, RepoFactory } from './auth/types.js'
import { AppError, errorHandler } from './middleware/errors.js'
import { registerReplayRoutes } from './routes/replay.js'
import { registerStoriesRoutes } from './routes/stories.js'
import { registerMatchRoutes } from './routes/match.js'
import { registerAloudRoutes } from './routes/aloud.js'
import { registerScreenRoutes } from './routes/screen.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerMeRoutes } from './routes/me.js'
import { buildScreeningQuestions, screenTimeUp } from './domain/screening.js'

export interface AppDeps {
  env: Env
  /** Resolves the signed-in user on every guarded route (401 otherwise). */
  auth: AuthProvider
  /** Builds the per-request repository for that user. */
  repoFor: RepoFactory
  /** Tests inject a fake Supabase client for the /auth routes. */
  authClientFactory?: AuthClientFactory
  provider?: ReflectionProvider | null
  log?: NimLog
  /** One overall budget per AI call, in ms. Default 8 s; tests use a few ms. */
  aiDeadlineMs?: number
  /** Speech-to-text for onboarding dictation. Defaults to Sarvam REST, or a mock without keys. */
  stt?: SttProvider
  /** Clock for a screen's time cap; tests move it. Defaults to Date.now. */
  now?: () => number
}

const startedAt = Date.now()

/** Notes written without the model are saved with model 'fallback', so a reload still knows. */
const reflectionSource = (r: ReflectionRow) => (r.model === 'fallback' ? 'fallback' : 'ai')

function serializeInterview(interview: InterviewRow, turns: TurnRow[], reflection: ReflectionRow | null) {
  const total = totalFor(interview)
  const pendingFollowUp =
    interview.status === 'in_progress' &&
    turns.length < total &&
    interview.askedQuestions.length === turns.length
  const currentQuestion =
    interview.status === 'in_progress' ? (interview.askedQuestions[turns.length] ?? null) : null
  return {
    id: interview.id,
    workspace: interview.workspaceId,
    role: interview.role,
    industry: interview.industry,
    status: interview.status,
    questions: interview.askedQuestions,
    fallbackCatalog: FALLBACK_QUESTIONS,
    currentQuestion,
    pendingFollowUp,
    nextQuestionIndex: interview.status === 'in_progress' && turns.length < total ? turns.length : null,
    turns: turns.map(t => ({
      id: t.id,
      questionIndex: t.questionIndex,
      question: t.question,
      answer: t.answer,
      transcriptSource: t.transcriptSource,
      createdAt: t.createdAt,
    })),
    reflection: reflection && { ...reflection, source: reflectionSource(reflection) },
    createdAt: interview.createdAt,
    kind: interview.kind ?? 'practice',
    questionCap: interview.questionCap ?? null,
    timeCapSeconds: interview.timeCapSeconds ?? null,
    startedAt: interview.startedAt ?? null,
    targetId: interview.targetId ?? null,
  }
}

function serializeReflection(reflection: ReflectionRow) {
  return {
    id: reflection.id,
    interviewId: reflection.interviewId,
    readinessLabel: reflection.readinessLabel,
    readinessRange: reflection.readinessRange,
    evidence: reflection.evidence,
    focus: reflection.focus,
    suggestion: reflection.suggestion,
    model: reflection.model,
    source: reflectionSource(reflection),
    createdAt: reflection.createdAt,
  }
}

export function buildApp(deps: AppDeps): Hono {
  const { env, auth, repoFor } = deps
  const deadlineMs = deps.aiDeadlineMs ?? 8_000
  const rawProvider =
    deps.provider !== undefined
      ? deps.provider
      : isNimConfigured(env)
        ? createNimClient(env, fetch, deps.log, undefined, undefined, undefined, deadlineMs)
        : null
  // Every AI call gets the same overall deadline; a miss is a ProviderFailure, and each call site falls back.
  const provider: ReflectionProvider | null = rawProvider && {
    generateReflection: r => withDeadline(rawProvider.generateReflection(r), deadlineMs),
    generateFollowUp: rawProvider.generateFollowUp && (r => withDeadline(rawProvider.generateFollowUp!(r), deadlineMs)),
    generateOnboarding: rawProvider.generateOnboarding && (r => withDeadline(rawProvider.generateOnboarding!(r), deadlineMs)),
  }

  const idempotency = new Map<string, unknown>()
  const now = deps.now ?? Date.now

  async function supabaseLive(): Promise<boolean> {
    if (!isSupabaseConfigured(env)) return false
    try {
      const client = createClient(env.supabaseUrl!, env.supabaseAnonKey!)
      const probe = client.from(PHASE1_TABLES.workspaces).select('slug').limit(1)
      const timeout = new Promise<{ error: { message: string } }>(resolve => {
        setTimeout(() => resolve({ error: { message: 'timeout' } }), 1500)
      })
      const { error } = await Promise.race([probe, timeout])
      return !error
    } catch {
      return false
    }
  }

  /** Never fails on the model: a slow or broken provider gives a catalogue question with source 'fallback'. */
  const persistFollowUp = (repo: Repository, interview: InterviewRow, turns: TurnRow[]) => persistFollowUpDomain(repo, interview, turns, provider)

  /** Question 1 starts from their story or focus when The First Interview gave us one; else the catalog opener. */
  async function firstQuestion(profile: ProfileRow | null, role: string, industry?: string): Promise<string> {
    const context = interviewContext(profile)
    const draft = { id: '', workspaceId: '', role, industry: industry ?? null, status: 'in_progress' as const, askedQuestions: [], createdAt: '' }
    // The shared deadline bounds the call; a miss falls back to the catalogue opener.
    return (await nextFollowUp(draft, [], context ? provider : null, context)).question
  }

  async function generateAndSaveReflection(repo: Repository, interview: InterviewRow, turns: TurnRow[]) {
    const profile = await repo.getProfile(interview.workspaceId)
    const toQuotes = (o: { whatStoodOut: { turnId: string; quote: string }[] }) =>
      o.whatStoodOut.map(q => ({ turnId: q.turnId, quote: q.quote, observation: '', competency: '' }))
    let output = fallbackNotes(turns, profile?.focus)
    let model = 'fallback'
    let evidenceResult = validateEvidence(turns, toQuotes(output))
    if (provider) {
      try {
        const ai = await provider.generateReflection({
          role: interview.role,
          industry: interview.industry,
          questions: interview.askedQuestions,
          turns: turns.map(t => ({ id: t.id, question: t.question, answer: t.answer })),
          context: profile && { focus: profile.focus, primaryStory: profile.story },
          previousFocus: await previousReflectionFocus(repo, interview),
        })
        // Quotes must be verbatim from this session's answers. The server checks; a bad quote also falls back.
        const checked = validateEvidence(turns, toQuotes(ai))
        if (checked.ok) {
          output = ai
          model = env.nimModel
          evidenceResult = checked
        }
      } catch (err) {
        if (!(err instanceof ProviderFailure)) throw err
      }
    }
    if (!evidenceResult.ok) throw new AppError(evidenceResult.status, evidenceResult.error)
    return repo.saveReflection(interview.workspaceId, {
      interviewId: interview.id,
      role: interview.role,
      readinessLabel: null,
      readinessRange: null,
      evidence: evidenceResult.evidence,
      focus: output.keepWorkingOn.charAt(0).toUpperCase() + output.keepWorkingOn.slice(1),
      suggestion: output.suggestion,
      model,
    })
  }

  /** "Keep working on" from the most recent earlier completed session, if it has one. */
  async function previousReflectionFocus(repo: Repository, interview: InterviewRow): Promise<string | null> {
    const earlier = (await repo.listInterviews(interview.workspaceId)).filter(i => i.status === 'completed' && i.id !== interview.id)
    for (const i of earlier) {
      const r = await repo.getReflection(interview.workspaceId, i.id)
      if (r) return r.focus
    }
    return null
  }

  const api = new Hono()
  const guard = requireUser(auth, repoFor)
  api.use('*', originCheck(env)) // cookie auth: refuse cross-site writes
  api.use('/interviews', guard)
  api.use('/interviews/*', guard)
  api.use('/onboarding/*', guard)
  api.use('/profile', guard)
  api.use('/coach-note', guard)
  api.use('/targets', guard)
  api.use('/targets/*', guard)
  api.use('/practice/*', guard)
  api.use('/replay/*', guard)
  api.use('/stories', guard)
  api.use('/stories/*', guard)
  api.use('/resume/*', guard)
  api.use('/data', guard)
  api.use('/me/*', guard)
  // Cap request sizes before anything is buffered: 6 MB for the PDF and the audio, 64 KB for JSON.
  const limit = (maxSize: number) => bodyLimit({ maxSize, onError: c => c.json({ error: 'payload_too_large' }, 413) })
  api.use('/onboarding/resume', limit(6 * 1024 * 1024))
  api.use('/onboarding/transcribe', limit(6 * 1024 * 1024))
  api.use('/onboarding/step', limit(64 * 1024))
  api.use('/profile', limit(64 * 1024))
  api.use('/targets', limit(64 * 1024))
  api.use('/targets/*', limit(64 * 1024))
  api.use('/practice/*', limit(64 * 1024))
  api.use('/replay/*', limit(64 * 1024))
  api.use('/stories', limit(64 * 1024))
  api.use('/stories/*', limit(64 * 1024))
  api.use('/resume/*', limit(64 * 1024))

  api.get('/health', c =>
    c.json({
      status: 'ok',
      mode: isSupabaseConfigured(env) ? 'supabase' : 'memory',
      uptime: Math.round((Date.now() - startedAt) / 1000),
      voice: {
        configured: isSarvamConfigured(env),
        provider: sttProviderName(env),
        sttTransport: env.sarvamSttTransport,
      },
    }),
  )

  // What the client may rely on. Supabase mode keeps the new stores in the browser until they are wired.
  api.get('/capabilities', c => {
    const memory = !isSupabaseConfigured(env) || env.demoMode
    return c.json({ newData: memory ? 'server' : 'browser', screenLongCalls: memory || env.screenDbReady })
  })

  api.get('/integration-status', async c =>
    c.json({
      supabase: { configured: isSupabaseConfigured(env), live: await supabaseLive() },
      nim: { configured: isNimConfigured(env), live: isNimConfigured(env), model: env.nimModel },
      voice: {
        configured: isSarvamConfigured(env),
        live: isSarvamConfigured(env),
        provider: sttProviderName(env),
        sttTransport: env.sarvamSttTransport,
        sttModel: env.sarvamSttTransport === 'rest' ? env.sarvamSttModel : env.sarvamSttRealtimeModel,
        ttsModel: env.sarvamTtsModel,
        language: env.sarvamLanguage,
        speaker: env.sarvamSpeaker,
      },
    }),
  )

  api.post('/interviews', async c => {
    const repo = c.get('repo')
    const body = createInterviewSchema.parse(await c.req.json().catch(() => ({})))
    // The First Interview queues a personalised opener for the FIRST interview in the role it was built for.
    const workspace = c.get('workspace')
    const profile = await repo.getProfile(workspace)
    const queued = profile && profile.role === body.role && (await repo.listInterviewsByRole(workspace, body.role)).length === 0
    if (body.kind === 'screen') {
      let questions = body.questions
      let role = body.role
      if (body.targetId) {
        const target = await loadTarget(repo, workspace, body.targetId)
        if (target.skills.length === 0) throw new AppError(400, 'target_has_no_skills')
        const probes = (await repo.listGapMatches(workspace, target.id).catch(() => [])).flatMap(m => (m.probeQuestion ? [m.probeQuestion] : []))
        questions = buildScreeningQuestions({ id: target.id, role: target.role, company: target.company, skills: target.skills, probes }, body.questionCount ?? 6)
        role = target.role
      }
      if (!questions) throw new AppError(400, 'screen_questions_required')
      const screen = await repo.createInterview(workspace, {
        role,
        industry: body.industry,
        openingQuestion: questions[0],
        askedQuestions: questions,
        kind: 'screen',
        questionCap: questions.length,
        timeCapSeconds: (body.timeCapMinutes ?? 8) * 60,
        startedAt: new Date(now()).toISOString(),
        targetId: body.targetId ?? null,
      })
      return c.json(serializeInterview(screen, [], null), 201)
    }
    const interview = await repo.createInterview(workspace, {
      role: body.role,
      industry: body.industry,
      openingQuestion: body.openingQuestion ?? (queued ? profile.firstQuestion : await firstQuestion(profile, body.role, body.industry)),
    })
    return c.json(serializeInterview(interview, [], null), 201)
  })

  // Overview: recent practice, newest first.
  api.get('/interviews', async c => {
    const repo = c.get('repo')
    const workspace = c.get('workspace')
    // Today asks for the default recent few; Sessions pages with ?limit= and ?before=<createdAt>.
    const limit = Math.min(Math.max(Number.parseInt(c.req.query('limit') ?? '', 10) || 10, 1), 100)
    const rows = await repo.listInterviews(workspace, { limit, before: c.req.query('before') || undefined })
    // ponytail: one turns query per row; fine for 100 rows, add a turn-count column if the list grows
    const list = await Promise.all(
      rows.map(async i => ({
        id: i.id,
        role: i.role,
        status: i.status,
        createdAt: i.createdAt,
        answered: (await repo.getTurns(workspace, i.id)).length,
        // The notes, so Today can show lines that landed and how the gap moved without another call.
        notes: await repo.getReflection(workspace, i.id).then(r => r && { keepWorkingOn: r.focus, quotes: r.evidence.map(e => e.quote), source: reflectionSource(r) }),
      })),
    )
    return c.json(list)
  })

  api.post('/interviews/:id/turns', async c => {
    const repo = c.get('repo')
    const workspace = c.get('workspace')
    const interviewId = c.req.param('id')
    const body = addTurnSchema.parse(await c.req.json().catch(() => ({})))
    const idemKey = c.req.header('Idempotency-Key')
    const idemStoreKey = `${workspace}:${interviewId}:${idemKey ?? ''}`

    if (idemKey) {
      const cached = idempotency.get(idemStoreKey)
      if (cached) return c.json(cached, 201)
    }

    const interview = await repo.getInterview(workspace, interviewId)
    if (!interview) throw new AppError(404, 'interview_not_found')
    const turns = await repo.getTurns(workspace, interviewId)
    // A screen past its time cap (plus a short grace for an answer already in flight) ends here, with what it has.
    if (interview.status === 'in_progress' && screenTimeUp(interview, now())) {
      if (turns.length >= 1) await repo.updateInterviewStatus(workspace, interviewId, 'completed')
      throw new AppError(409, 'screen_time_up')
    }
    const result = addTurn(interview, turns, {
      questionIndex: body.questionIndex,
      question: interview.askedQuestions[body.questionIndex] ?? '',
      answer: body.answer,
      transcriptSource: body.transcriptSource,
    })
    if (!result.ok) {
      throw new AppError(result.status, result.error, result.expected !== undefined ? { expected: result.expected } : undefined)
    }

    const turn = await repo.addTurn(workspace, interviewId, {
      questionIndex: result.turn.questionIndex,
      question: result.turn.question,
      answer: result.turn.answer,
      transcriptSource: result.turn.transcriptSource,
    })
    if (result.completed) {
      await repo.updateInterviewStatus(workspace, interviewId, 'completed')
    }

    let nextQuestion: string | null = null
    let source: 'ai' | 'fallback' = 'ai'
    if (!result.completed) {
      const fresh = (await repo.getInterview(workspace, interviewId)) ?? interview
      const savedTurns = await repo.getTurns(workspace, interviewId)
      const next = await persistFollowUp(repo, fresh, savedTurns)
      nextQuestion = next.question
      source = next.source
    }

    const responseBody = {
      turn: {
        id: turn.id,
        questionIndex: turn.questionIndex,
        question: turn.question,
        answer: turn.answer,
        transcriptSource: turn.transcriptSource,
        createdAt: turn.createdAt,
      },
      nextQuestion,
      nextQuestionIndex: result.completed ? null : body.questionIndex + 1,
      status: result.status,
      saved: true,
      source,
    }
    if (idemKey) idempotency.set(idemStoreKey, responseBody)
    return c.json(responseBody, 201)
  })

  api.post('/interviews/:id/next-question', async c => {
    const repo = c.get('repo')
    const workspace = c.get('workspace')
    const interview = await repo.getInterview(workspace, c.req.param('id'))
    if (!interview) throw new AppError(404, 'interview_not_found')
    if (interview.status !== 'in_progress') {
      throw new AppError(409, interview.status === 'abandoned' ? 'interview_abandoned' : 'interview_already_completed')
    }
    const turns = await repo.getTurns(workspace, interview.id)
    if (turns.length >= totalFor(interview)) throw new AppError(409, 'interview_already_completed')
    const { question, source } = await persistFollowUp(repo, interview, turns)
    return c.json({
      source,
      nextQuestion: question,
      nextQuestionIndex: turns.length,
      status: interview.status,
    })
  })

  api.get('/interviews/:id', async c => {
    const repo = c.get('repo')
    const workspace = c.get('workspace')
    const interview = await repo.getInterview(workspace, c.req.param('id'))
    if (!interview) throw new AppError(404, 'interview_not_found')
    const turns = await repo.getTurns(workspace, interview.id)
    const reflection = await repo.getReflection(workspace, interview.id)
    return c.json(serializeInterview(interview, turns, reflection))
  })

  api.post('/interviews/:id/complete', async c => {
    const repo = c.get('repo')
    const workspace = c.get('workspace')
    const interview = await repo.getInterview(workspace, c.req.param('id'))
    const turns = interview ? await repo.getTurns(workspace, interview.id) : []
    // { early: true } ends a screen at the time cap or when the learner ends the call; practice ignores it.
    const early = ((await c.req.json().catch(() => ({}))) as { early?: unknown } | null)?.early === true
    const check = canComplete(interview, turns, { early })
    if (!check.ok) {
      throw new AppError(check.status, check.error, check.answers !== undefined ? { answers: check.answers } : undefined)
    }
    if (interview && interview.status !== 'completed') {
      await repo.updateInterviewStatus(workspace, interview.id, 'completed')
    }
    const fresh = await repo.getInterview(workspace, c.req.param('id'))
    const reflection = await repo.getReflection(workspace, c.req.param('id'))
    return c.json(serializeInterview(fresh!, turns, reflection))
  })

  api.post('/interviews/:id/abandon', async c => {
    const repo = c.get('repo')
    const workspace = c.get('workspace')
    const interview = await repo.getInterview(workspace, c.req.param('id'))
    const check = canAbandon(interview)
    if (!check.ok) throw new AppError(check.status, check.error)
    await repo.updateInterviewStatus(workspace, interview!.id, 'abandoned')
    const turns = await repo.getTurns(workspace, interview!.id)
    const fresh = await repo.getInterview(workspace, interview!.id)
    return c.json(serializeInterview(fresh!, turns, null))
  })

  api.post('/interviews/:id/reflect', async c => {
    const repo = c.get('repo')
    const workspace = c.get('workspace')
    const interview = await repo.getInterview(workspace, c.req.param('id'))
    if (!interview) throw new AppError(404, 'interview_not_found')
    const turns = await repo.getTurns(workspace, interview.id)
    // A screen that ended early is already completed, so notes work from the answers it has.
    const check = canComplete(interview, turns, { early: interview.status === 'completed' })
    if (!check.ok) {
      throw new AppError(check.status, check.error, {
        ...(check.answers !== undefined ? { answers: check.answers } : {}),
        message: 'This session was not finished, so there are no notes to write yet.',
      })
    }
    if (interview.status !== 'completed') {
      await repo.updateInterviewStatus(workspace, interview.id, 'completed')
    }
    const reflection = await generateAndSaveReflection(repo, interview, turns)
    return c.json(serializeReflection(reflection), 201)
  })

  // ---- The First Interview (replaces onboarding) ----
  api.post('/onboarding/resume', async c => {
    const file = (await c.req.parseBody()).file
    if (!(file instanceof File) || file.size > MAX_RESUME_BYTES) throw new AppError(400, 'invalid_resume')
    const text = await extractResumeText(new Uint8Array(await file.arrayBuffer()))
    if (!text) throw new AppError(422, 'resume_unreadable')
    return c.json({ text })
  })

  api.post('/onboarding/step', async c => {
    const body = onboardingStepSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(await runOnboardingStep(provider, body))
  })

  // Dictation: raw PCM16 16 kHz mono in, text out. The text goes into the answer box for the user to review.
  api.post('/onboarding/transcribe', async c => {
    const pcm = Buffer.from(await c.req.arrayBuffer())
    if (pcm.length === 0 || pcm.length > 6 * 1024 * 1024) throw new AppError(400, 'invalid_audio')
    const sttName = sttProviderName(env)
    if (!deps.stt && sttName === 'none') throw new AppError(503, 'voice_unavailable')
    const stt = deps.stt ?? (sttName === 'sarvam' ? createRestSarvamStt(env) : createMockStt())
    const stream = stt.startStream({ language: env.sarvamLanguage, sampleRate: 16000 })
    try {
      stream.sendAudio(pcm)
      return c.json({ text: (await stream.finalize()).trim() })
    } catch {
      throw new AppError(502, 'transcription_failed')
    }
  })

  // Overview: the Coach's note. Built from the latest completed session, else from The First Interview.
  // ponytail: regenerated on every visit (~1s); cache by (latest session, profile) if the model cost matters
  // Today's rep stays the same until something it was built from changes (a new finished session, a new focus,
  // an interview opened or closed). ponytail: in-memory, so a server restart rewrites it once; persist it if that matters.
  const coachNotes = new Map<string, Record<string, string>>()
  api.get('/coach-note', async c => {
    const repo = c.get('repo')
    const workspace = c.get('workspace')
    const profile = await repo.getProfile(workspace)
    if (!profile) throw new AppError(404, 'profile_not_found')
    const interviews = await repo.listInterviews(workspace)
    const done = interviews.find(i => i.status === 'completed')
    const transcript = done
      ? (await repo.getTurns(workspace, done.id)).map(t => ({ question: t.question, answer: t.answer }))
      : [
          { question: 'Tell me about something you did that you’re proud of.', answer: profile.story },
          { question: profile.pressureQuestion, answer: profile.pressureAnswer },
        ]
    const key = `${workspace}:${done?.id ?? 'first'}:${profile.focus}:${interviews.some(i => i.status === 'in_progress')}`
    const cached = coachNotes.get(key)
    if (cached) return c.json({ ...cached, basedOn: done ? 'interview' : 'first-interview' })
    const note = await runOnboardingStep(provider, {
      step: 'coach',
      role: profile.role,
      focus: profile.focus,
      transcript,
      inProgress: interviews.some(i => i.status === 'in_progress'),
      reflectionFocus: done ? (await repo.getReflection(workspace, done.id))?.focus : undefined,
    })
    // A fallback is not cached: a short outage must not stick to this key.
    if (note.source === 'ai') coachNotes.set(key, note)
    return c.json({ ...note, basedOn: done ? 'interview' : 'first-interview' })
  })

  // ---- The Loop: targets ----
  /** Scout runs after the response. Each REAL step appends an event; any failure still ends in 'ready'. */
  async function runScout(repo: Repository, workspace: string, target: Target): Promise<void> {
    const events: AgentEvent[] = []
    const say = async (agent: AgentEvent['agent'], text: string, source?: 'ai' | 'fallback') => {
      events.push({ at: new Date().toISOString(), agent, text, ...(source ? { source } : {}) })
      await repo.updateTarget(workspace, target.id, { events: [...events] })
    }
    let skills: Target['skills'] = []
    let rounds: Target['rounds'] = []
    let nextStep: string | null = null
    try {
      await say('Scout', `Read the job description (${target.jd.split(/\s+/).filter(Boolean).length} words).`)
      skills = extractSkills(target.jd)
      await say('Scout', skills.length ? `Found ${skills.length} skills: ${skills.map(s => s.name).join(', ')}.` : 'Found no skills I know by name.')
      // Compare the résumé with the job. Never fails Scout: storage may be "not ready" (Supabase), and the route can compute on demand.
      const resume = (await repo.getProfile(workspace).catch(() => null))?.resumeText
      if (resume) {
        const claims = extractClaims(resume)
        try {
          await repo.replaceResumeClaims(workspace, claims)
          await repo.replaceGapMatches(workspace, target.id, matchClaims(skills, claims))
        } catch { /* storage_not_ready: GET /targets/:id/match computes it on demand */ }
        await say('Scout', 'I compared your résumé with the job.')
      } else {
        await say('Scout', 'No résumé on file, so I skipped the comparison.')
      }
      rounds = buildRounds(skills)
      await say('Scout', `Built ${rounds.length} rounds from them.`)
      const plan = await runOnboardingStep(provider, {
        step: 'planner',
        company: target.company,
        role: target.role,
        skills: skills.map(s => s.name),
        rounds: rounds.map(r => ({ title: r.title, available: r.available })),
        interviewDate: target.interviewDate,
      })
      nextStep = plan.nextStep.charAt(0).toUpperCase() + plan.nextStep.slice(1)
      await say('Planner', nextStep, plan.source === 'fallback' ? 'fallback' : 'ai')
    } catch (err) {
      console.error('scout failed', err instanceof Error ? err.message : err)
      if (rounds.length === 0) rounds = buildRounds(skills)
      events.push({ at: new Date().toISOString(), agent: 'Scout', text: 'I could not finish the plan, so this one is basic.' })
    }
    await repo.updateTarget(workspace, target.id, { skills, rounds, nextStep, events, status: 'ready' }).catch(() => null)
  }

  const short = (max: number) => z.string().trim().min(1).max(max)
  const createTargetSchema = z.object({
    company: short(120),
    role: short(120),
    interviewDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(d => !Number.isNaN(Date.parse(d)))
      .optional(),
    jd: z.string().trim().min(20).max(20_000),
  })
  const sqlTurnSchema = z.object({
    problem: z.object({ id: short(80), title: short(200), prompt: short(2000) }),
    query: short(5000),
    passed: z.boolean(),
    error: z.string().max(2000).optional(),
    resultPreview: z.string().max(2000).optional(),
  })
  const sqlDebriefSchema = z.object({
    attempts: z.array(z.object({ problemId: short(80), title: short(200), query: short(5000), passed: z.boolean() })).min(1).max(8),
  })

  /** The latest Planner event carries where the next step came from; older targets have none and read as 'ai'. */
  const nextStepSource = (t: Target): 'ai' | 'fallback' =>
    [...t.events].reverse().find(e => e.agent === 'Planner')?.source === 'fallback' ? 'fallback' : 'ai'

  const loadTarget = async (repo: Repository, workspace: string, id: string) => {
    const target = await repo.getTarget(workspace, id)
    if (!target) throw new AppError(404, 'target_not_found')
    return target
  }

  // ---- Practice hub ----
  const attemptSchema = z.object({
    itemId: z.string().min(1).max(120),
    track: z.enum(['sql', 'python', 'stats', 'case']),
    topic: z.string().min(1).max(120),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    correct: z.boolean(),
    seconds: z.number().int().min(0).max(3600),
    hintsUsed: z.number().int().min(0).max(20),
  })

  api.post('/practice/attempts', async c => {
    const repo = c.get('repo')
    const body = attemptSchema.parse(await c.req.json().catch(() => ({})))
    const row = await repo.addPracticeAttempt(c.get('workspace'), body)
    return c.json({ id: row.id }, 201)
  })

  api.get('/practice/summary', async c => {
    const repo = c.get('repo')
    // ponytail: reads up to 5000 attempts and folds in memory; move to SQL aggregation if a user ever exceeds that.
    return c.json(summarise(await repo.getPracticeAttempts(c.get('workspace'))))
  })

  api.post('/targets', async c => {
    const repo = c.get('repo')
    const workspace = c.get('workspace')
    const body = createTargetSchema.parse(await c.req.json().catch(() => ({})))
    const target = await repo.createTarget(workspace, { ...body, interviewDate: body.interviewDate ?? null })
    // ponytail: in-process background job; a server restart mid-scout leaves 'scouting'. Move to a queue if that matters.
    // The request's repo and workspace are captured here: nothing reads the context after the response.
    void runScout(repo, workspace, target)
    return c.json(target, 201)
  })

  api.get('/targets', async c => {
    const repo = c.get('repo')
    const list = await repo.listTargets(c.get('workspace'))
    return c.json(list.map(t => ({ id: t.id, company: t.company, role: t.role, interviewDate: t.interviewDate, status: t.status, nextStep: t.nextStep, nextStepSource: nextStepSource(t), createdAt: t.createdAt })))
  })

  api.get('/targets/:id', async c => {
    const repo = c.get('repo')
    const target = await loadTarget(repo, c.get('workspace'), c.req.param('id'))
    return c.json({ ...target, nextStepSource: nextStepSource(target) })
  })

  api.delete('/targets/:id', async c => {
    const repo = c.get('repo')
    await repo.deleteTarget(c.get('workspace'), c.req.param('id'))
    return c.body(null, 204)
  })

  api.post('/targets/:id/sql-turn', async c => {
    const repo = c.get('repo')
    await loadTarget(repo, c.get('workspace'), c.req.param('id'))
    const body = sqlTurnSchema.parse(await c.req.json().catch(() => ({})))
    const out = await runOnboardingStep(provider, { step: 'sqlFollowUp', ...body })
    return c.json({ followUp: out.question, source: out.source })
  })

  api.post('/targets/:id/sql-debrief', async c => {
    const repo = c.get('repo')
    const workspace = c.get('workspace')
    const target = await loadTarget(repo, workspace, c.req.param('id'))
    const { attempts } = sqlDebriefSchema.parse(await c.req.json().catch(() => ({})))
    const out = await runOnboardingStep(provider, { step: 'sqlDebrief', role: target.role, attempts })
    const solved = attempts.filter(a => a.passed).length
    const debrief: Debrief = {
      id: crypto.randomUUID(),
      kind: 'sql',
      createdAt: new Date().toISOString(),
      solved,
      total: attempts.length,
      wentWell: out.wentWell,
      keepWorkingOn: out.keepWorkingOn,
      suggestion: out.suggestion,
    }
    const plan = await runOnboardingStep(provider, {
      step: 'planner',
      company: target.company,
      role: target.role,
      skills: target.skills.map(s => s.name),
      rounds: target.rounds.map(r => ({ title: r.title, available: r.available })),
      interviewDate: target.interviewDate,
      keepWorkingOn: debrief.keepWorkingOn,
    })
    const nextStep = plan.nextStep.charAt(0).toUpperCase() + plan.nextStep.slice(1)
    const at = new Date().toISOString()
    // ponytail: read-modify-write on events; two debriefs at the same instant could drop one. Fine for one user.
    await repo.updateTarget(workspace, target.id, {
      debriefs: [...target.debriefs, debrief],
      events: [
        ...target.events,
        { at, agent: 'Coach', text: `Wrote up the SQL round: ${solved} of ${attempts.length} problems solved.` },
        { at, agent: 'Planner', text: nextStep, source: plan.source === 'fallback' ? 'fallback' : 'ai' },
      ],
      nextStep,
    })
    return c.json({ ...debrief, source: out.source, nextStepSource: plan.source })
  })

  api.get('/profile', async c => {
    const repo = c.get('repo')
    const profile = await repo.getProfile(c.get('workspace'))
    if (!profile) throw new AppError(404, 'profile_not_found')
    return c.json(profile)
  })

  api.delete('/profile', async c => {
    const repo = c.get('repo')
    await repo.deleteProfile(c.get('workspace'))
    return c.body(null, 204)
  })

  api.put('/profile', async c => {
    const repo = c.get('repo')
    const body = profileSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(await repo.saveProfile(c.get('workspace'), body))
  })

  // Plain CRUD for the new stores; each feature adds its own logic inside its module.
  const routeDeps = { provider, env }
  registerReplayRoutes(api, routeDeps)
  registerStoriesRoutes(api, routeDeps)
  registerMatchRoutes(api, routeDeps)
  registerAloudRoutes(api, routeDeps)
  registerScreenRoutes(api, routeDeps)
  registerMeRoutes(api, routeDeps)

  // Reset: clears every new store for the workspace.
  api.delete('/data', async c => {
    const repo = c.get('repo')
    await repo.deleteAllNewData(c.get('workspace'))
    return c.body(null, 204)
  })

  const app = new Hono()
  app.onError(errorHandler)
  app.use(
    '/api/*',
    cors({
      origin: ['http://localhost:3000', 'http://localhost:5173'],
    }),
  )
  registerAuthRoutes(app, { env, auth, repoFor, clientFactory: deps.authClientFactory }) // outside the guarded groups: this is how a caller signs in
  app.route('/api', api)
  app.route('/', api)
  return app
}
