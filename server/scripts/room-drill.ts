/** Throttle drill: 10 simultaneous interviews, model always failing (or answering 429). Every turn must still get a question. `npm run room:drill`. */
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { testAuth } from '../auth/testAuth.js'
import { buildApp } from '../app.js'
import { createMemoryRepository } from '../repo/memory.js'
import { makeEnv } from '../__tests__/helpers.js'
import { ProviderFailure } from '../providers/nim.js'
import type { ReflectionProvider } from '../providers/types.js'

const ANSWERS = [
  'Our customer onboarding process was causing confusion after a major product update.',
  'I owned the research and the rollout plan, and chose to simplify the workflow itself.',
  'Two teams worried the change would create more work, so I ran a small pilot first.',
  'Completion improved and new customers needed fewer manual walkthroughs afterwards.',
]
export type DrillMode = 'fail' | 'throttle'

export interface DrillResult { user: string; questions: string[]; problems: string[] }

export async function runDrill(mode: DrillMode, n = 10): Promise<DrillResult[]> {
  const boom = () => Promise.reject(new ProviderFailure(mode === 'throttle' ? 'nim 429 too many requests' : 'nim unavailable'))
  const provider: ReflectionProvider = { generateReflection: boom, generateFollowUp: boom, generateNextQuestion: boom }
  const repo = createMemoryRepository()
  const app = buildApp({ env: makeEnv(), auth: testAuth(), repoFor: () => repo, provider })
  return Promise.all(Array.from({ length: n }, async (_, i): Promise<DrillResult> => {
    const user = `drill-${i}`
    const h = { 'X-Test-User': user, 'Content-Type': 'application/json' }
    const problems: string[] = []
    const created = await app.request('/interviews', { method: 'POST', headers: h, body: JSON.stringify({ role: 'Product Analyst' }) })
    if (created.status !== 201) return { user, questions: [], problems: [`create ${created.status}`] }
    const session = await created.json() as { id: string; currentQuestion: string }
    const questions = [session.currentQuestion]
    for (let t = 0; t < ANSWERS.length; t++) {
      const res = await app.request(`/interviews/${session.id}/turns`, { method: 'POST', headers: h, body: JSON.stringify({ questionIndex: t, answer: ANSWERS[t] }) })
      if (res.status !== 201) { problems.push(`turn ${t} ${res.status}`); break }
      const body = await res.json() as { nextQuestion: string | null }
      if (t < ANSWERS.length - 1) {
        if (body.nextQuestion) questions.push(body.nextQuestion)
        else problems.push(`turn ${t} gave no question`)
      }
    }
    const seen = new Set<string>()
    for (const q of questions) {
      const key = q.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
      if (seen.has(key)) problems.push(`repeat: ${q}`)
      seen.add(key)
    }
    return { user, questions, problems }
  }))
}

async function main() {
  let bad = 0
  for (const mode of ['fail', 'throttle'] as const) {
    const out = await runDrill(mode)
    const problems = out.flatMap(r => r.problems.map(p => `${r.user}: ${p}`))
    console.log(`${mode}: ${out.length} interviews, ${problems.length} problems`)
    for (const p of problems) console.log(`  ${p}`)
    bad += problems.length
  }
  process.exit(bad ? 1 : 0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void main()
