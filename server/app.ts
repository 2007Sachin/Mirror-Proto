import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'
import type { Env } from './config.js'
import { isNimConfigured, isSupabaseConfigured } from './config.js'
import { FIXED_QUESTIONS } from './domain/questions.js'
import { addTurnSchema, createInterviewSchema } from './domain/schemas.js'
import { addTurn, reconcileReadinessRange, validateEvidence } from './domain/stateMachine.js'
import type { ReflectionRow, Repository, TurnRow } from './repo/types.js'
import type { ReflectionProvider } from './providers/types.js'
import { createNimClient, type NimLog } from './providers/nim.js'
import { workspaceMiddleware } from './middleware/workspace.js'
import { AppError, errorHandler } from './middleware/errors.js'

export interface AppDeps {
  env: Env
  repo: Repository
  /** Optional pre-built provider (tests inject a mocked fetch client here). */
  provider?: ReflectionProvider | null
  log?: NimLog
}

const startedAt = Date.now()

type Interview = NonNullable<Awaited<ReturnType<Repository['getInterview']>>>

function serializeInterview(interview: Interview, turns: TurnRow[], reflection: ReflectionRow | null) {
  return {
    id: interview.id,
    workspace: interview.workspaceId,
    role: interview.role,
    industry: interview.industry,
    status: interview.status,
    questions: FIXED_QUESTIONS,
    nextQuestionIndex: interview.status === 'completed' ? null : turns.length,
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

export function buildApp(deps: AppDeps): Hono {
  const { env, repo } = deps
  const provider =
    deps.provider !== undefined
      ? deps.provider
      : isNimConfigured(env)
        ? createNimClient(env, fetch, deps.log)
        : null

  // Idempotency-Key replays: workspace + interview + key → cached response.
  const idempotency = new Map<string, unknown>()

  async function supabaseLive(): Promise<boolean> {
    if (!isSupabaseConfigured(env)) return false
    try {
      const client = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!)
      const { error } = await client.from('workspaces').select('slug', { head: true, count: 'exact' }).limit(1)
      return !error
    } catch {
      return false
    }
  }

  const api = new Hono()
  // /health and /integration-status are header-free (health checks and
  // monitoring must not require the workspace header); everything else is
  // workspace-scoped.
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
      // NIM is request/response with no cheap liveness probe; `live` mirrors
      // `configured` until a Phase-2 heartbeat exists.
      nim: { configured: isNimConfigured(env), live: isNimConfigured(env), model: env.nimModel },
    }),
  )

  api.post('/interviews', async c => {
    const body = createInterviewSchema.parse(await c.req.json().catch(() => ({})))
    const interview = await repo.createInterview(c.get('workspace'), body)
    return c.json(
      {
        id: interview.id,
        workspace: interview.workspaceId,
        role: interview.role,
        status: interview.status,
        questions: FIXED_QUESTIONS,
        nextQuestionIndex: 0,
        turns: [],
        createdAt: interview.createdAt,
      },
      201,
    )
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
      question: FIXED_QUESTIONS[body.questionIndex],
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
    const responseBody = {
      turn: {
        id: turn.id,
        questionIndex: turn.questionIndex,
        question: turn.question,
        answer: turn.answer,
        transcriptSource: turn.transcriptSource,
        createdAt: turn.createdAt,
      },
      nextQuestionIndex: result.completed ? null : body.questionIndex + 1,
      status: result.status,
    }
    if (idemKey) idempotency.set(idemStoreKey, responseBody)
    return c.json(responseBody, 201)
  })

  api.get('/interviews/:id', async c => {
    const workspace = c.get('workspace')
    const interview = await repo.getInterview(workspace, c.req.param('id'))
    if (!interview) throw new AppError(404, 'interview_not_found')
    const turns = await repo.getTurns(workspace, interview.id)
    const reflection = await repo.getReflection(workspace, interview.id)
    return c.json(serializeInterview(interview, turns, reflection))
  })

  api.post('/interviews/:id/reflect', async c => {
    const workspace = c.get('workspace')
    const interview = await repo.getInterview(workspace, c.req.param('id'))
    if (!interview) throw new AppError(404, 'interview_not_found')
    const turns = await repo.getTurns(workspace, interview.id)
    if (interview.status !== 'completed' || turns.length < FIXED_QUESTIONS.length) {
      throw new AppError(409, 'interview_incomplete', { answers: turns.length })
    }
    if (!provider) throw new AppError(503, 'reflection_provider_unavailable')

    const output = reconcileReadinessRange(
      await provider.generateReflection({
        role: interview.role,
        questions: [...FIXED_QUESTIONS],
        turns: turns.map(t => ({ id: t.id, question: t.question, answer: t.answer })),
      }),
    )
    const evidenceResult = validateEvidence(turns, output.evidence)
    if (!evidenceResult.ok) throw new AppError(evidenceResult.status, evidenceResult.error)

    const reflection = await repo.saveReflection(workspace, {
      interviewId: interview.id,
      role: interview.role,
      readinessLabel: output.readinessLabel,
      readinessRange: output.readinessRange,
      evidence: evidenceResult.evidence,
      focus: output.focus,
      model: env.nimModel,
    })
    return c.json(
      {
        id: reflection.id,
        interviewId: reflection.interviewId,
        readinessLabel: reflection.readinessLabel,
        readinessRange: reflection.readinessRange,
        evidence: reflection.evidence,
        focus: reflection.focus,
        model: reflection.model,
        createdAt: reflection.createdAt,
      },
      201,
    )
  })

  const app = new Hono()
  app.onError(errorHandler)
  app.use('/api/*', cors({ origin: 'http://localhost:5173' }))
  app.route('/api', api)
  // Also mount at root so direct server access (curl, smoke tests) works
  // without the /api prefix; the Vite proxy strips /api before forwarding.
  app.route('/', api)
  return app
}
