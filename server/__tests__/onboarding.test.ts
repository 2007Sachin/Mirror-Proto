import { describe, expect, it } from 'vitest'
import { OPENING_QUESTION } from '../domain/questions.js'
import { ProviderFailure } from '../providers/nim.js'
import { createMockStt } from '../voice/stt/mockStt.js'
import { j, makeApp, WS } from './helpers.js'

const JSON_HEADERS = { ...WS, 'Content-Type': 'application/json' }
const story = 'We migrated billing to a new provider. Two teams pushed back because it risked invoices.'
const post = (app: ReturnType<typeof makeApp>['app'], path: string, body: unknown) =>
  app.request(path, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })

const profile = {
  role: 'Billing engineer',
  story,
  pressureQuestion: 'What actually broke?',
  pressureAnswer: 'A retry loop double-charged forty customers before we caught it.',
  summary: 'You led a billing migration and handled pushback.',
  focus: 'explaining decisions under pushback',
  firstQuestion: 'Walk me through the retry loop that double-charged customers.',
  resumeText: null,
  mode: 'voice' as const,
}

describe('The First Interview: steps without a provider', () => {
  it('quotes the candidate’s own words in the pressure question', async () => {
    const { app } = makeApp()
    const res = await post(app, '/onboarding/step', { step: 'pressure', story })
    expect(res.status).toBe(200)
    const body = await j<{ question: string }>(res)
    expect(body.question).toContain('We migrated billing to a new provider.')
  })

  it('summarises from both answers and falls back to the standard opener', async () => {
    const { app } = makeApp()
    const res = await post(app, '/onboarding/step', { step: 'contract', story, question: 'What broke?', answer: 'A retry loop broke.' })
    const body = await j<{ summary: string; firstQuestion: string; gap: string }>(res)
    expect(body.summary).toContain('We migrated billing to a new provider.')
    expect(body.summary).toContain('A retry loop broke.')
    expect(body.firstQuestion).toBe(OPENING_QUESTION)
    expect(body.gap.length).toBeGreaterThan(0)
  })

  it('rejects a step with missing input', async () => {
    const { app } = makeApp()
    const res = await post(app, '/onboarding/step', { step: 'pressure', story: '   ' })
    expect(res.status).toBe(400)
  })
})

describe('The First Interview: provider', () => {
  it('uses the provider output when it works', async () => {
    const { app } = makeApp({
      provider: {
        async generateReflection() { throw new Error('unused') },
        async generateOnboarding() { return { question: 'What did Priya’s team say when invoices slipped?' } },
      },
    })
    const body = await j<{ question: string }>(await post(app, '/onboarding/step', { step: 'pressure', story }))
    expect(body.question).toBe('What did Priya’s team say when invoices slipped?')
  })

  it('never dead-ends: a provider failure falls back', async () => {
    const { app } = makeApp({
      provider: {
        async generateReflection() { throw new Error('unused') },
        async generateOnboarding() { throw new ProviderFailure('down') },
      },
    })
    const res = await post(app, '/onboarding/step', { step: 'pressure', story })
    expect(res.status).toBe(200)
    expect((await j<{ question: string }>(res)).question).toContain('We migrated billing')
  })
})

describe('resume upload', () => {
  it('rejects a file that is not a PDF', async () => {
    const { app } = makeApp()
    const form = new FormData()
    form.append('file', new File(['not a pdf'], 'resume.pdf', { type: 'application/pdf' }))
    const res = await app.request('/onboarding/resume', { method: 'POST', headers: WS, body: form })
    expect(res.status).toBe(422)
  })

  it('requires a file', async () => {
    const { app } = makeApp()
    const res = await app.request('/onboarding/resume', { method: 'POST', headers: WS, body: new FormData() })
    expect(res.status).toBe(400)
  })
})

describe('dictation', () => {
  it('turns recorded audio into text when speech-to-text is supplied', async () => {
    const { app } = makeApp({ stt: createMockStt({ finalText: 'I led the redesign.', emitPartials: false }) })
    const res = await app.request('/onboarding/transcribe', { method: 'POST', headers: WS, body: new Uint8Array(640) })
    expect(res.status).toBe(200)
    expect((await j<{ text: string }>(res)).text).toBe('I led the redesign.')
  })

  it('says voice is unavailable instead of inventing text when no provider is set', async () => {
    const { app } = makeApp()
    const res = await app.request('/onboarding/transcribe', { method: 'POST', headers: WS, body: new Uint8Array(640) })
    expect(res.status).toBe(503)
    expect((await j<{ error: string }>(res)).error).toBe('voice_unavailable')
  })

  it('rejects empty audio', async () => {
    const { app } = makeApp()
    const res = await app.request('/onboarding/transcribe', { method: 'POST', headers: WS, body: new Uint8Array(0) })
    expect(res.status).toBe(400)
  })
})

describe('profile', () => {
  it('is 404 before the First Interview and saved after', async () => {
    const { app } = makeApp()
    expect((await app.request('/profile', { headers: WS })).status).toBe(404)
    const put = await app.request('/profile', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(profile) })
    expect(put.status).toBe(200)
    const got = await j<typeof profile>(await app.request('/profile', { headers: WS }))
    expect(got.focus).toBe(profile.focus)
    expect(got.mode).toBe('voice')
  })

  it('queues a personalised first interview, and follow-ups know the profile', async () => {
    let seen: { profile?: unknown } = {}
    const { app } = makeApp({
      provider: {
        async generateReflection() { throw new Error('unused') },
        async generateFollowUp(req) { seen = req; return 'What did you say to the team that pushed back?' },
      },
    })
    await app.request('/profile', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(profile) })

    const created = await j<{ currentQuestion: string; id: string }>(await post(app, '/interviews', { role: profile.role }))
    expect(created.currentQuestion).toBe(profile.firstQuestion)

    const turn = await post(app, `/interviews/${created.id}/turns`, {
      questionIndex: 0,
      answer: 'The retry loop double-charged forty customers before we noticed it.',
    })
    expect(turn.status).toBe(201)
    expect(seen.profile).toEqual({
      focus: profile.focus,
      primaryStory: profile.story,
      pressureAnswer: profile.pressureAnswer,
      resumeSummary: '',
    })
  })

  it('writes question 1 from the story and focus once the queued opener is used', async () => {
    const asked: { nextIndex: number; profile?: unknown }[] = []
    const { app } = makeApp({
      provider: {
        async generateReflection() { throw new Error('unused') },
        async generateFollowUp(req) {
          asked.push(req)
          return req.nextIndex === 0 ? 'You said two teams pushed back on the billing move. What did you tell them?' : 'And then?'
        },
      },
    })
    await app.request('/profile', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ ...profile, resumeText: 'R'.repeat(4000) }) })
    await post(app, '/interviews', { role: profile.role }) // uses the queued opener
    const second = await j<{ currentQuestion: string }>(await post(app, '/interviews', { role: profile.role }))
    expect(second.currentQuestion).toBe('You said two teams pushed back on the billing move. What did you tell them?')
    const first = asked.find(r => r.nextIndex === 0) as { profile: { primaryStory: string; resumeSummary: string } }
    expect(first.profile.primaryStory).toBe(profile.story)
    expect(first.profile.resumeSummary.length).toBe(1500) // resume is trimmed context, server-side only
  })

  it('falls back to the catalog opener when the model is down, without blocking the start', async () => {
    const { app } = makeApp({
      provider: {
        async generateReflection() { throw new Error('unused') },
        async generateFollowUp() { throw new ProviderFailure('down') },
      },
    })
    await app.request('/profile', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(profile) })
    await post(app, '/interviews', { role: profile.role }) // queued opener
    const res = await post(app, '/interviews', { role: profile.role })
    expect(res.status).toBe(201)
    expect((await j<{ currentQuestion: string }>(res)).currentQuestion).toBe(OPENING_QUESTION)
  })

  it('gives the reflection the agreed focus and story', async () => {
    let context: unknown
    const { app } = makeApp({
      provider: {
        async generateReflection(req) {
          context = req.context
          return { whatStoodOut: [], keepWorkingOn: 'Lead with the decision.', suggestion: 'Say the decision first.' }
        },
      },
    })
    await app.request('/profile', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(profile) })
    const { id } = await j<{ id: string }>(await post(app, '/interviews', { role: profile.role }))
    for (let i = 0; i < 4; i++) await post(app, `/interviews/${id}/turns`, { questionIndex: i, answer: `A real answer about the billing work, number ${i + 1}.` })
    expect((await post(app, `/interviews/${id}/reflect`, {})).status).toBe(201)
    expect(context).toEqual({ focus: profile.focus, primaryStory: profile.story })
  })

  it('queues the personalised opener once, and only for the role it was built for', async () => {
    const { app } = makeApp()
    await app.request('/profile', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(profile) })
    const other = await j<{ currentQuestion: string }>(await post(app, '/interviews', { role: 'Business Analyst' }))
    expect(other.currentQuestion).toBe(OPENING_QUESTION)
    const first = await j<{ currentQuestion: string }>(await post(app, '/interviews', { role: profile.role }))
    expect(first.currentQuestion).toBe(profile.firstQuestion)
    const again = await j<{ currentQuestion: string }>(await post(app, '/interviews', { role: profile.role }))
    expect(again.currentQuestion).toBe(OPENING_QUESTION)
  })

  it('DELETE clears the profile', async () => {
    const { app } = makeApp()
    await app.request('/profile', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(profile) })
    expect((await app.request('/profile', { method: 'DELETE', headers: WS })).status).toBe(204)
    expect((await app.request('/profile', { headers: WS })).status).toBe(404)
  })

  it('rejects an oversized request before reading it', async () => {
    const { app } = makeApp()
    const res = await post(app, '/onboarding/step', { step: 'pressure', story: 'x'.repeat(100_000) })
    expect(res.status).toBe(413)
  })

  it('keeps the standard opener when there is no profile', async () => {
    const { app } = makeApp()
    const created = await j<{ currentQuestion: string }>(await post(app, '/interviews', { role: 'Analyst' }))
    expect(created.currentQuestion).toBe(OPENING_QUESTION)
  })
})
