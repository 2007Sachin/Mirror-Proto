import { z } from 'zod'
import { AppError } from '../middleware/errors.js'
import { acceptProbe, cleanResume, extractClaims, matchClaims } from '../domain/resume.js'
import { runOnboardingStep } from '../domain/onboarding.js'
import type { Repository } from '../repo/types.js'
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

/** The weakest lines first: core gaps, core partials, then nice partials. Mirrors `topProbes` on the client. */
function rankProbes(matches: { skill: string; weight: string; status: string; claimQuote: string | null; probeQuestion: string | null }[]) {
  const rank = (m: (typeof matches)[number]) => (m.weight === 'core' ? (m.status === 'gap' ? 0 : 1) : 2)
  return matches
    .filter(m => m.probeQuestion && m.status !== 'covered')
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 3)
    .map(m => ({ skill: m.skill, quote: m.claimQuote, question: m.probeQuestion as string }))
}

/** Résumé claims, per-target matches and probe questions. Plain CRUD stays; extraction and matching sit on top. */
export function registerMatchRoutes(api: Api, { provider }: RouteDeps): void {
  // ponytail: in-process cache of the AI rewrite per set of draft questions; a restart simply asks again.
  const rewrites = new Map<string, { questions: string[] | null }>()

  async function build(repo: Repository, workspace: string, id: string, refresh: boolean) {
    const target = await repo.getTarget(workspace, id)
    if (!target) throw new AppError(404, 'target_not_found')
    const profile = await repo.getProfile(workspace)
    const resume = profile?.resumeText ? cleanResume(profile.resumeText) : ''
    if (!resume) {
      return { matches: await repo.listGapMatches(workspace, id).catch(() => []), claims: [], probes: [], source: 'fallback' as const, aiAttempted: false, hasResume: false }
    }
    let claims = refresh ? [] : await repo.listResumeClaims(workspace).catch(() => [])
    let matches = refresh ? [] : await repo.listGapMatches(workspace, id).catch(() => [])
    if (claims.length === 0 || matches.length === 0) {
      const fresh = extractClaims(resume)
      const rows = matchClaims(target.skills, fresh)
      const at = new Date().toISOString()
      // Not saved (Supabase is not ready for these stores)? Answer from memory-less rows; the next call computes again.
      claims = await repo.replaceResumeClaims(workspace, fresh).catch(() => fresh.map(c => ({ ...c, id: `c:${c.quote.slice(0, 24)}`, workspaceId: workspace, createdAt: at })))
      matches = await repo.replaceGapMatches(workspace, id, rows).catch(() => rows.map(m => ({ ...m, targetId: id, id: `m:${m.skill}`, workspaceId: workspace, createdAt: at })))
    }
    // Supabase does not store probe questions; derive them again for stored rows that have none.
    if (matches.some(m => m.probeQuestion === null && m.status !== 'covered')) {
      const derived = new Map(matchClaims(target.skills, claims).map(m => [m.skill, m.probeQuestion]))
      matches = matches.map(m => (m.probeQuestion === null && m.status !== 'covered' ? { ...m, probeQuestion: derived.get(m.skill) ?? null } : m))
    }
    let probes = rankProbes(matches)
    let source: 'ai' | 'fallback' = 'fallback'
    let aiAttempted = false
    if (probes.length > 0 && provider?.generateOnboarding) {
      aiAttempted = true
      const key = `${workspace}:${id}:${probes.map(p => p.question).join('|')}`
      let hit = rewrites.get(key)
      if (!hit) {
        const out = await runOnboardingStep(provider, { step: 'resumeProbe', role: target.role, probes })
        const qs = [out.q1, out.q2, out.q3].slice(0, probes.length)
        hit = { questions: out.source === 'ai' && qs.every(q => q && acceptProbe(q, resume)) ? qs : null }
        rewrites.set(key, hit)
      }
      if (hit.questions) {
        const asked = hit.questions
        probes = probes.map((p, i) => ({ ...p, question: asked[i] }))
        source = 'ai'
      }
    }
    // The page shows each row's question; an accepted rewrite replaces the matching row's draft.
    const rewritten = new Map(probes.map(p => [p.skill, p.question]))
    const shown = source === 'ai' ? matches.map(m => (rewritten.has(m.skill) ? { ...m, probeQuestion: rewritten.get(m.skill)! } : m)) : matches
    return { matches: shown, claims, probes, source, aiAttempted, hasResume: true }
  }

  api.get('/resume/claims', async c => c.json(await c.get('repo').listResumeClaims(c.get('workspace'))))

  api.put('/resume/claims', async c => {
    const { claims } = claimsSchema.parse(await c.req.json().catch(() => ({})))
    return c.json(await c.get('repo').replaceResumeClaims(c.get('workspace'), claims))
  })

  api.delete('/resume/claims', async c => {
    await c.get('repo').deleteResumeClaims(c.get('workspace'))
    return c.body(null, 204)
  })

  api.get('/targets/:id/match', async c => {
    return c.json(await build(c.get('repo'), c.get('workspace'), c.req.param('id'), false))
  })

  // Re-run the comparison from the saved résumé (after the learner pastes a new one).
  api.post('/targets/:id/match', async c => c.json(await build(c.get('repo'), c.get('workspace'), c.req.param('id'), true)))

  api.put('/targets/:id/match', async c => {
    const workspace = c.get('workspace')
    const id = c.req.param('id')
    if (!(await c.get('repo').getTarget(workspace, id))) throw new AppError(404, 'target_not_found')
    const { matches } = matchesSchema.parse(await c.req.json().catch(() => ({})))
    return c.json({ matches: await c.get('repo').replaceGapMatches(workspace, id, matches) })
  })
}
