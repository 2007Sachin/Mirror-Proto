import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import * as data from '../../lib/data'
import { getMatch } from '../../lib/matchApi'
import { tracks } from '../../practice/tracks'
import type { SectionStatus, TodayData, TodayInput, TodayTarget } from './types'

const EXTRA_TARGETS = 3
type Slot<T> = { value: T | null; status: SectionStatus }
const loading = { value: null, status: 'loading' } as const

/** Today's date as YYYY-MM-DD in local time, for picking the nearest upcoming interview. */
function todayIso(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

/** Everything Today needs, fetched in parallel. Each section is `ready` as soon as its own data arrives; a failure never blanks the rest. */
export function useTodayData(): TodayData {
  const [profile, setProfile] = useState<Slot<TodayInput['profile']>>(loading)
  const [coach, setCoach] = useState<Slot<TodayInput['coachNote']>>(loading)
  const [interviews, setInterviews] = useState<Slot<TodayInput['interviews']>>(loading)
  const [sessions, setSessions] = useState<Slot<TodayInput['completedSessions']>>(loading)
  const [summary, setSummary] = useState<Slot<TodayInput['summary']>>(loading)
  const [targets, setTargets] = useState<Slot<TodayTarget[]>>(loading)
  const [detail, setDetail] = useState<SectionStatus>('loading') // skills and match of the nearest target
  const [stories, setStories] = useState<Slot<TodayInput['stories']>>(loading)
  const [retries, setRetries] = useState<Slot<TodayInput['retryAttempts']>>(loading)

  useEffect(() => {
    let live = true
    const ok = <T,>(set: (s: Slot<T>) => void) => (value: T) => { if (live) set({ value, status: 'ready' }) }
    const bad = <T,>(set: (s: Slot<T>) => void) => () => { if (live) set({ value: null, status: 'error' }) }
    // A 404 (no profile yet) and any other coach failure both mean "no note": buildToday falls back to the next branch.
    const none = <T,>(set: (s: Slot<T>) => void) => () => { if (live) set({ value: null, status: 'ready' }) }

    api.getProfile().then(ok(setProfile)).catch(none(setProfile))
    api.coachNote().then(ok(setCoach)).catch(none(setCoach))
    api.practiceSummary().then(ok(setSummary)).catch(bad(setSummary))
    data.stories.list().then(ok(setStories)).catch(bad(setStories))
    data.answerAttempts.list({ kind: 'retry' }).then(ok(setRetries)).catch(none(setRetries))

    api.listInterviews().then(list => {
      if (!live) return
      setInterviews({ value: list, status: 'ready' })
      const done = list.filter(s => s.status === 'completed').slice(0, 2)
      Promise.all(done.map(s => api.getInterview(s.id))).then(ok(setSessions)).catch(none(setSessions))
    }).catch(() => { if (live) { setInterviews({ value: null, status: 'error' }); setSessions({ value: null, status: 'ready' }) } })

    api.listTargets().then(list => {
      if (!live) return
      const today = todayIso()
      // Nearest upcoming date first, then undated ones; skills and the match only for it plus a few more.
      const sorted = [...list].sort((a, b) => (a.interviewDate && a.interviewDate >= today ? a.interviewDate : '9999').localeCompare(b.interviewDate && b.interviewDate >= today ? b.interviewDate : '9999'))
      const all: TodayTarget[] = sorted.map(summary => ({ summary, skills: null, match: null }))
      setTargets({ value: all, status: 'ready' })
      const fetched = all.slice(0, 1 + EXTRA_TARGETS)
      if (!fetched.length) { setDetail('ready'); return }
      let nearestDone = false
      fetched.forEach((t, i) => {
        Promise.all([
          api.getTarget(t.summary.id).then(full => full.skills).catch(() => null),
          getMatch(t.summary.id).catch(() => null),
        ]).then(([skills, match]) => {
          if (!live) return
          setTargets(prev => ({ status: 'ready', value: (prev.value ?? all).map(x => (x.summary.id === t.summary.id ? { ...x, skills, match } : x)) }))
          if (i === 0 && !nearestDone) { nearestDone = true; setDetail('ready') }
        })
      })
    }).catch(() => { if (live) { setTargets({ value: null, status: 'error' }); setDetail('error') } })

    return () => { live = false }
  }, [])

  const settled = (s: { status: SectionStatus }) => s.status !== 'loading'
  const first = (...s: SectionStatus[]): SectionStatus => (s.includes('loading') ? 'loading' : s.includes('error') ? 'error' : 'ready')
  return {
    input: {
      profile: profile.value, coachNote: coach.value, interviews: interviews.value, completedSessions: sessions.value,
      summary: summary.value, targets: targets.value, stories: stories.value, retryAttempts: retries.value, tracks,
    },
    status: {
      // The hero never shows an error: a failed source just drops that branch.
      hero: settled(coach) && settled(interviews) && settled(summary) && settled(targets) && settled(profile) ? 'ready' : 'loading',
      comingUp: first(targets.status, detail === 'error' ? 'ready' : detail),
      since: first(summary.status, interviews.status, sessions.status, retries.status === 'error' ? 'ready' : retries.status),
      replays: summary.status,
      stories: stories.status,
    },
  }
}
