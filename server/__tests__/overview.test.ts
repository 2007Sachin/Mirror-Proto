import { describe, expect, it } from 'vitest'
import { OPENING_QUESTION } from '../domain/questions.js'
import type { OnboardingRequest } from '../providers/types.js'
import { j, makeApp, WS } from './helpers.js'

const JSON_HEADERS = { ...WS, 'Content-Type': 'application/json' }
type App = ReturnType<typeof makeApp>['app']
const post = (app: App, path: string, body: unknown) =>
  app.request(path, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })

const profile = {
  role: 'Backend Engineer',
  story: 'We moved invoice billing onto an event-driven service and I ran the weekend cutover.',
  pressureQuestion: 'What actually broke?',
  pressureAnswer: 'A retry loop double-charged forty customers before we caught it.',
  summary: 'You led a billing migration.',
  focus: 'stakeholder trust',
  firstQuestion: 'How did you win back finance after the double charge?',
  resumeText: null,
  resumeName: null,
  mode: 'text' as const,
}
const answers = [
  'We moved invoice billing off a cron job onto an event-driven service.',
  'I owned the retry logic and ran the cutover over a weekend myself.',
  'Finance pushed back hard because a bad cutover meant wrong invoices.',
  'It went live, but a retry bug double-charged forty customers at first.',
]

async function completeInterview(app: App) {
  const { id } = await j<{ id: string }>(await post(app, '/interviews', { role: profile.role }))
  for (let i = 0; i < 4; i++) expect((await post(app, `/interviews/${id}/turns`, { questionIndex: i, answer: answers[i] })).status).toBe(201)
  return id
}

describe('GET /interviews (recent practice)', () => {
  it('lists newest first with how many questions were answered', async () => {
    const { app } = makeApp()
    const done = await completeInterview(app)
    const { id: open } = await j<{ id: string }>(await post(app, '/interviews', { role: 'Stakeholder trust' }))
    const list = await j<{ id: string; status: string; answered: number; role: string }[]>(
      await app.request('/interviews', { headers: WS }),
    )
    expect(list.map(i => i.id)).toEqual([open, done])
    expect(list[0]).toMatchObject({ status: 'in_progress', answered: 0, role: 'Stakeholder trust' })
    expect(list[1]).toMatchObject({ status: 'completed', answered: 4 })
  })
})

describe('POST /interviews with an opening question', () => {
  it('opens a practice on the question it was given', async () => {
    const { app } = makeApp()
    const created = await j<{ currentQuestion: string }>(
      await post(app, '/interviews', { role: profile.role, openingQuestion: 'Start from the finance side: what did they need from you?' }),
    )
    expect(created.currentQuestion).toContain('Start from the finance side: what did they need from you?')
  })
})

describe('GET /coach-note', () => {
  it('is 404 before The First Interview', async () => {
    const { app } = makeApp()
    expect((await app.request('/coach-note', { headers: WS })).status).toBe(404)
  })

  it('falls back to an honest note without a model', async () => {
    const { app } = makeApp()
    await app.request('/profile', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(profile) })
    const note = await j<{ observation: string; nextPractice: string; practiceQuestion: string; basedOn: string }>(
      await app.request('/coach-note', { headers: WS }),
    )
    expect(note.observation).toContain('stakeholder trust')
    expect(note.practiceQuestion).toBe(OPENING_QUESTION)
    expect(note.basedOn).toBe('first-interview')
  })

  it('reads the latest completed session and says when one is in progress', async () => {
    let seen: OnboardingRequest | null = null
    const { app } = makeApp({
      provider: {
        async generateReflection() { throw new Error('unused') },
        async generateOnboarding(req) {
          seen = req
          return {
            observation: 'The migration was the main event. Finance only came up when asked.',
            nextPractice: 'Retell the cutover from finance’s side in ten minutes.',
            practiceQuestion: 'What did finance need to hear from you before the cutover?',
          }
        },
      },
    })
    await app.request('/profile', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(profile) })
    await completeInterview(app)
    await post(app, '/interviews', { role: profile.role }) // left open

    const note = await j<{ practiceQuestion: string; basedOn: string }>(await app.request('/coach-note', { headers: WS }))
    expect(note.basedOn).toBe('interview')
    expect(note.practiceQuestion).toBe('What did finance need to hear from you before the cutover?')
    const req = seen as unknown as Extract<OnboardingRequest, { step: 'coach' }>
    expect(req.step).toBe('coach')
    expect(req.inProgress).toBe(true)
    expect(req.transcript.map(t => t.answer)).toEqual(answers)
  })
})
