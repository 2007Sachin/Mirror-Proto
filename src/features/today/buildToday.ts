// buildToday(): the ONE owner of "what next" on Today. Pure: no React, no fetch, no window. Any input field may be null; it never throws.
//
// Hero priority (the first branch that applies wins; the next two that apply become `alternates`):
//  1. Interview in progress. kicker "where you left off", H2 "Data Analyst, question 2", primary "Pick it up", secondary "Let it go".
//  2. Nearest target's interview is TODAY: a calm five-minute warm-up on its probe question, e.g. "Tell me about a time you ..."
//     (action startQuestion). No replays on interview day, matching dueReps().
//  3. Nearest target's interview is 1 to 3 days away and it has skills: "Practise a Northwind screening call", about 8 minutes (action screening).
//  4. Coach note with a practiceQuestion: H2 is exactly practiceQuestion, spoken; the why line is a cleaned `observation`
//     (no quotes over six words, at most two sentences; profile.focus is never shown).
//  5. Replays due today: "3 replays due", about 9 minutes (action openReplays at the first due item).
//  6. recommend() from src/practice/stats.ts (weak spot, old review, untouched topic): "Top customer in each country", SQL exercise.
//  7. No profile: "Your first interview", routes to the First Interview.
// A new user (no completed interview, practice, target or story) skips 5 and 6 and gets profile.firstQuestion after the coach question.
import { themeName } from '../../stories/themes'
import { scan } from '../../copyScan'
import { dueReps, upcomingReps } from '../../practice/replay'
import { recommend, type TrackLike } from '../../practice/stats'
import type { ItemStat } from '../../practice/types'
import { coverageByStatus, greeting, sinceLastWeek, statusLine, storyGaps } from './insights'
import type { ComingUp, Hero, Replays, Setup, SetupRow, StoriesCard, TodayInput, TodayLink, TodayModel, TodayTarget } from './types'

const DAY = 86_400_000
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const daysTo = (now: Date, date: string | null): number | null => {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return null
  const n = Math.round((new Date(y, m - 1, d).getTime() - midnight(now)) / DAY)
  return n >= 0 ? n : null
}
const countdown = (n: number | null) => (n === null ? null : n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`)
const weekday = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'long' })
const TRACK_LABEL: Record<string, string> = { sql: 'SQL', python: 'Python', stats: 'Statistics', case: 'Case' }

/** At most two sentences, none holding a quote of more than six words; empty when nothing safe is left. */
function cleanWhy(text: string | null | undefined): string {
  const longQuote = /[“"]([^”"]*)[”"]/g
  const ok = (s: string) => [...s.matchAll(longQuote)].every(m => m[1].trim().split(/\s+/).length <= 6)
  const out = (text ?? '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s && ok(s)).slice(0, 2).join(' ')
  return out && scan('today', out).length === 0 ? out : ''
}

const link = (label: string, action: TodayLink['action']): TodayLink => ({ label, action })
const spoken = (question: string, why: string, minutes = 5): Hero => ({
  kind: 'spoken', kindLabel: 'spoken question', minutes, title: question, why,
  primary: link('Answer aloud', { type: 'startQuestion', question, speak: true }), secondary: null,
})

export function buildToday(input: TodayInput, now: Date): TodayModel {
  const { profile, coachNote, interviews, summary, targets, stories, tracks } = input
  const catalog = (tracks ?? []).flatMap(t => t.items)
  const itemOf = (id: string) => catalog.find(i => i.id === id)
  const attemptedItems: ItemStat[] = (summary?.items ?? []).filter(i => i.attempts > 0)

  // nearest target: soonest interview from today on, else the first one saved
  const all: TodayTarget[] = targets ?? []
  const dated = all.map(t => ({ t, d: daysTo(now, t.summary.interviewDate) })).filter((x): x is { t: TodayTarget; d: number } => x.d !== null).sort((a, b) => a.d - b.d)
  const nearest = dated[0]?.t ?? all[0] ?? null
  const nearestDays = dated[0]?.d ?? null
  const interviewDate = dated[0]?.t.summary.interviewDate ?? null

  const isNewUser =
    interviews !== null && summary !== null && targets !== null && stories !== null &&
    !interviews.some(i => i.status === 'completed') && attemptedItems.length === 0 && targets.length === 0 && stories.length === 0

  // ---- hero branches, in priority order ----
  const resume = (): Hero | null => {
    const i = interviews?.find(x => x.status === 'in_progress')
    if (!i) return null
    return { kind: 'resume', kindLabel: 'where you left off', minutes: 5, title: `${i.role}, question ${i.answered + 1}`, why: 'You can carry on from here, or let this one go.',
      primary: link('Pick it up', { type: 'resumeInterview', interviewId: i.id }), secondary: link('Let it go', { type: 'letGo', interviewId: i.id }) }
  }
  const warmup = (): Hero | null => {
    if (!nearest || nearestDays !== 0) return null
    const q = nearest.match?.probes[0]?.question ?? coachNote?.practiceQuestion ?? profile?.firstQuestion ?? 'Tell me about a project you are proud of.'
    return { kind: 'warmup', kindLabel: 'warm-up', minutes: 5, title: q, why: `Your ${nearest.summary.company} interview is today. A short warm-up keeps you loose, and nothing else is due.`,
      primary: link('Warm up', { type: 'startQuestion', question: q, speak: true }), secondary: null }
  }
  const screening = (): Hero | null => {
    if (!nearest || nearestDays === null || nearestDays < 1 || nearestDays > 3 || !nearest.skills?.length) return null
    const c = nearest.summary.company
    return { kind: 'screening', kindLabel: 'screening call', minutes: 8, title: `Practise a ${c} screening call`,
      why: `Your interview is ${countdown(nearestDays)}. A short call with questions from the job, no hints.`,
      primary: link('Begin the call', { type: 'screening', targetId: nearest.summary.id }), secondary: null }
  }
  const coach = (): Hero | null => {
    const q = coachNote?.practiceQuestion?.trim()
    if (!q) return null
    return spoken(q, cleanWhy(coachNote?.observation) || 'A short spoken answer is a good next step.')
  }
  const dueNow = dueReps(attemptedItems, now, interviewDate).filter(r => itemOf(r.itemId))
  const replay = (): Hero | null => {
    if (!dueNow.length) return null
    const n = dueNow.length
    const minutes = dueNow.reduce((s, r) => s + (itemOf(r.itemId)?.minutes ?? 5), 0)
    return { kind: 'replay', kindLabel: 'replay', minutes, title: n === 1 ? 'A replay is due' : 'Replays are due', why: dueNow[0].reason,
      primary: link('Open replays', { type: 'openReplays', itemId: dueNow[0].itemId }), secondary: null }
  }
  const practice = (): Hero | null => {
    if (!summary || !tracks) return null
    const rec = recommend(summary, tracks, all.map(t => ({ company: t.summary.company, interviewDate: t.summary.interviewDate, skills: t.skills ?? [] })), now, interviewDate)
    const item = rec && itemOf(rec.itemId)
    if (!rec || !item) return null
    const tr = (tracks as TrackLike[]).find(t => t.track === item.track)
    return { kind: 'sql', kindLabel: `${TRACK_LABEL[item.track] ?? tr?.title ?? 'practice'} exercise`, minutes: item.minutes, title: item.title, why: rec.reason,
      primary: link('Open this exercise', { type: 'openItem', itemId: item.id }), secondary: null }
  }
  const firstQ = (): Hero | null => (profile?.firstQuestion?.trim() ? spoken(profile.firstQuestion.trim(), 'This is the question your first interview pointed to.') : null)
  const first = (): Hero => ({ kind: 'first', kindLabel: 'your first interview', minutes: 10, title: 'Your first interview',
    why: 'A short conversation so MIRROR can suggest what to practise.', primary: link('Begin', { type: 'firstInterview' }), secondary: null })

  const order = isNewUser ? [resume, warmup, screening, coach, firstQ] : [resume, warmup, screening, coach, replay, practice, firstQ]
  const heroes = order.map(f => f()).filter((h): h is Hero => h !== null)
  const hero = heroes[0] ?? first()
  const rest = heroes.length ? heroes.slice(1) : []
  if (heroes.length) rest.push(first())
  const altLabel = (h: Hero) => h.kind === 'resume' ? 'Pick up where you left off' : h.kind === 'warmup' ? 'Do a five-minute warm-up'
    : h.kind === 'spoken' ? 'Practise a spoken question' : h.kind === 'first' ? 'Your first interview' : h.title
  const alternates = (hero.kind === 'first' ? [] : rest).slice(0, 2).map(h => link(altLabel(h), h.primary.action))

  // ---- coming up ----
  let comingUp: ComingUp | null = null
  if (nearest) {
    const cov = coverageByStatus(nearest.match?.matches ?? [])
    const gapName = cov.gap[0]
    const probe = gapName ? nearest.match?.probes.find(p => p.skill.toLowerCase() === gapName.toLowerCase())?.question
      ?? nearest.match?.matches.find(m => m.skill === gapName)?.probeQuestion : null
    comingUp = {
      targetId: nearest.summary.id, company: nearest.summary.company, role: nearest.summary.role, readOn: nearest.summary.createdAt || null,
      interviewDate: nearest.summary.interviewDate, countdown: countdown(nearestDays), hasResume: nearest.match?.hasResume ?? null,
      ...cov, topGap: gapName && probe ? { skill: gapName, question: probe } : null,
    }
  }

  // ---- since last week ----
  const since = sinceLastWeek(summary, input.completedSessions, input.retryAttempts, now, tracks)

  // ---- replays ----
  let replays: Replays | null = null
  if (attemptedItems.length) {
    const label = (id: string, tail: string) => `${TRACK_LABEL[itemOf(id)?.track ?? ''] ?? 'Practice'} · ${tail}`
    const title = (id: string) => itemOf(id)?.title ?? 'a replay'
    const up = upcomingReps(attemptedItems, now, interviewDate).filter(r => itemOf(r.itemId))
    const dueRows = dueNow.map(r => ({ itemId: r.itemId, title: title(r.itemId), label: label(r.itemId, 'due today') }))
    const upRows = up.slice(0, 2).map(r => ({ itemId: r.itemId, title: title(r.itemId), label: label(r.itemId, `next on ${weekday(r.dueAt)}`) }))
    const compressed = [...dueNow, ...up].some(r => r.compressed)
    if (dueRows.length || upRows.length) replays = {
      due: dueRows, upcoming: upRows,
      compressedLine: compressed && nearest ? `Gaps between replays get shorter as ${nearest.summary.company} gets closer.` : null,
      nothingDueLine: !dueRows.length && up[0] ? `Nothing is due today. Next: ${title(up[0].itemId)} on ${weekday(up[0].dueAt)}.` : null,
    }
  }

  // ---- stories ----
  let storiesCard: StoriesCard | null = null
  if (stories?.length) {
    const g = storyGaps(stories, nearest?.skills ?? null)
    const chip = (id: string) => ({ id, label: themeName(id) })
    storiesCard = { have: g.have.map(chip), missing: g.missing.map(chip), sentence: g.reason, suggest: g.suggest ? chip(g.suggest) : null }
  }

  // ---- set up ----
  const rows: SetupRow[] = []
  if (targets?.length === 0) rows.push({ id: 'target', title: "Add a job you're preparing for", body: 'Paste the job description. Briefing then shows the interview day, which skills your résumé already backs, and a screening call when the role is close.', button: link('Add a role', { type: 'addTarget' }) })
  if (stories?.length === 0) rows.push({ id: 'story', title: 'Save one story you can reuse', body: "A short situation, what you did and how it ended. Today then points out which kinds of story you don't have yet.", button: link('Add a story', { type: 'addStory', theme: null }) })
  const sql = tracks?.find(t => t.track === 'sql')
  const gentle = sql ? [...sql.items].sort((a, b) => a.level - b.level)[0] : undefined
  if (summary && gentle && !summary.items.some(i => i.track === 'sql' && i.attempts > 0)) {
    rows.push({ id: 'sql', title: 'Try one SQL exercise', body: `${gentle.title} is a gentle start, about ${gentle.minutes} minutes, right in your browser.`, button: link('Open it', { type: 'openItem', itemId: gentle.id }) })
  }
  const setup: Setup | null = rows.length ? { heading: "When you're ready, these make Briefing more useful", rows } : null

  // ---- at most four sections: hero, comingUp, since, replays/stories row (the Set up card takes a slot too) ----
  let s = since
  let rp = replays, st = storiesCard
  const count = () => 1 + Number(!!comingUp) + Number(!!s) + Number(!!(rp || st)) + Number(!!setup)
  if (count() > 4) s = null
  if (count() > 4) { rp = null; st = null }

  const g = isNewUser ? 'Welcome. Start with one question.' : greeting(now)
  const model: TodayModel = { greeting: g, status: '', hero, alternates, comingUp, since: s, replays: rp, stories: st, setup, isNewUser }
  model.status = statusLine({ greeting: g, comingUp, replays: rp, isNewUser })
  return model
}
