import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'
import type { Env } from './config.js'
import { isNimConfigured, isSupabaseConfigured } from './config.js'
import { FALLBACK_QUESTIONS, OPENING_QUESTION, TOTAL_QUESTIONS } from './domain/questions.js'
import { persistFollowUpQuestion } from './domain/followUp.js'
import { addTurnSchema, createInterviewSchema } from './domain/schemas.js'
import { addTurn, canAbandon, canComplete, reconcileReadinessRange, validateEvidence } from './domain/stateMachine.js'
import { PHASE1_TABLES } from './repo/supabase.js'
import type { InterviewRow, ReflectionRow, Repository, TurnRow } from './repo/types.js'
import type { ReflectionProvider } from './providers/types.js'
import { ProviderFailure, createNimClient, type NimLog } from './providers/nim.js'
import { workspaceMiddleware } from './middleware/workspace.js'
import { AppError, errorHandler } from './middleware/errors.js'

export interface AppDeps {
  env: Env
  repo: Repository
  provider?: ReflectionProvider | null
  log?: NimLog
}

const startedAt = Date.now()

function serializeInterview(interview: InterviewRow, turns: TurnRow[], reflection: ReflectionRow | null) {
  const pendingFollowUp =
    interview.status === 'in_progress' &&
    turns.length < TOTAL_QUESTIONS &&
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
    nextQuestionIndex: interview.status === 'in_progress' && turns.length < TOTAL_QUESTIONS ? turns.length : null,
    turns: turns.map(t => ({
      id: t.id,
      questionIndex: t.questionIndex,
      question: t.question,
      answer: t.answer,
      transcriptSource: t.transcriptSource,
      createdAt: t.createdAt,
    })),
    reflection,
    createdAt: interview.createdAt,
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
    model: reflection.model,
    createdAt: reflection.createdAt,
  }
}

export function buildApp(deps: AppDeps): Hono {
  const { env, repo } = deps
  const provider =
    deps.provider !== undefined
      ? deps.provider
      : isNimConfigured(env)
        ? createNimClient(env, fetch, deps.log)
        : null

  const idempotency = new Map<string, unknown>()

  async function supabaseLive(): Promise<boolean> {
    if (!isSupabaseConfigured(env)) return false
    try {
      const client = createClient(env.supabaseUrl!, env.supabaseSecretKey!)
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

  async function persistFollowUp(interview: InterviewRow, turns: TurnRow[]): Promise<string> {
    try {
      return await persistFollowUpQuestion(repo, interview, turns, provider)
    } catch (err) {
      if (err instanceof ProviderFailure) {
        throw new AppError(503, 'followup_provider_unavailable', { answers: turns.length })
      }
      throw err
    }
  }

  async function generateAndSaveReflection(interview: InterviewRow, turns: TurnRow[]) {
    if (!provider) throw new AppError(503, 'reflection_provider_unavailable')
    const output = reconcileReadinessRange(
      await provider.generateReflection({
        role: interview.role,
        questions: interview.askedQuestions,
        turns: turns.map(t => ({ id: t.id, question: t.question, answer: t.answer })),
      }),
    )
    const evidenceResult = validateEvidence(turns, output.evidence)
    if (!evidenceResult.ok) throw new AppError(evidenceResult.status, evidenceResult.error)
    return repo.saveReflection(interview.workspaceId, {
      interviewId: interview.id,
      role: interview.role,
      readinessLabel: output.readinessLabel,
      readinessRange: output.readinessRange,
      evidence: evidenceResult.evidence,
      focus: output.focus,
      model: env.nimModel,
    })
  }

  const api = new Hono()
  api.use('/interviews', workspaceMiddleware(repo))
  api.use('/interviews/*', workspaceMiddleware(repo))

  api.get('/health', c =>
    c.json({
      status: 'ok',
      mode: isSupabaseConfigured(env) ? 'supabase' : 'memory',
      uptime: Math.round((Date.now() - startedAt) / 1000),
    }),
  )

  api.get('/integration-status', async c =>
    c.json({
      supabase: { configured: isSupabaseConfigured(env), live: await supabaseLive() },
      nim: { configured: isNimConfigured(env), live: isNimConfigured(env), model: env.nimModel },
    }),
  )

  api.post('/interviews', async c => {
    const body = createInterviewSchema.parse(await c.req.json().catch(() => ({})))
    const interview = await repo.createInterview(c.get('workspace'), {
      role: body.role,
      industry: body.industry,
      openingQuestion: OPENING_QUESTION,
    })
    return c.json(serializeInterview(interview, [], null), 201)
  })

  api.post('/interviews/:id/turns', async c => {
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
    if (!result.completed) {
      const fresh = (await repo.getInterview(workspace, interviewId)) ?? interview
      const savedTurns = await repo.getTurns(workspace, interviewId)
      try {
        nextQuestion = await persistFollowUp(fresh, savedTurns)
      } catch (err) {
        if (err instanceof AppError) {
          throw new AppError(err.status, err.code, {
            ...err.extra,
            turn: {
              id: turn.id,
              questionIndex: turn.questionIndex,
              question: turn.question,
              answer: turn.answer,
              transcriptSource: turn.transcriptSource,
              createdAt: turn.createdAt,
            },
            nextQuestionIndex: body.questionIndex + 1,
            status: 'in_progress',
            saved: true,
          })
        }
        throw err
      }
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
    }
    if (idemKey) idempotency.set(idemStoreKey, responseBody)
    return c.json(responseBody, 201)
  })

  api.post('/interviews/:id/next-question', async c => {
    const workspace = c.get('workspace')
    const interview = await repo.getInterview(workspace, c.req.param('id'))
    if (!interview) throw new AppError(404, 'interview_not_found')
    if (interview.status !== 'in_progress') {
      throw new AppError(409, interview.status === 'abandoned' ? 'interview_abandoned' : 'interview_already_completed')
    }
    const turns = await repo.getTurns(workspace, interview.id)
    if (turns.length >= TOTAL_QUESTIONS) throw new AppError(409, 'interview_already_completed')
    const question = await persistFollowUp(interview, turns)
    return c.json({
      nextQuestion: question,
      nextQuestionIndex: turns.length,
      status: interview.status,
    })
  })

  api.get('/interviews/:id', async c => {
    const workspace = c.get('workspace')
    const interview = await repo.getInterview(workspace, c.req.param('id'))
    if (!interview) throw new AppError(404, 'interview_not_found')
    const turns = await repo.getTurns(workspace, interview.id)
    const reflection = await repo.getReflection(workspace, interview.id)
    return c.json(serializeInterview(interview, turns, reflection))
  })

  api.post('/interviews/:id/complete', async c => {
    const workspace = c.get('workspace')
    const interview = await repo.getInterview(workspace, c.req.param('id'))
    const turns = interview ? await repo.getTurns(workspace, interview.id) : []
    const check = canComplete(interview, turns)
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
    const workspace = c.get('workspace')
    const interview = await repo.getInterview(workspace, c.req.param('id'))
    if (!interview) throw new AppError(404, 'interview_not_found')
    const turns = await repo.getTurns(workspace, interview.id)
    const check = canComplete(interview, turns)
    if (!check.ok) {
      throw new AppError(check.status, check.error, check.answers !== undefined ? { answers: check.answers } : undefined)
    }
    if (interview.status !== 'completed') {
      await repo.updateInterviewStatus(workspace, interview.id, 'completed')
    }
    const reflection = await generateAndSaveReflection(interview, turns)
    return c.json(serializeReflection(reflection), 201)
  })

  const app = new Hono()
  app.onError(errorHandler)
  app.use(
    '/api/*',
    cors({
      origin: ['http://localhost:3000', 'http://localhost:5173'],
    }),
  )
  app.route('/api', api)
  app.route('/', api)
  return app
}
