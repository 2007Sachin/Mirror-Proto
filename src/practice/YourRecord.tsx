import { activeDays28, coverage, firstTryByTopic, weekSeconds, type TrackLike } from './stats'
import type { PracticeSummary } from './types'

const minutes = (sec: number) => (sec < 60 ? (sec === 0 ? 'no time' : 'under a minute') : `${Math.round(sec / 60)} min`)

/** A quiet, collapsed record of past practice. Names and shapes only: no counts of topics, no fractions, no streaks. */
export default function YourRecord({ summary, tracks, now = new Date() }: { summary: PracticeSummary; tracks: TrackLike[]; now?: Date }) {
  if (!summary.items.some(i => i.attempts > 0)) return null
  const days = activeDays28(summary, now)
  const time = weekSeconds(summary, now)
  const cover = coverage(summary, tracks)
  const practised = tracks.flatMap(t => t.topics.filter(topic => !cover.untouched.some(u => u.track === t.track && u.topic === topic)))
  const firstTry = firstTryByTopic(summary, tracks).filter(r => r.firstTryCorrect > 0).map(r => r.topic)
  const max = Math.max(1, ...time.perDay)
  return (
    <details className="ml-glass pr-record">
      <summary>Your record</summary>
      <div className="pr-record-body">
        <div>
          <ol className="pr-cal" aria-label="Days you practised recently">
            {days.map((on, i) => <li key={i} className={on ? 'is-on' : ''}><span className="ml-sr">{on ? 'Practised' : 'No practice'}</span></li>)}
          </ol>
          <p className="pr-record-cap">Days you practised recently. Gaps are fine.</p>
        </div>
        {time.total > 0 && (
          <div>
            <ol className="pr-bars" aria-label="Time per day this week, oldest first">
              {time.perDay.map((sec, i) => <li key={i} title={minutes(sec)}><i style={{ height: `${sec ? Math.max(8, Math.round((sec / max) * 100)) : 4}%` }} /><span className="ml-sr">{minutes(sec)}</span></li>)}
            </ol>
            <p className="pr-record-cap">Time you spent each day this week.</p>
          </div>
        )}
        {practised.length > 0 && <p>Topics you’ve practised: {practised.join(', ')}.</p>}
        {cover.untouched.length > 0 && <p>Not yet: {cover.untouched.map(u => u.topic).join(', ')}.</p>}
        {firstTry.length > 0 && <p>Right on the first go in: {firstTry.join(', ')}.</p>}
      </div>
    </details>
  )
}
