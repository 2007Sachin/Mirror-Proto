import '../pages/sessions.css'
import type { Source } from '../lib/api'

/** One calm line, shown when text was written from the learner's own words instead of by the assistant. */
export default function FallbackNote({ source }: { source?: Source | string | null }) {
  if (source !== 'fallback') return null
  return <p className="fallback-note" role="status">Written from your own words while the assistant was slow.</p>
}
