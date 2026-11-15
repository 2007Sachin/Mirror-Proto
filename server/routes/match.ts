import { z } from 'zod'
import { AppError } from '../middleware/errors.js'
import type { Api, RouteDeps } from './deps.js'

const claimsSchema = z.object({
  claims: z
    .array(
      z.object({
        quote: z.string().trim().min(1).max(1000),
        skills: z.array(z.string().trim().min(1).max(80)).max(30),
        hasNumber: z.boolean(),
        vague: z.boolean(),
      }),
    )
    .max(200),
})

const matchesSchema = z.object({
  matches: z
    .array(
      z.object({
        skill: z.string().trim().min(1).max(120),
        area: z.string().trim().min(1).max(40),
        weight: z.enum(['core', 'nice']),
        status: z.enum(['covered', 'partial', 'gap']),
        claimQuote: z.string().max(1000).nullable(),
        note: z.string().max(1000),
        probeQuestion: z.string().max(500).nullable(),
        source: z.enum(['ai', 'fallback']),
      }),
    )
    .max(100),
})

/** Plain CRUD for resume claims and per-target gap matches. The match feature adds extraction and matching on top. */
export function registerMatchRoutes(api: Api, { repo }: RouteDeps): void {
  api.get('/resume/claims', async c => c.json(await repo.listResumeClaims(c.get('workspace'))))

  api.put('/resume/claims', async c => {
    const { claims } = claimsSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(await repo.replaceResumeClaims(c.get('workspace'), claims))
  })

  api.delete('/resume/claims', async c => {
    await repo.deleteResumeClaims(c.get('workspace'))
    return c.body(null, 204)
  })

  api.get('/targets/:id/match', async c => {
    const workspace = c.get('workspace')
    const id = c.req.param('id')
    if (!(await repo.getTarget(workspace, id))) throw new AppError(404, 'target_not_found')
    return c.json({ matches: await repo.listGapMatches(workspace, id) })
  })

  api.put('/targets/:id/match', async c => {
    const workspace = c.get('workspace')
    const id = c.req.param('id')
    if (!(await repo.getTarget(workspace, id))) throw new AppError(404, 'target_not_found')
    const { matches } = matchesSchema.parse(await c.req.json().catch(() => ({})))
    return c.json({ matches: await repo.replaceGapMatches(workspace, id, matches) })
  })
}
