import { z } from 'zod'
import { AppError } from '../middleware/errors.js'
import type { Api, RouteDeps } from './deps.js'

const attemptSchema = z.object({
  interviewId: z.string().min(1).max(80).nullable(),
  questionIndex: z.number().int().min(0).max(11).nullable(),
  question: z.string().min(1).max(2000),
  attempt: z.number().int().min(1).max(50),
  answer: z.string().min(1).max(10_000),
  kind: z.enum(['retry', 'explain']),
  itemId: z.string().min(1).max(120).nullish(),
  transcriptSource: z.enum(['text', 'voice']).default('text'),
})

const replayItemSchema = z.object({
  itemId: z.string().min(1).max(120),
  dueAt: z.string().min(1).max(40),
  intervalDays: z.number().int().min(0).max(3650),
  rung: z.number().int().min(0).max(20),
  lastResult: z.boolean().nullable(),
})

/** Plain CRUD for answer attempts (Replay, spoken technical round) and the replay schedule contract. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerReplayRoutes(api: Api, _deps: RouteDeps): void {
  api.get('/replay/attempts', async c => {
    const kind = c.req.query('kind')
    if (kind && kind !== 'retry' && kind !== 'explain') throw new AppError(400, 'invalid_kind')
    return c.json(
      await c.get('repo').listAnswerAttempts(c.get('workspace'), {
        interviewId: c.req.query('interviewId') || undefined,
        itemId: c.req.query('itemId') || undefined,
        kind: kind as 'retry' | 'explain' | undefined,
      }),
    )
  })

  api.post('/replay/attempts', async c => {
    const body = attemptSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(await c.get('repo').addAnswerAttempt(c.get('workspace'), body), 201)
  })

  api.delete('/replay/attempts', async c => {
    await c.get('repo').deleteAnswerAttempts(c.get('workspace'))
    return c.body(null, 204)
  })

  // Typed contract only: the first scheduler is stateless and derives due items from practice attempts.
  api.get('/practice/schedule', async c => c.json(await c.get('repo').listReplaySchedule(c.get('workspace'))))

  api.put('/practice/schedule', async c => {
    const body = replayItemSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(await c.get('repo').upsertReplayItem(c.get('workspace'), body))
  })

  api.delete('/practice/schedule', async c => {
    const itemId = c.req.query('itemId')
    if (!itemId) throw new AppError(400, 'item_id_required')
    await c.get('repo').deleteReplayItem(c.get('workspace'), itemId)
    return c.body(null, 204)
  })
}
