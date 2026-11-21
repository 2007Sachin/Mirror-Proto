import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { RESULTS, loadOutcome, practiceDays, saveOutcome, type Outcome as OutcomeValue } from './outcome'

const short = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** On a job's Afterwards stage: the practice you did for this job next to how the real interview went, so you can see what to repeat. No grade. */
export default function Outcome({ targetId }: { targetId: string }) {
  const [saved, setSaved] = useState<OutcomeValue>(() => loadOutcome(targetId))
  // undefined while loading, null when nothing is tied to this job.
  const [practice, setPractice] = useState<ReturnType<typeof practiceDays> | undefined>(undefined)

  useEffect(() => {
    let live = true
    api.listInterviews({ limit: 100 }).then(rows => { if (live) setPractice(practiceDays(rows, targetId)) }).catch(() => { if (live) setPractice(null) })
    return () => { live = false }
  }, [targetId])

  const update = (patch: Partial<OutcomeValue>) => { const next = { ...saved, ...patch }; setSaved(next); saveOutcome(targetId, next) }

  return (
    <div className="tg-outcome">
      <h3>Practice for this job</h3>
      {practice === undefined && <p className="tg-muted">Looking at your sessions…</p>}
      {practice === null && <p className="tg-muted">No practice is tied to this job yet. Start a round under Prepare.</p>}
      {practice && <p>You practised for this job on {practice.days} {practice.days === 1 ? 'day' : 'days'}, from {short(practice.first)} to {short(practice.last)}.</p>}

      <h3>The real interview</h3>
      <fieldset className="tg-results">
        <legend>How did it go?</legend>
        {RESULTS.map(r => (
          <label key={r.id}>
            <input type="radio" name={`outcome-${targetId}`} checked={saved.result === r.id} onChange={() => update({ result: r.id })} />
            {r.label}
          </label>
        ))}
        {saved.result && <button type="button" className="tg-alt" onClick={() => update({ result: null })}>Clear</button>}
      </fieldset>
      <label className="tg-note-field">A note for next time <span>(optional)</span>
        <textarea rows={3} maxLength={300} value={saved.note} onChange={e => update({ note: e.target.value })} placeholder="What you would tell yourself before the next one." />
      </label>
      <p className="tg-muted">Kept in this browser only, not in your account.</p>
    </div>
  )
}
