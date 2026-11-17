import { describe, expect, it } from 'vitest'
import { followUpRate, formatReport, parseLog, repeatRate } from '../scripts/room-metrics.js'
import { percentile, runTiming, sampleInputs, summarize } from '../scripts/room-timing.js'

describe('followUpRate', () => {
  it('counts questions after the first that reuse a term from the previous answer', () => {
    const r = followUpRate([
      { question: 'Tell me about a project.', answer: 'I migrated the billing database to a new warehouse.' },
      { question: 'What was hardest about the billing migration?', answer: 'The cutover window.' },
      { question: 'What would you change now?', answer: 'More rehearsals.' },
    ])
    expect(r).toEqual({ reused: 1, eligible: 2, rate: 0.5 })
  })
  it('is null with one question', () => expect(followUpRate([{ question: 'Hi?', answer: 'x' }]).rate).toBeNull())
})

describe('repeatRate', () => {
  it('counts a question seen in an earlier interview', () => {
    const iv = (createdAt: string, qs: string[]) => ({ createdAt, completed: true, turns: qs.map(question => ({ question, answer: '' })) })
    expect(repeatRate([iv('2', ['A one?', 'New?']), iv('1', ['a one!', 'B?'])])).toEqual({ repeats: 1, total: 4, rate: 0.25 })
  })
})

describe('parseLog and report', () => {
  const log = [
    '12:00 {"event":"room_turn","interviewId":"i1","source":"model","calls":1}',
    '{"event":"room_turn","interviewId":"i1","source":"bank","calls":2}',
    '{"event":"nudge_shadow","turnId":"t1","reason":"silence_first","silenceMs":10000}',
    '{"event":"nudge_continue","turnId":"t1","afterMs":1200}',
    '{"event":"nudge_fired","turnId":"t2","reason":"silence_first","silenceMs":10000}',
    '{"event":"room_feedback","followed":true}',
    'not json {',
  ].join('\n')
  it('reads the lines', () => {
    const s = parseLog(log)
    expect(s).toMatchObject({ turns: 2, model: 1, bank: 1, nudges: 2, talkedOver: 1, tapYes: 1, callsByInterview: { i1: 3 } })
    expect(formatReport([], s)).toContain('3.0')
  })
})

describe('timing summary', () => {
  it('percentile is nearest-rank', () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3)
    expect(percentile(Array.from({ length: 100 }, (_, i) => i + 1), 95)).toBe(95)
    expect(percentile([], 95)).toBe(0)
  })
  it('summarises failures and fallbacks', () => {
    const s = summarize([{ ms: 100, ok: true }, { ms: 2000, ok: true }, { ms: 50, ok: false }, { ms: 300, ok: true }], 1500)
    expect(s).toMatchObject({ calls: 4, p50: 300, p95: 2000, failureRate: 0.25, fellBackRate: 0.5 })
  })
  it('runs N calls against a mock provider', async () => {
    let n = 0
    const t = [0, 10, 10, 30]
    let k = 0
    const s = await runTiming(
      { generateNextQuestion: async () => { n++; if (n === 2) throw new Error('x'); return { action: 'probe', targetSkill: null, question: 'q' } } },
      sampleInputs(1500), 2, 1500, () => t[k++],
    )
    expect(n).toBe(2)
    expect(s).toMatchObject({ calls: 2, failureRate: 0.5, p50: 10 })
  })
})
