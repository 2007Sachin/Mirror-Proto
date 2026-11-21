// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { Target } from '../lib/api'

const target: Target = {
  id: 't1', company: 'Northwind', role: 'Data Analyst', interviewDate: null, jd: 'Own SQL, build dashboards in Tableau and align stakeholders.',
  status: 'ready',
  skills: [
    { name: 'SQL', area: 'sql', weight: 'core', quote: 'Own SQL' },
    { name: 'Tableau', area: 'tools', weight: 'core', quote: 'build dashboards in Tableau' },
    { name: 'Stakeholder alignment', area: 'behavioural', weight: 'core', quote: 'align stakeholders' },
  ],
  rounds: [
    { id: 'sql', kind: 'sql', title: 'SQL round', why: 'Expect a query to write.', available: true },
    { id: 'python', kind: 'python', title: 'Python round', why: 'Python is not named in the job description.', available: false },
    { id: 'tools', kind: 'tools', title: 'Tools round', why: 'Expect questions on Tableau.', available: false },
    { id: 'behavioural', kind: 'behavioural', title: 'Behavioural round', why: 'Expect stories about people and pushback.', available: true },
  ],
  events: [], debriefs: [], nextStep: 'Start with the behavioural round.', nextStepSource: 'fallback', createdAt: '2026-11-01T00:00:00Z',
}

vi.mock('../lib/api', () => ({ api: { getTarget: async () => target, deleteTarget: async () => undefined } }))
vi.mock('../lib/data', () => ({ stories: { list: async () => [] } }))
vi.mock('../features/match/MatchSection', () => ({ default: () => null }))
const none = { matches: [] as unknown[], claims: [], probes: [], source: 'fallback', aiAttempted: false, hasResume: false }
const match = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('../lib/matchApi', () => ({ getMatch: async () => match.current }))

import Targets from './Targets'

beforeEach(() => { localStorage.clear(); match.current = none })
afterEach(cleanup)

const open = async (onPractise = vi.fn(), onScreen = vi.fn()) => {
  render(<Targets openId="t1" onOpen={() => {}} onPractise={onPractise} onScreen={onScreen} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Prepare' }))
  return { onPractise, onScreen }
}
const card = (name: string) => screen.getByRole('heading', { name }).closest('article') as HTMLElement

describe('Targets: Prepare as round cards', () => {
  it('shows one card per round and one for the screening call', async () => {
    await open()
    for (const n of ['SQL round', 'Python round', 'Tools round', 'Behavioural round', 'Rehearse a screening call']) expect(screen.getByRole('heading', { name: n })).toBeTruthy()
  })

  it('starts a live interview for a round, by voice, from this job', async () => {
    const { onPractise } = await open()
    fireEvent.click(within(card('Behavioural round')).getByRole('button', { name: /Start interview/ }))
    expect(onPractise).toHaveBeenCalledTimes(1)
    const [role, opts] = onPractise.mock.calls[0]
    expect(role).toBe('Data Analyst · Behavioural round')
    expect(opts).toMatchObject({ speak: true, targetId: 't1' })
    expect(opts.question).toContain('Stakeholder alignment')
  })

  it('"Type instead" starts the same round without voice, from this job', async () => {
    const { onPractise } = await open()
    fireEvent.click(within(card('Behavioural round')).getByRole('button', { name: 'Type instead' }))
    expect(onPractise.mock.calls[0][1]).toMatchObject({ speak: false, targetId: 't1' })
    expect(onPractise.mock.calls[0][1].question).toContain('Stakeholder alignment')
  })

  it('a round without a live interview yet shows Later and no start buttons', async () => {
    await open()
    for (const name of ['Python round', 'Tools round']) {
      const c = card(name)
      expect(within(c).getByText('Later')).toBeTruthy()
      expect(within(c).queryByRole('button')).toBeNull()
    }
  })

  it('asks for a résumé when there is none, and suggests a round on the gaps when there is one', async () => {
    await open()
    expect(await screen.findByText(/Add your résumé under Understand/)).toBeTruthy()
    cleanup()
    match.current = { ...none, hasResume: true, matches: [
      { skill: 'SQL', area: 'sql', weight: 'core', status: 'covered', probeQuestion: null },
      { skill: 'Airflow', area: 'tools', weight: 'core', status: 'gap', probeQuestion: 'Tell me about a pipeline you scheduled.' },
    ] }
    const { onPractise } = await open()
    const gaps = (await screen.findByRole('heading', { name: 'What your résumé does not show' })).closest('article') as HTMLElement
    expect(within(gaps).getByText('Airflow')).toBeTruthy()
    expect(within(gaps).queryByText('SQL')).toBeNull()
    fireEvent.click(within(gaps).getByRole('button', { name: /Start interview/ }))
    expect(onPractise).toHaveBeenCalledWith('Data Analyst · Résumé gaps', { question: 'Tell me about a pipeline you scheduled.', speak: true, targetId: 't1' })
  })

  it('lets the candidate add a round the company told them about, and start it', async () => {
    const { onPractise } = await open()
    fireEvent.change(await screen.findByLabelText('Round name'), { target: { value: 'Case study' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a round' }))
    const c = card('Case study')
    fireEvent.click(within(c).getByRole('button', { name: 'Type instead' }))
    const [role, opts] = onPractise.mock.calls[0]
    expect(role).toBe('Data Analyst · Case study')
    expect(opts).toMatchObject({ speak: false, targetId: 't1' })
    expect(opts.question).toContain('Case study')
    fireEvent.click(within(c).getByRole('button', { name: 'Remove Case study' }))
    expect(screen.queryByRole('heading', { name: 'Case study' })).toBeNull()
  })

  it('the SQL round keeps its own start, and the screening call still starts the call', async () => {
    const { onPractise, onScreen } = await open()
    expect(within(card('SQL round')).getByRole('button', { name: /Start round/ })).toBeTruthy()
    fireEvent.click(within(card('Rehearse a screening call')).getByRole('button', { name: /Start the call/ }))
    expect(onScreen).toHaveBeenCalledWith('t1')
    expect(onPractise).not.toHaveBeenCalled()
  })
})
