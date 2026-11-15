import '../../landing.css'
import './screen.css'

export interface ScreenEntryCardProps {
  /** The target to practise for. Without one, the card says to add a target first. */
  target: { id: string; role: string; company: string; skillCount: number } | null
  onStart: (targetId: string) => void
  busy?: boolean
}

/** A short entry for Today. Starting a call has no hints and no coaching, and ends by itself. */
export function ScreenEntryCard({ target, onStart, busy = false }: ScreenEntryCardProps) {
  const reason = !target ? 'Add a target with a job description first.' : target.skillCount === 0 ? 'This target has no skills yet. Wait for the job description to be read.' : null
  return (
    <section className="ml-glass sc-card" aria-labelledby="sc-entry">
      <h2 id="sc-entry">Practise a screening call</h2>
      <p className="sc-muted">A short call like an automated screen: questions from the job, no hints, and it ends by itself after about eight minutes.</p>
      {target && <p className="sc-muted">For {target.role} at {target.company}.</p>}
      <button type="button" className="ml-btn ml-btn--sm" disabled={busy || reason !== null} aria-describedby={reason ? 'sc-entry-why' : undefined} onClick={() => target && onStart(target.id)}>Practise a screening call</button>
      {reason && <p id="sc-entry-why" className="sc-muted">{reason}</p>}
    </section>
  )
}
