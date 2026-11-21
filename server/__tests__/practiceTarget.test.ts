import { testAuth } from '../auth/testAuth.js'
import { describe, expect, it } from 'vitest'
import { buildApp } from '../app.js'
import { createMemoryRepository } from '../repo/memory.js'
import { buildRoomState } from '../domain/director/state.js'
import { j, makeEnv } from './helpers.js'

const JD = 'We need someone who can build dashboards in Tableau. You will write SQL against our warehouse every day.'

async function setup() {
  const repo = createMemoryRepository()
  const app = buildApp({ env: makeEnv(), auth: testAuth(), repoFor: () => repo, now: () => 0 })
  const t = await repo.createTarget('dev', { company: 'Acme', role: 'Data Analyst', interviewDate: null, jd: JD })
  await repo.updateTarget('dev', t.id, { status: 'ready' })
  await repo.replaceGapMatches('dev', t.id, [
    { skill: 'SQL', area: 'sql', weight: 'core', status: 'covered', claimQuote: 'wrote SQL daily', note: '', probeQuestion: null, source: 'fallback' },
    { skill: 'Tableau', area: 'tools', weight: 'nice', status: 'gap', claimQuote: null, note: '', probeQuestion: 'Tell me about a dashboard you built.', source: 'fallback' },
    { skill: 'Airflow', area: 'tools', weight: 'core', status: 'gap', claimQuote: null, note: '', probeQuestion: 'Tell me about a pipeline you scheduled.', source: 'fallback' },
  ])
  const H = { 'X-Test-User': 'dev', 'Content-Type': 'application/json' }
  const post = (body: unknown, user = 'dev') => app.request('/interviews', { method: 'POST', headers: { ...H, 'X-Test-User': user }, body: JSON.stringify(body) })
  return { repo, t, post }
}

describe('a practice round started from a Target', () => {
  it('keeps the job id and stays a practice interview', async () => {
    const { post, t } = await setup()
    const res = await post({ role: 'Data Analyst · Behavioural', openingQuestion: 'Tell me about a time you disagreed with a stakeholder.', targetId: t.id })
    expect(res.status).toBe(201)
    const body = await j(res)
    expect(body.targetId).toBe(t.id)
    expect(body.kind).not.toBe('screen')
  })

  it('refuses a job that is not yours or does not exist', async () => {
    const { post, t } = await setup()
    expect((await post({ role: 'Data Analyst', targetId: t.id }, 'someone-else')).status).toBe(404)
    expect((await post({ role: 'Data Analyst', targetId: '00000000-0000-4000-8000-000000000000' })).status).toBe(404)
  })

  it('still works without a job, as before', async () => {
    const { post } = await setup()
    const body = await j(await post({ role: 'Data Analyst', openingQuestion: 'Tell me about a project you are proud of.' }))
    expect(body.targetId).toBeNull()
  })

  it('lets the Director see the job’s open gaps, core first', async () => {
    const { repo, post, t } = await setup()
    const body = await j(await post({ role: 'Data Analyst · Tools', openingQuestion: 'Walk me through a dashboard you built end to end.', targetId: t.id }))
    const row = await repo.getInterview('dev', body.id)
    const state = await buildRoomState(repo, 'dev', row!, [])
    expect(state.targetId).toBe(t.id)
    expect(state.gaps.map(g => g.skill)).toEqual(['Airflow', 'Tableau'])
  })

  it('keeps follow-ups on the round named in the role, and shows every gap for a plain role', async () => {
    const { repo, post, t } = await setup()
    const stateFor = async (role: string) => {
      const body = await j(await post({ role, openingQuestion: 'Tell me about a project you are proud of.', targetId: t.id }))
      return buildRoomState(repo, 'dev', (await repo.getInterview('dev', body.id))!, [])
    }
    expect((await stateFor('Data Analyst · Behavioural round')).gaps).toEqual([])
    expect((await stateFor('Data Analyst · Tools round')).gaps.map(g => g.skill)).toEqual(['Airflow', 'Tableau'])
    expect((await stateFor('Data Analyst')).gaps.map(g => g.skill)).toEqual(['Airflow', 'Tableau'])
  })

  it('with no résumé match yet, falls back to the job’s own skills for that round', async () => {
    const { repo, post } = await setup()
    const t2 = await repo.createTarget('dev', { company: 'Beta', role: 'Analyst', interviewDate: null, jd: JD })
    await repo.updateTarget('dev', t2.id, { status: 'ready', skills: [
      { name: 'Tableau', area: 'tools', weight: 'core', quote: 'Tableau' },
      { name: 'pandas', area: 'python', weight: 'nice', quote: 'pandas' },
    ] })
    const body = await j(await post({ role: 'Analyst · Tools round', openingQuestion: 'Walk me through a time you used Tableau.', targetId: t2.id }))
    const state = await buildRoomState(repo, 'dev', (await repo.getInterview('dev', body.id))!, [])
    expect(state.gaps.map(g => g.skill)).toEqual(['Tableau'])
  })
})
