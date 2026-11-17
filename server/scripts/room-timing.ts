/**
 * 50 timed Interviewer calls: p50, p95, failure rate, and the share that would fall back to the bank.
 * SPENDS MODEL QUOTA. Run only on the founder's go: `npm run room:timing`. Refuses to run without a key.
 */
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { env, isNimConfigured } from '../config.js'
import { createNimClient } from '../providers/nim.js'
import type { ReflectionProvider } from '../providers/types.js'
import type { InterviewerInput, RoomState, Candidate } from '../domain/director/types.js'

export interface Sample { ms: number; ok: boolean }
export interface Summary { calls: number; p50: number; p95: number; failureRate: number; fellBackRate: number }

/** Nearest-rank percentile of unsorted values; 0 for an empty list. */
export function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))]
}

/** Latency is read over answered calls only. A call that failed or came back after the deadline is one the Director would have answered from the bank. */
export function summarize(samples: Sample[], deadlineMs: number): Summary {
  const n = samples.length || 1
  const answered = samples.filter(s => s.ok).map(s => s.ms)
  return {
    calls: samples.length,
    p50: percentile(answered, 50),
    p95: percentile(answered, 95),
    failureRate: samples.filter(s => !s.ok).length / n,
    fellBackRate: samples.filter(s => !s.ok || s.ms > deadlineMs).length / n,
  }
}

export async function runTiming(
  provider: Pick<ReflectionProvider, 'generateNextQuestion'>,
  inputs: InterviewerInput[],
  calls: number,
  deadlineMs: number,
  now: () => number = Date.now,
): Promise<Summary> {
  if (!provider.generateNextQuestion) throw new Error('the provider has no generateNextQuestion')
  const samples: Sample[] = []
  for (let i = 0; i < calls; i++) {
    const start = now()
    let ok = true
    try { await provider.generateNextQuestion(inputs[i % inputs.length]) } catch { ok = false }
    samples.push({ ms: now() - start, ok })
  }
  return summarize(samples, deadlineMs)
}

const ANSWERS = [
  'I led the move of our onboarding emails to a new tool, and I chose to run it beside the old one first.',
  'Our checkout kept timing out under load, so I traced it to one query and rewrote it with the team.',
  'I was asked to cut the weekly report time. I automated the data pull and kept the review by hand.',
  'Two teams disagreed on the launch date, so I put the risks on one page and we agreed on the later date.',
]

/** Sample inputs rotate through a few canned answers; nothing here is a real user's text. */
export function sampleInputs(deadlineMs: number): InterviewerInput[] {
  const candidates: Candidate[] = [
    { id: 'b1', text: 'What got in the way, and how did you handle it?', source: 'bank', competency: 'resilience' },
    { id: 'b2', text: 'What would you do differently now?', source: 'bank', competency: 'learning' },
    { id: 'g1', text: 'Tell me about a time you worked with data to decide something.', source: 'gap', skill: 'SQL' },
  ]
  return ANSWERS.map((answer, i): InterviewerInput => {
    const state: RoomState = {
      interviewId: `timing-${i}`, role: 'Product Analyst', industry: null, targetId: null,
      turns: [{ question: 'Tell me about a project you are proud of.', answer }],
      asked: ['Tell me about a project you are proud of.'], history: [], gaps: [], storyThemes: [], covered: [],
      last: { words: answer.split(/\s+/).length, thin: false, strong: true }, nextIndex: 1, notes: [],
    }
    return { state, candidates, deadlineMs }
  })
}

async function main() {
  if (!isNimConfigured(env)) {
    console.error('room-timing: no model key is set (NVIDIA_NIM_API_KEY or NIM_API_KEY). Nothing was called.')
    process.exit(1)
  }
  const deadlineMs = Math.min(Number(process.env.INTERVIEWER_DEADLINE_MS) || 1500, 2000)
  const client = createNimClient(env, fetch, () => {}, undefined, undefined, 1, deadlineMs) as unknown as ReflectionProvider
  if (!client.generateNextQuestion) {
    console.error('room-timing: this build has no generateNextQuestion yet (the Interviewer call has not landed).')
    process.exit(1)
  }
  const s = await runTiming(client, sampleInputs(deadlineMs), 50, deadlineMs)
  console.log(`calls ${s.calls}\np50 ${s.p50} ms\np95 ${s.p95} ms\nfailure rate ${(s.failureRate * 100).toFixed(1)}%\nfell back ${(s.fellBackRate * 100).toFixed(1)}%`)
  console.log(`gate: p95 under 1500 ms (2000 at most) ${s.p95 < 1500 ? 'PASS' : s.p95 <= 2000 ? 'MARGINAL' : 'FAIL'}; failures under 5% ${s.failureRate < 0.05 ? 'PASS' : 'FAIL'}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void main()
