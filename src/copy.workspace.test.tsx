// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { scanHtml } from './copyScan'
import type { InterviewSession, Target } from './lib/api'

const session: InterviewSession = {
  id: 's1', workspace: 'w', role: 'Data Analyst', industry: null, status: 'completed',
  questions: [], currentQuestion: null, pendingFollowUp: false, nextQuestionIndex: null,
  createdAt: '2026-11-02T00:00:00Z', kind: 'practice',
  turns: [{
    id: 't1', questionIndex: 0, question: 'Tell me about a deadline you owned.',
    answer: 'When our team had a billing deadline, I had to cut scope. I led the cutover and we finished two days early.',
    transcriptSource: 'voice',
  }],
  reflection: {
    id: 'r1', interviewId: 's1', readinessLabel: null, readinessRange: null,
    evidence: [{ turnId: 't1', quote: 'I led the cutover', observation: 'You named what you did and how it ended.', competency: 'ownership' }],
    focus: 'Open with what changed.', suggestion: 'Say the deadline story again and land the result first.', model: 'm', source: 'ai',
  },
}
const older: InterviewSession = { ...session, id: 's0', createdAt: '2026-10-01T00:00:00Z', turns: [{ ...session.turns[0], id: 't0', answer: 'I helped with some stuff.' }], reflection: null }

const target: Target = {
  id: 't1', company: 'Northwind', role: 'Data Analyst', interviewDate: '2026-11-20', jd: 'Own SQL and stakeholder alignment.',
  status: 'ready',
  skills: [
    { name: 'Deadlines', area: 'behavioural', weight: 'core', quote: 'Deliver to a tight deadline' },
    { name: 'Conflict', area: 'behavioural', weight: 'core', quote: 'Handle disagreement with stakeholders' },
  ],
  rounds: [{ id: 'r', kind: 'behavioural', title: 'Stakeholder conversation', why: 'The posting asks how you handle disagreement.', available: true }],
  events: [{ at: '2026-11-01T00:00:00Z', agent: 'Scout', text: 'Read the posting.' }],
  debriefs: [{ id: 'd', kind: 'sql', createdAt: '2026-11-03T00:00:00Z', solved: 2, total: 4, wentWell: 'You named the join.', keepWorkingOn: 'Say what changed after the query.', suggestion: 'Try one more join, then describe the result.' }],
  nextStep: 'Rehearse the stakeholder conversation before the SQL round.', nextStepSource: 'fallback', createdAt: '2026-11-01T00:00:00Z',
}

vi.mock('./lib/api', () => ({
  api: {
    listInterviews: async () => [
      { id: 's1', role: 'Data Analyst', status: 'completed', createdAt: '2026-11-02T00:00:00Z', answered: 1, notes: { keepWorkingOn: 'Open with what changed.', quotes: [], source: 'ai' } },
      { id: 's0', role: 'Data Analyst', status: 'completed', createdAt: '2026-10-01T00:00:00Z', answered: 1, notes: null },
    ],
    getInterview: async (id: string) => (id === 's0' ? older : session),
    reflect: async () => session.reflection,
    listTargets: async () => [{ id: 't1', company: 'Northwind', role: 'Data Analyst', interviewDate: '2026-11-20', status: 'ready', nextStep: target.nextStep, createdAt: target.createdAt }],
    getTarget: async () => target,
    deleteTarget: async () => undefined,
  },
}))
vi.mock('./lib/data', () => ({
  stories: {
    list: async () => [{ id: 'st', workspaceId: 'w', createdAt: '2026-11-01', updatedAt: '', title: 'Billing cutover', themes: ['deadline-pressure'], situation: 'When we had a deadline.', task: 'I had to cut scope.', action: 'I led the cutover.', result: 'We finished early.', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null }],
    create: async () => { throw new Error('no') },
    update: async () => null,
    remove: async () => undefined,
  },
}))
vi.mock('./features/match/MatchSection', () => ({
  default: () => <section aria-labelledby="tg-match"><h2 id="tg-match">Your résumé vs this job</h2><p>SQL joins is on your résumé. Conflict is not.</p></section>,
}))

import Sessions from './pages/Sessions'
import Stories from './pages/Stories'
import Targets from './pages/Targets'
import Account from './pages/Account'

const hit = (where: string, html: string) => scanHtml(where, html)
afterEach(() => cleanup())

describe('copy on the redesigned pages, with realistic data', () => {
  it('Sessions review has no banned words', async () => {
    const view = render(<Sessions openId="s1" onPractise={() => {}} />)
    expect(await screen.findByText('What worked.')).toBeTruthy()
    expect(hit('sessions', view.container.innerHTML)).toEqual([])
    expect(view.container.textContent).not.toMatch(/\d+\s+of\s+\d+|%|streak|start speaking/i)
  })

  it('Stories bank has no counts and no banned words', async () => {
    const view = render(<Stories />)
    expect(await screen.findByRole('heading', { name: 'Billing cutover' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText(/A hint: Billing cutover shares a theme/)).toBeTruthy())
    expect(hit('stories', view.container.innerHTML)).toEqual([])
    expect(view.container.textContent).not.toMatch(/\b\d+\s+of\s+\d+\b|%|streak|start speaking/i)
  })

  it('Targets path has no solved-of-total line', async () => {
    const view = render(<Targets openId="t1" onOpen={() => {}} onPractise={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Afterwards' }))
    expect(await screen.findByText(/What worked/)).toBeTruthy()
    expect(view.container.textContent).not.toMatch(/solved|of 4|start speaking|streak/i)
    expect(hit('targets', view.container.innerHTML)).toEqual([])
  })

  it('Account does not invent a profile or a grade', () => {
    const view = render(<Account session={{ status: 'signedIn', providers: { google: false }, user: { id: 'u', email: 'sam@example.com' } }} role="Data Analyst" onSettings={() => {}} />)
    expect(view.container.textContent).toContain('sam@example.com')
    expect(hit('account', view.container.innerHTML)).toEqual([])
  })
})
