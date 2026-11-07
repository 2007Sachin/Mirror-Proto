import { describe, expect, it } from 'vitest'
import { j, makeApp, WS } from './helpers.js'

async function createAndTurns(app: ReturnType<typeof makeApp>['app'], ws: Record<string, string>, role: string) {
  const res = await app.request('/interviews', {
    method: 'POST',
    headers: { ...ws, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
  const { id } = (await j(res)) as { id: string }
  for (let i = 0; i < 4; i++) {
    await app.request(`/interviews/${id}/turns`, {
      method: 'POST',
      headers: { ...ws, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIndex: i, answer: `Answer ${i} for ${role} with enough detail to be valid.` }),
    })
  }
  return id
}

describe('workspace isolation', () => {
  it('two workspaces cannot cross-fetch each other’s interviews', async () => {
    const { app } = makeApp()
    const wsA = { 'X-Dev-Workspace': 'alpha' }
    const idA = await createAndTurns(app, wsA, 'Product Analyst')

    const foreign = await app.request(`/interviews/${idA}`, { headers: { 'X-Dev-Workspace': 'beta' } })
    expect(foreign.status).toBe(404)

    const foreignTurn = await app.request(`/interviews/${idA}/turns`, {
      method: 'POST',
      headers: { ...wsA, 'X-Dev-Workspace': 'beta', 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIndex: 0, answer: 'Trying to write into another workspace.' }),
    })
    expect(foreignTurn.status).toBe(404)

    const own = await app.request(`/interviews/${idA}`, { headers: wsA })
    expect(own.status).toBe(200)
  })

  it('role-scoped listing never leaks other roles or workspaces', async () => {
    const { app, repo } = makeApp()
    await createAndTurns(app, { 'X-Dev-Workspace': 'alpha' }, 'Product Analyst')
    await createAndTurns(app, { 'X-Dev-Workspace': 'alpha' }, 'UX Designer')
    await createAndTurns(app, { 'X-Dev-Workspace': 'beta' }, 'Product Analyst')

    const alphaAnalyst = await repo.listInterviewsByRole('alpha', 'Product Analyst')
    expect(alphaAnalyst.length).toBe(1)
    expect(alphaAnalyst[0].workspaceId).toBe('alpha')

    const betaAnalyst = await repo.listInterviewsByRole('beta', 'Product Analyst')
    expect(betaAnalyst.length).toBe(1)
    expect(betaAnalyst[0].id).not.toBe(alphaAnalyst[0].id)
    expect(await repo.listInterviewsByRole('alpha', 'Software Engineer')).toEqual([])
    expect(await repo.listInterviewsByRole('gamma', 'Product Analyst')).toEqual([])
  })

  it('reflections stay workspace-scoped on reload', async () => {
    const { app, repo } = makeApp()
    const idA = await createAndTurns(app, WS, 'Product Analyst')
    await repo.saveReflection('dev', {
      interviewId: idA,
      role: 'Product Analyst',
      readinessLabel: 'solid',
      readinessRange: { low: 62, high: 72 },
      evidence: [],
      focus: 'Make the result concrete.',
      model: 'test-model',
    })
    const mine = await app.request(`/interviews/${idA}`, { headers: WS })
    expect((await j(mine)).reflection.readinessLabel).toBe('solid')
    const theirs = await app.request(`/interviews/${idA}`, { headers: { 'X-Dev-Workspace': 'intruder' } })
    expect(theirs.status).toBe(404)
  })
})
