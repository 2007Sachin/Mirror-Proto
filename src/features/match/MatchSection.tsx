import { useState } from 'react'
import FallbackNote from '../../components/FallbackNote'
import type { MatchResult } from '../../lib/matchApi'
import { useTargetMatch } from './useTargetMatch'
import './match.css'

const STATUS = { covered: 'Covered', partial: 'Mentioned, but no result', gap: 'Not on your résumé' } as const

export function MatchView({ data, onSave, onPractiseProbe }: {
  data: MatchResult
  onSave: (text: string) => Promise<'saved' | 'no-profile'>
  onPractiseProbe?: (question: string) => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const save = async () => {
    if (!text.trim() || busy) return
    setBusy(true); setMsg(null)
    try {
      if ((await onSave(text)) === 'no-profile') setMsg('Finish The First Interview first. Your résumé is kept with your profile.')
    } catch {
      setMsg('We could not save your résumé. Try again.')
    }
    setBusy(false)
  }

  if (!data.hasResume) {
    return (
      <>
        <p className="tg-muted">There is no résumé on file, so there is nothing to compare yet. Paste it here and we will line it up with this job.</p>
        <label className="mt-paste">Paste your résumé
          <textarea value={text} onChange={e => setText(e.target.value)} rows={8} maxLength={20000} />
        </label>
        {msg && <p className="tg-error" role="alert">{msg}</p>}
        <button type="button" className="ml-btn ml-btn--sm" onClick={() => void save()} disabled={busy || !text.trim()}>{busy ? 'Saving…' : 'Save and compare'}</button>
      </>
    )
  }

  const vague = data.claims.filter(c => c.vague).slice(0, 5)
  return (
    <>
      {data.matches.length === 0 && <p className="tg-muted">No skills were found in this job description, so there is nothing to line up.</p>}
      <ul className="mt-list">
        {data.matches.map(m => (
          <li key={m.skill} className={`mt-row is-${m.status}`}>
            <span className="tg-skill">
              <b>{m.skill}</b>
              <span className={`ml-chip tg-weight ${m.weight === 'core' ? 'is-core' : ''}`}>{m.weight === 'core' ? 'Core' : 'Nice to have'}</span>
              <span className="ml-chip mt-status">{STATUS[m.status]}</span>
            </span>
            {m.claimQuote && <q>{m.claimQuote}</q>}
            <p>{m.note}</p>
            {m.probeQuestion && (
              <div className="mt-probe">
                <p><b>A question to prepare for.</b> {m.probeQuestion}</p>
                {onPractiseProbe && <button type="button" className="ml-btn ml-btn--sm ml-btn--quiet" onClick={() => onPractiseProbe(m.probeQuestion!)}>Practise this question</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {vague.length > 0 && (
        <div className="mt-vague">
          <h3>Lines that could say more</h3>
          <ul>{vague.map(c => <li key={c.id}>This line is vague: <q>{c.quote}</q></li>)}</ul>
        </div>
      )}
      {data.aiAttempted && <FallbackNote source={data.source} />}
    </>
  )
}

/** "Your résumé vs this job", for the target detail page. */
export default function MatchSection({ targetId, onPractiseProbe }: { targetId: string; onPractiseProbe?: (question: string) => void }) {
  const { data, loading, error, saveResume } = useTargetMatch(targetId)
  return (
    <section className="ml-glass tg-card-body" aria-labelledby="tg-match">
      <h2 id="tg-match">Your résumé vs this job</h2>
      {loading && <p className="tg-muted" role="status">Comparing your résumé…</p>}
      {error && <p className="tg-muted" role="alert">We could not compare your résumé right now.</p>}
      {data && <MatchView data={data} onSave={saveResume} onPractiseProbe={onPractiseProbe} />}
    </section>
  )
}
