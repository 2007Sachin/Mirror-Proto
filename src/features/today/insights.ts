// Pure helpers behind Today. No React, no fetch, no window. No scores, counts-as-grades or percentages in any string.
import type { InterviewSession } from '../../lib/api'
import { analyseAnswer } from '../../lib/analyse'
import type { AnswerAttemptRow, GapMatchRow } from '../../lib/data'
import { THEMES, themeName, themesFor } from '../../stories/themes'
import { weakSpots, type TrackLike } from '../../practice/stats'
import type { PracticeSummary } from '../../practice/types'
import { compareAttempts } from '../replay/replayLogic'
import { missingParts, pickWeakest } from '../screen/debriefLogic'
import type { Since, SinceItem } from './types'

const DAY = 86_400_000
const WINDOW = 14 * DAY
const MAX = 3

export function greeting(now: Date): string {
  const h = now.getHours()
  return h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.'
}

/** Skill names by match status. Core skills first, then alphabetical. */
export function coverageByStatus(matches: Pick<GapMatchRow, 'skill' | 'weight' | 'status'>[]) {
  const by = (s: GapMatchRow['status']) =>
    matches.filter(m => m.status === s)
      .sort((a, b) => Number(b.weight === 'core') - Number(a.weight === 'core') || a.skill.localeCompare(b.skill))
      .map(m => m.skill)
  return { covered: by('covered'), partial: by('partial'), gap: by('gap') }
}

const titleOf = (tracks: TrackLike[] | null, id: string) => tracks?.flatMap(t => t.items).find(i => i.id === id)?.title ?? null
const words = (s: string) => s.trim().split(/\s+/).length

/** What got stronger and what deserves another look in the last 14 days. Null when nothing happened in that time. */
export function sinceLastWeek(
  summary: PracticeSummary | null, sessions: InterviewSession[] | null, retries: AnswerAttemptRow[] | null, now: Date, tracks: TrackLike[] | null = null,
): Since | null {
  const from = now.getTime() - WINDOW
  const inWindow = (iso: string) => { const t = Date.parse(iso); return t >= from && t <= now.getTime() + DAY }
  const done = (sessions ?? []).filter(s => s.status === 'completed' && s.turns.length > 0).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const items = summary?.items ?? []
  if (!items.some(i => i.attempts > 0 && inWindow(i.lastAt)) && !done.some(s => inWindow(s.createdAt)) && !(retries ?? []).some(r => inWindow(r.createdAt))) return null

  const stronger: SinceItem[] = []
  // (a) a miss followed by a correct answer, the correct one inside the window
  for (const it of items) {
    const h = it.history ?? []
    const k = h.findIndex((a, i) => !a.correct && h[i + 1]?.correct && inWindow(h[i + 1].at))
    const title = titleOf(tracks, it.itemId)
    if (k >= 0 && title && words(title) <= 6) {
      stronger.push({ headline: `${it.topic} is clicking.`, detail: k === 0 ? `You solved “${title}” on your second go.` : `You solved “${title}” after trying it again.`, link: null })
    }
  }
  // (b) first vs latest retry of the same question, both inside the window
  const groups = new Map<string, AnswerAttemptRow[]>()
  for (const r of (retries ?? []).filter(r => inWindow(r.createdAt))) {
    const key = r.interviewId ? `${r.interviewId}:${r.questionIndex}` : r.question
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  for (const rows of groups.values()) {
    if (rows.length < 2) continue
    rows.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.attempt - b.attempt)
    const c = compareAttempts(analyseAnswer(rows[0].answer), analyseAnswer(rows[rows.length - 1].answer))
    if (c.improved) stronger.push({ headline: c.lines[0], detail: 'Between your first and latest go at the same question.', link: null })
  }
  // (c) fewer fillers between the last two completed sessions.
  // ponytail: raw totals, not per word; switch to a rate if sessions differ a lot in length.
  if (done.length >= 2 && inWindow(done[0].createdAt)) {
    const fillers = (s: InterviewSession) => s.turns.reduce((n, t) => n + analyseAnswer(t.answer).fillerTotal, 0)
    if (fillers(done[0]) < fillers(done[1])) stronger.push({ headline: 'Fewer filler words', detail: 'Your latest session had fewer than the one before.', link: null })
  }

  const another: SinceItem[] = []
  if (done[0] && inWindow(done[0].createdAt)) {
    const turns = done[0].turns
    const w = pickWeakest(turns)
    if (w !== null) another.push({
      headline: `“${turns[w].question}”`, detail: missingParts(turns[w].answer),
      link: { label: 'Say it again', action: { type: 'sayItAgain', interviewId: done[0].id, questionIndex: turns[w].questionIndex } },
    })
  }
  if (summary && tracks) {
    for (const w of weakSpots(summary, tracks)) {
      const title = titleOf(tracks, w.itemIds[0])
      if (title) another.push({ headline: `${w.topic} is worth another look`, detail: `You have not solved “${title}” yet.`, link: { label: 'Try it again', action: { type: 'openItem', itemId: w.itemIds[0] } } })
    }
  }
  if (!stronger.length && !another.length) return null
  return { stronger: stronger.slice(0, MAX), another: another.slice(0, MAX) }
}

export interface StoryGaps { have: string[]; missing: string[]; suggest: string | null; reason: string }

/** Which story themes are covered, and the one most worth adding. Target-driven first, then Conflict, then Failure. */
export function storyGaps(stories: { themes: string[] }[] | null, targetSkills: { area: string; name: string; quote?: string }[] | null): StoryGaps {
  const have = THEMES.map(t => t.id).filter(id => (stories ?? []).some(s => s.themes.includes(id)))
  const missing = THEMES.map(t => t.id).filter(id => !have.includes(id))
  const pointed = new Set((targetSkills ?? []).filter(s => s.area === 'behavioural').flatMap(s => themesFor(`${s.name} ${s.quote ?? ''}`)))
  const driven = THEMES.map(t => t.id).find(id => pointed.has(id) && missing.includes(id))
  const suggest = driven ?? ['conflict', 'failure'].find(id => missing.includes(id)) ?? missing[0] ?? null
  const name = suggest ? themeName(suggest).toLowerCase() : ''
  const reason = !suggest ? 'You have a story for every kind of question.'
    : driven ? `This role points to ${name}, and you have no story for it yet.`
    : `${themeName(suggest)} comes up in most interviews, and you have no story for it yet.`
  return { have, missing, suggest, reason }
}

/** One calm sentence under the greeting. */
export function statusLine(m: { greeting: string; comingUp: { company: string; countdown: string | null } | null; replays: { due: unknown[] } | null; isNewUser: boolean }): string {
  if (m.isNewUser) return 'Nothing to set up first. Here is a good place to begin.'
  const when = m.greeting === 'Good evening.' ? 'tonight' : 'today'
  if (m.comingUp?.countdown) return `Your ${m.comingUp.company} interview is ${m.comingUp.countdown}. Here is one thing worth doing ${when}.`
  if (m.replays && m.replays.due.length === 0) return 'Nothing is due. Here is a good next question.'
  return `Here is one good next step for ${when}.`
}
