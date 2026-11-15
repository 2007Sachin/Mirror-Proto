import { useCallback, useEffect, useMemo, useState } from 'react'
import '../landing.css'
import './overview.css'
import { api, type CoachNote, type InterviewSummary, type Profile, type Skill, type TargetSummary } from '../lib/api'
import { LiveOrb } from '../components/LiveOrb'
import { findItem, tracks } from '../practice/tracks'
import { activeDays28, coverage, dueForReview, firstTryByTopic, nextInterview, recommend, targetNeeds, weakSpots, weekCompare, weekSeconds } from '../practice/stats'
import type { PracticeSummary } from '../practice/types'

/**
 * Today. Real counts from practice, the next rep, what the targets want, and the spoken interview lower down.
 * Light palette (.mirror-landing tokens). No scores, percentages or streaks.
 */
const NEAREST_TARGETS = 4

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
function span(seconds: number) {
  if (seconds < 60) return seconds === 0 ? 'none yet' : 'under a minute'
  const m = Math.round(seconds / 60)
  return m < 60 ? plural(m, 'minute') : `${Math.floor(m / 60)} h ${m % 60} min`
}

export default function Overview({ profile, busy, onStart, onContinue, onLetGo, onOpenItem }: {
  profile: Profile | null
  busy: boolean
  onStart: (openingQuestion: string | undefined, speak: boolean) => void
  onContinue: (id: string, role: string) => void
  onLetGo: (id: string) => Promise<void>
  onOpenItem: (itemId: string) => void
}) {
  const [now] = useState(() => new Date())
  const [sessions, setSessions] = useState<InterviewSummary[]>([])
  const [note, setNote] = useState<CoachNote | null>(null)
  const [noteState, setNoteState] = useState<'loading' | 'ready' | 'none'>('loading')
  const [summary, setSummary] = useState<PracticeSummary | null>(null)
  const [summaryFailed, setSummaryFailed] = useState(false)
  const [targets, setTargets] = useState<TargetSummary[] | null>(null)
  const [skills, setSkills] = useState<Record<string, Skill[]>>({})

  const loadSessions = useCallback(() => api.listInterviews().then(setSessions).catch(() => undefined), [])
  useEffect(() => {
    let live = true
    api.listInterviews().then(list => live && setSessions(list)).catch(() => undefined)
    api.coachNote()
      .then(n => { if (live) { setNote(n); setNoteState('ready') } })
      .catch(() => live && setNoteState('none')) // no profile saved yet, or the server is unreachable
    api.practiceSummary().then(s => live && setSummary(s)).catch(() => live && setSummaryFailed(true))
    api.listTargets()
      .then(list => {
        if (!live) return
        setTargets(list)
        // Skills only for the few nearest targets: the list does not carry them.
        const upcoming = [...list].sort((a, b) => (a.interviewDate ?? '9999').localeCompare(b.interviewDate ?? '9999')).slice(0, NEAREST_TARGETS)
        upcoming.forEach(t => api.getTarget(t.id).then(full => live && setSkills(p => ({ ...p, [t.id]: full.skills }))).catch(() => undefined))
      })
      .catch(() => live && setTargets([]))
    return () => { live = false }
  }, [])

  const open = sessions.find(s => s.status === 'in_progress')

  const insight = useMemo(() => {
    const tg = (targets ?? []).map(t => ({ id: t.id, company: t.company, interviewDate: t.interviewDate, skills: skills[t.id] ?? [] }))
    const s = summary
    return {
      tg,
      interview: nextInterview(tg, now),
      rec: s ? recommend(s, tracks, tg, now) : null,
      compare: s && weekCompare(s, now),
      time: s && weekSeconds(s, now),
      cover: s && coverage(s, tracks),
      firstTry: s ? firstTryByTopic(s, tracks) : [],
      weak: s ? weakSpots(s, tracks) : [],
      due: s ? dueForReview(s, now) : [],
      days: s ? activeDays28(s, now) : [],
    }
  }, [summary, targets, skills, now])

  const practised = !!summary && summary.items.some(i => i.attempts > 0)
  const rec = insight.rec
  const recItem = rec ? findItem(rec.itemId) : undefined
  const weakIds = insight.weak.flatMap(w => w.itemIds)
  const maxBar = Math.max(1, ...(insight.time?.perDay ?? [0]))
  const activeCount = insight.days.filter(Boolean).length

  return (
    <div className="mirror-landing today">
      <header className="today-top">
        <div>
          <p className="ml-eyebrow">Today</p>
          <h1>{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h1>
        </div>
      </header>

      <div className="today-stack">
        <div className="today-row">
          <section className="ml-glass today-card" aria-labelledby="iv-title" aria-busy={targets === null}>
            <h2 id="iv-title" className="today-h">Next interview</h2>
            {targets === null ? <p className="today-big is-loading">Checking your dates…</p>
              : insight.interview ? (
                <>
                  <p className="today-big">{insight.interview.days === 0 ? `Interview with ${insight.interview.company} is today` : `${plural(insight.interview.days, 'day')} to ${insight.interview.company}`}</p>
                  <p className="today-sub">The nearest date among your targets.</p>
                </>
              ) : (
                <>
                  <p className="today-big">No date set</p>
                  <p className="today-sub">Add an interview date to a target and the countdown appears here.</p>
                </>
              )}
          </section>

          {(summary === null || activeCount > 0) && (
            <section className="ml-glass today-card" aria-labelledby="cal-title" aria-busy={summary === null}>
              <h2 id="cal-title" className="today-h">Days you practised</h2>
              <ol className="today-cal" aria-label={summary ? `Last 28 days: practised on ${activeCount}` : 'Last 28 days'}>
                {(summary ? insight.days : Array.from({ length: 28 }, () => false)).map((on, i) => (
                  <li key={i} className={on ? 'is-on' : ''} title={on ? 'Practised' : ''}><span className="ml-sr">{on ? 'Practised' : 'No practice'}</span></li>
                ))}
              </ol>
              <p className="today-sub">{summary ? `Practised on ${plural(activeCount, 'day')} in the last 28.` : 'Loading…'}</p>
            </section>
          )}
        </div>

        {summaryFailed && <p className="today-quiet" role="status">We could not load your practice numbers just now. The rest of Today still works.</p>}

        {summary === null && !summaryFailed && (
          <section className="ml-glass today-card today-skel" aria-busy="true"><h2 className="today-h">Next best rep</h2><p className="today-big is-loading">Choosing your next rep…</p></section>
        )}

        {summary && !practised && (
          <section className="ml-glass today-rep" aria-labelledby="empty-title">
            <p className="today-rep-label"><span className="today-dot" aria-hidden="true" />Nothing practised yet</p>
            <h2 id="empty-title">{recItem ? recItem.title : 'Pick a track to begin'}</h2>
            <p className="today-why">{rec ? rec.reason : 'Short exercises in SQL, Python, stats and cases. Once you have done a few, this page shows what you have covered.'}</p>
            <div className="today-go">
              {rec && <button type="button" className="ml-btn" onClick={() => onOpenItem(rec.itemId)}>Start this one</button>}
              {recItem && <span className="today-meta">{recItem.minutes} min · Level {recItem.level}</span>}
            </div>
          </section>
        )}

        {practised && (
          <>
            {rec && recItem && (
              <section className="ml-glass today-rep" aria-labelledby="rep-title">
                <p className="today-rep-label"><span className="today-dot" aria-hidden="true" />Next best rep · {recItem.minutes} minutes</p>
                <h2 id="rep-title">{recItem.title}</h2>
                <p className="today-why">{rec.reason}</p>
                <div className="today-go">
                  <button type="button" className="ml-btn" onClick={() => onOpenItem(rec.itemId)}>Open it</button>
                  <span className="today-meta">Level {recItem.level}</span>
                </div>
              </section>
            )}

            <div className="today-stats">
              <section className="ml-glass today-card" aria-labelledby="wk-title">
                <h2 id="wk-title" className="today-h">Practised this week</h2>
                <p className="today-big">{plural(insight.compare?.thisWeek ?? 0, 'exercise')}</p>
                <p className="today-sub">{insight.compare?.lastWeek ? `${insight.compare.lastWeek} the week before.` : 'Nothing the week before.'}</p>
              </section>
              <section className="ml-glass today-card" aria-labelledby="tm-title">
                <h2 id="tm-title" className="today-h">Time this week</h2>
                <p className="today-big">{span(insight.time?.total ?? 0)}</p>
                <ol className="today-bars" aria-label="Time per day, last 7 days, oldest first">
                  {(insight.time?.perDay ?? []).map((sec, i) => (
                    <li key={i} title={span(sec)}><i style={{ height: `${sec ? Math.max(8, Math.round((sec / maxBar) * 100)) : 4}%` }} /><span className="ml-sr">{span(sec)}</span></li>
                  ))}
                </ol>
              </section>
              <section className="ml-glass today-card" aria-labelledby="cv-title">
                <h2 id="cv-title" className="today-h">Coverage</h2>
                <p className="today-big">Topics touched {insight.cover?.touched} of {insight.cover?.total}</p>
                {!!insight.cover?.untouched.length && (
                  <p className="today-sub">Not yet: {insight.cover.untouched.slice(0, 3).map(u => u.topic).join(', ')}{insight.cover.untouched.length > 3 ? ` and ${insight.cover.untouched.length - 3} more` : ''}.</p>
                )}
              </section>
            </div>

            <div className="today-row">
              <section className="ml-glass today-card" aria-labelledby="ft-title">
                <h2 id="ft-title" className="today-h">First try, by topic</h2>
                <ul className="today-list" role="list">
                  {insight.firstTry.map(r => (
                    <li key={`${r.track}${r.topic}`}>{r.topic}: first try right {r.firstTryCorrect} of {r.attempted} attempted</li>
                  ))}
                </ul>
              </section>
              <div className="today-col">
                <section className="ml-glass today-card" aria-labelledby="wk2-title">
                  <h2 id="wk2-title" className="today-h">Weak spots</h2>
                  {weakIds.length ? (
                    <>
                      <p className="today-sub">{plural(weakIds.length, 'exercise')} missed on the first try and not solved yet: {insight.weak.map(w => w.topic).join(', ')}.</p>
                      <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={() => onOpenItem(weakIds[0])}>Practise</button>
                    </>
                  ) : <p className="today-sub">None right now.</p>}
                </section>
                <section className="ml-glass today-card" aria-labelledby="du-title">
                  <h2 id="du-title" className="today-h">Due for review</h2>
                  {insight.due.length ? (
                    <>
                      <p className="today-sub">{plural(insight.due.length, 'exercise')} solved more than 3 days ago and not looked at since.</p>
                      <button type="button" className="ml-btn ml-btn--quiet ml-btn--sm" onClick={() => onOpenItem(insight.due[0].itemId)}>Review</button>
                    </>
                  ) : <p className="today-sub">Nothing is due.</p>}
                </section>
              </div>
            </div>

            {summary && insight.tg.some(t => t.skills.length) && (
              <section className="ml-glass today-card" aria-labelledby="tw-title">
                <h2 id="tw-title" className="today-h">What your targets want</h2>
                <ul className="today-list" role="list">
                  {insight.tg.filter(t => t.skills.length).map(t => {
                    const need = targetNeeds(t.skills, tracks, summary)
                    return (
                      <li key={t.id}>
                        <b>{t.company}</b>
                        {need.rows.length ? <> asks for {need.rows.map(r => r.title).join(' and ')}. You have solved {need.rows.map(r => `${r.solved} of ${r.available} in ${r.title}`).join(', ')}.</> : <> has no skills here that match a hands-on track yet.</>}
                      </li>
                    )
                  })}
                </ul>
                <p className="today-sub">Tools has no hands-on track here yet. Behavioural is the interview below.</p>
              </section>
            )}
          </>
        )}

        <section className="ml-glass today-rep today-coach" aria-labelledby="coach-title" aria-busy={noteState === 'loading'}>
          <div className="today-rep-head">
            <p className="today-rep-label"><span className="today-dot" aria-hidden="true" />Spoken interview · about 10 minutes</p>
            <div className="ml-orb today-orb" data-state={noteState === 'loading' ? 'thinking' : 'idle'} aria-hidden="true">
              <LiveOrb compact state={noteState === 'loading' ? 'thinking' : 'idle'} />
            </div>
          </div>
          {noteState === 'loading' && <h2 id="coach-title" className="is-loading">Choosing your next question…</h2>}
          {note && (
            <>
              <h2 id="coach-title">{note.nextPractice}</h2>
              <p className="today-why">{note.observation}</p>
            </>
          )}
          {noteState === 'none' && (
            <>
              <h2 id="coach-title">Your first interview is ready.</h2>
              {profile && <p className="today-why">It starts with {profile.focus}.</p>}
            </>
          )}
          <div className="today-go">
            <button type="button" className="ml-btn" disabled={busy} onClick={() => onStart(note?.practiceQuestion, true)}>
              Start speaking
            </button>
            <button type="button" className="ml-btn ml-btn--quiet" disabled={busy} onClick={() => onStart(note?.practiceQuestion, false)}>
              Type instead
            </button>
            <span className="today-meta">4 questions{profile ? ` · stays on ${profile.focus}` : ''}</span>
          </div>
          {open && (
            <p className="today-open">
              You have a session in progress, question {open.answered + 1}.{' '}
              <button type="button" onClick={() => onContinue(open.id, open.role)}>Pick it up</button>
              <span aria-hidden="true"> · </span>
              <button type="button" onClick={() => void onLetGo(open.id).then(loadSessions)}>Let it go</button>
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
