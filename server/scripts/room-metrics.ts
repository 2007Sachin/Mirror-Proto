/**
 * Founder-only report on how the Room is doing. Read-only; never shown to learners.
 *   npm run room:metrics -- [--user <id>] [--log <file>]
 * Saved turns come from the repository (set METRICS_ACCESS_TOKEN for Supabase, else the empty in-process memory repo).
 * The log file holds `room_turn`, `nudge_shadow` and `room_feedback` JSON lines (any prefix before the first "{" is ignored).
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { env } from '../config.js'
import { createRepoFactory } from '../repo/factory.js'

export interface MetricTurn { question: string; answer: string }
export interface MetricInterview { createdAt: string; completed: boolean; turns: MetricTurn[] }

const STOP = new Set('about after again also because been before being could did does doing from have into just like more most much only other over really said some than that their them then there these they this very want were what when where which while will with would your'.split(' '))
const terms = (text: string): Set<string> =>
  new Set((text.toLowerCase().match(/[a-z][a-z0-9']{3,}/g) ?? []).filter(w => !STOP.has(w)).map(w => w.replace(/s$/, '')))

/** Share of questions after the first that reuse a content term from the previous answer. Null when there is no second question. */
export function followUpRate(turns: MetricTurn[]): { reused: number; eligible: number; rate: number | null } {
  let reused = 0
  let eligible = 0
  for (let i = 1; i < turns.length; i++) {
    eligible++
    const q = terms(turns[i].question)
    if ([...terms(turns[i - 1].answer)].some(t => q.has(t))) reused++
  }
  return { reused, eligible, rate: eligible ? reused / eligible : null }
}

const norm = (q: string) => q.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

/** Share of questions already asked in an earlier interview (oldest first) or earlier in the same one. */
export function repeatRate(interviews: MetricInterview[]): { repeats: number; total: number; rate: number | null } {
  const seen = new Set<string>()
  let repeats = 0
  let total = 0
  for (const iv of [...interviews].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const mine = new Set<string>()
    for (const t of iv.turns) {
      const k = norm(t.question)
      total++
      if (seen.has(k) || mine.has(k)) repeats++
      mine.add(k)
    }
    mine.forEach(k => seen.add(k))
  }
  return { repeats, total, rate: total ? repeats / total : null }
}

export interface LogStats {
  turns: number; model: number; bank: number
  callsByInterview: Record<string, number>
  nudges: number; talkedOver: number
  tapYes: number; tapNo: number
}

/** ponytail: `nudge_shadow` is read as {event, interviewId, spokeAfterMs?}; talked over = the candidate spoke within 3000 ms. Match this to the gateway's real line when it lands. */
export function parseLog(text: string): LogStats {
  const s: LogStats = { turns: 0, model: 0, bank: 0, callsByInterview: {}, nudges: 0, talkedOver: 0, tapYes: 0, tapNo: 0 }
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf('{')
    if (i < 0) continue
    let o: Record<string, unknown>
    try { o = JSON.parse(line.slice(i)) as Record<string, unknown> } catch { continue }
    if (o.event === 'room_turn') {
      s.turns++
      if (o.source === 'model') s.model++
      else s.bank++
      const id = String(o.interviewId ?? '')
      s.callsByInterview[id] = (s.callsByInterview[id] ?? 0) + (Number(o.calls) || 0)
    } else if (o.event === 'nudge_shadow') {
      s.nudges++
      if (typeof o.spokeAfterMs === 'number' && o.spokeAfterMs <= 3000) s.talkedOver++
    } else if (o.event === 'room_feedback') {
      if (o.followed === true) s.tapYes++
      else if (o.followed === false) s.tapNo++
    }
  }
  return s
}

const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : 'n/a')

export function formatReport(interviews: MetricInterview[], log: LogStats | null): string {
  const done = interviews.filter(i => i.completed)
  const fu = done.map(i => followUpRate(i.turns))
  const reused = fu.reduce((a, r) => a + r.reused, 0)
  const eligible = fu.reduce((a, r) => a + r.eligible, 0)
  const rep = repeatRate(interviews)
  const rows: [string, string][] = [
    ['completed interviews read', String(done.length)],
    ['follow-up rate (questions reusing a term from the last answer)', `${pct(reused, eligible)}  (${reused} of ${eligible})`],
    ['repeat rate across interviews', `${pct(rep.repeats, rep.total)}  (${rep.repeats} of ${rep.total})`],
  ]
  if (log) {
    const ids = Object.keys(log.callsByInterview)
    const calls = ids.reduce((a, id) => a + log.callsByInterview[id], 0)
    rows.push(
      ['bank vs model (logged turns)', `bank ${pct(log.bank, log.turns)}, model ${pct(log.model, log.turns)}  (${log.turns} turns)`],
      ['model calls per interview in the log (ceiling 12)', ids.length ? `${(calls / ids.length).toFixed(1)}  (max ${Math.max(...ids.map(id => log.callsByInterview[id]))})` : 'n/a'],
      ['shadow nudges followed by speech within 3 s', `${log.talkedOver} of ${log.nudges}  (talked-over proxy)`],
      ['after-call tap', `yes ${log.tapYes}, not really ${log.tapNo}`],
    )
  } else rows.push(['log-based rows', 'pass --log <file> to include them'])
  const w = Math.max(...rows.map(r => r[0].length))
  return rows.map(([k, v]) => `${k.padEnd(w)}  ${v}`).join('\n')
}

async function main() {
  const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined }
  const user = arg('--user') ?? 'dev'
  const repo = createRepoFactory(env)({ id: user, email: null, accessToken: process.env.METRICS_ACCESS_TOKEN ?? '' })
  const rows = await repo.listInterviews(user, { limit: 200 })
  const interviews: MetricInterview[] = []
  for (const r of rows) {
    const turns = await repo.getTurns(user, r.id)
    interviews.push({ createdAt: r.createdAt, completed: r.status === 'completed', turns: turns.map(t => ({ question: t.question, answer: t.answer })) })
  }
  const file = arg('--log')
  console.log(formatReport(interviews, file ? parseLog(readFileSync(file, 'utf8')) : null))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void main()
