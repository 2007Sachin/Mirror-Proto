import { describe, expect, it } from 'vitest'
import { isEvaluationItem, validateEvaluation } from '../domain/evaluation.js'
import type { ReflectionProvider } from '../providers/types.js'
import { j, makeApp, WS } from './helpers.js'

const turns = [
  { id: 't1', answer: 'I rebuilt the weekly revenue report in SQL. Finance stopped asking for manual fixes.' },
  { id: 't2', answer: 'We shipped it together and it went fine.' },
]
const item = (over: Record<string, unknown> = {}) => ({ dimension: 'result', level: 'clear', turnId: 't1', quote: 'Finance stopped asking for manual fixes.', observation: 'You said what changed for finance.', fix: 'Try saying how long the fixes used to take.', ...over })

describe('validateEvaluation', () => {
  it('keeps items whose quote is exact, in dimension order, one per dimension', () => {
    const out = validateEvaluation(turns, { dimensions: [item(), item({ dimension: 'structure', level: 'strong', quote: 'I rebuilt the weekly revenue report in SQL.' }), item({ dimension: 'result', quote: 'I rebuilt the weekly revenue report in SQL.' })] } as never)
    expect(out.map(o => o.competency)).toEqual(['structure', 'result'])
    expect(out[1]).toMatchObject({ level: 'clear', fix: expect.stringMatching(/^Try/) })
  })
  it('drops an altered quote, an unknown answer and a quote with stray spaces', () => {
    const out = validateEvaluation(turns, { dimensions: [item({ quote: 'Finance stopped asking for fixes.' }), item({ dimension: 'ownership', turnId: 'nope' }), item({ dimension: 'specificity', quote: ' I rebuilt' })] } as never)
    expect(out).toEqual([])
  })
  it('drops a sentence that sneaks in a score, a percentage or a verdict', () => {
    const bad = ['You scored well here.', 'That is 80% there.', 'Rated 4 out of 5 on this one.', 'You are ready for the interview.', 'You would pass this round.']
    for (const observation of bad) expect(validateEvaluation(turns, { dimensions: [item({ observation })] } as never)).toEqual([])
    expect(validateEvaluation(turns, { dimensions: [item()] } as never)).toHaveLength(1)
  })
  it('marks evaluation items so quote lists can skip them', () => {
    const [e] = validateEvaluation(turns, { dimensions: [item()] } as never)
    expect(isEvaluationItem(e)).toBe(true)
    expect(isEvaluationItem({ turnId: 't1', quote: 'x', observation: '', competency: '' })).toBe(false)
  })
})

const answers = [
  'We moved invoice billing off a cron job onto an event-driven service.',
  'I owned the retry logic and ran the cutover over a weekend myself.',
  'Finance pushed back hard because a bad cutover meant wrong invoices.',
  'It went live, but a retry bug double-charged forty customers at first.',
]
const post = (app: ReturnType<typeof makeApp>['app'], path: string, body?: unknown) =>
  app.request(path, { method: 'POST', headers: { ...WS, 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) })

function provider(): ReflectionProvider {
  return {
    async generateReflection({ turns: t }) {
      return { whatStoodOut: [{ turnId: t[1].id, quote: 'I owned the retry logic' }], keepWorkingOn: 'Saying what you personally decided.', suggestion: 'Next time, open with the decision you made.' }
    },
    async generateEvaluation({ turns: t }) {
      return { dimensions: [
        { dimension: 'ownership', level: 'strong', turnId: t[1].id, quote: 'I owned the retry logic', observation: 'You said what you owned.', fix: 'Try naming the decision you made first.' },
        { dimension: 'result', level: 'starting', turnId: t[3].id, quote: 'a retry bug double-charged forty customers', observation: 'You named a problem but not how it ended.', fix: 'Try finishing with what changed after the fix.' },
        { dimension: 'structure', level: 'clear', turnId: t[0].id, quote: 'made up words that are not in the answer', observation: 'This quote is invented.', fix: 'Try anything at all here.' },
      ] }
    },
  }
}

describe('the evaluation in the notes', () => {
  it('is saved with the notes, only with exact quotes, and not mixed into the quote list', async () => {
    const { app } = makeApp({ provider: provider() })
    const { id } = await j<{ id: string }>(await post(app, '/interviews', { role: 'Backend Engineer' }))
    for (let i = 0; i < 4; i++) await post(app, `/interviews/${id}/turns`, { questionIndex: i, answer: answers[i] })
    const notes = await j<{ evidence: { competency: string; level?: string; fix?: string; quote: string }[] }>(await post(app, `/interviews/${id}/reflect`))
    const evaluation = notes.evidence.filter(e => e.level)
    expect(evaluation.map(e => [e.competency, e.level])).toEqual([['ownership', 'strong'], ['result', 'starting']])
    expect(evaluation.every(e => /^Try/.test(e.fix ?? ''))).toBe(true)
    expect(notes.evidence.filter(e => !e.level).map(e => e.quote)).toEqual(['I owned the retry logic'])
  })
  it('can be added later to notes that already exist, and needs notes first', async () => {
    const plain: ReflectionProvider = { async generateReflection({ turns: t }) { return { whatStoodOut: [{ turnId: t[1].id, quote: 'I owned the retry logic' }], keepWorkingOn: 'Saying what you personally decided.', suggestion: 'Next time, open with the decision you made.' } } }
    const first = makeApp({ provider: plain })
    const { id } = await j<{ id: string }>(await post(first.app, '/interviews', { role: 'Backend Engineer' }))
    for (let i = 0; i < 4; i++) await post(first.app, `/interviews/${id}/turns`, { questionIndex: i, answer: answers[i] })
    expect((await post(first.app, `/interviews/${id}/evaluate`)).status).toBe(409) // no notes yet
    await post(first.app, `/interviews/${id}/reflect`)
    expect((await post(first.app, `/interviews/${id}/evaluate`)).status).toBe(503) // this provider cannot evaluate
    const richer = makeApp({ repo: first.repo, provider: provider() })
    const res = await post(richer.app, `/interviews/${id}/evaluate`)
    expect(res.status).toBe(200)
    const body = await j<{ evidence: { level?: string }[] }>(res)
    expect(body.evidence.filter(e => e.level)).toHaveLength(2)
    expect(body.evidence.filter(e => !e.level)).toHaveLength(1)
  })
})
