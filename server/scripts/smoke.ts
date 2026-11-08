/**
 * API smoke tests against the in-process Hono app (memory repository, no live keys).
 * Exit 0 on success. Never prints env values.
 */
import { buildApp } from '../app.js'
import { createMemoryRepository } from '../repo/memory.js'
import { makeEnv } from '../__tests__/helpers.js'
import { OPENING_QUESTION } from '../domain/questions.js'

const answers = [
  'Our customer onboarding process was causing confusion after a major product update.',
  'I owned the research and the rollout plan, and chose to simplify the workflow itself.',
  'Two teams worried the change would create more work, so I ran a small pilot first.',
  'Completion improved and new customers needed fewer manual walkthroughs afterwards.',
]

const WS = { 'X-Dev-Workspace': 'dev', 'Content-Type': 'application/json' }

async function main() {
  const app = buildApp({ env: makeEnv(), repo: createMemoryRepository() })
  const health = await app.request('/health')
  if (health.status !== 200) throw new Error(`health ${health.status}`)
  const status = await app.request('/integration-status')
  const statusBody = await status.json() as { supabase: { configured: boolean }; nim: { configured: boolean } }
  if (statusBody.supabase.configured || statusBody.nim.configured) {
    throw new Error('smoke expects unconfigured providers in memory mode')
  }

  const created = await app.request('/interviews', {
    method: 'POST',
    headers: WS,
    body: JSON.stringify({ role: 'Product Analyst', industry: 'Technology / SaaS' }),
  })
  if (created.status !== 201) throw new Error(`create ${created.status}`)
  const session = await created.json() as { id: string; currentQuestion: string }
  if (session.currentQuestion !== OPENING_QUESTION) throw new Error('missing opening question')

  for (let i = 0; i < 4; i++) {
    const res = await app.request(`/interviews/${session.id}/turns`, {
      method: 'POST',
      headers: WS,
      body: JSON.stringify({ questionIndex: i, answer: answers[i] }),
    })
    if (res.status !== 201) throw new Error(`turn ${i} ${res.status} ${await res.text()}`)
  }

  const premature = await app.request('/interviews', {
    method: 'POST',
    headers: WS,
    body: JSON.stringify({ role: 'Product Analyst' }),
  })
  const early = await premature.json() as { id: string }
  const completeEarly = await app.request(`/interviews/${early.id}/complete`, { method: 'POST', headers: WS })
  if (completeEarly.status !== 409) throw new Error('premature complete should 409')

  const reflect = await app.request(`/interviews/${session.id}/reflect`, { method: 'POST', headers: WS })
  if (reflect.status !== 503) throw new Error(`reflect without NIM should 503, got ${reflect.status}`)

  const reload = await app.request(`/interviews/${session.id}`, { headers: WS })
  const body = await reload.json() as { turns: unknown[]; status: string }
  if (body.turns.length !== 4 || body.status !== 'completed') {
    throw new Error('session reload missing saved answers')
  }

  console.log('SMOKE PASS (mocked/memory): health, integration-status, create, four turns, premature complete, reflect 503, reload')
}

main().catch(err => {
  console.error('SMOKE FAIL', err instanceof Error ? err.message : 'unknown')
  process.exit(1)
})
