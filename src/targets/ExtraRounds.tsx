import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import FolderCard from '../components/FolderCard'
import { getMatch, type MatchResult } from '../lib/matchApi'
import { addCustomRound, customRoundOpener, loadCustomRounds, nextStart, removeCustomRound } from './roundOpener'

type Start = (role: string, opts: { question: string; speak: boolean; targetId: string }) => void

/** Below the job's own rounds: a round built from what the résumé does not show yet, and rounds the candidate says will happen. */
export default function ExtraRounds({ target, firstTint, onPractise }: { target: { id: string; company: string; role: string }; firstTint: number; onPractise: Start }) {
  const [match, setMatch] = useState<MatchResult | null>(null)
  const [names, setNames] = useState<string[]>(() => loadCustomRounds(target.id))
  const [draft, setDraft] = useState('')

  useEffect(() => {
    let live = true
    getMatch(target.id).then(m => { if (live) setMatch(m) }).catch(() => { if (live) setMatch(null) })
    return () => { live = false }
  }, [target.id])

  // What the job asks for and the résumé does not show: core skills first.
  const gaps = (match?.matches ?? []).filter(m => m.status !== 'covered').sort((a, b) => (a.weight === b.weight ? 0 : a.weight === 'core' ? -1 : 1))

  const startGaps = (speak: boolean) => {
    const g = gaps[nextStart(target.id, 'resume-gaps') % gaps.length]
    onPractise(`${target.role} · Résumé gaps`.slice(0, 120), { question: g.probeQuestion ?? `Tell me about a time you used ${g.skill}. What was your part in it?`, speak, targetId: target.id })
  }
  const startNamed = (name: string, speak: boolean) => {
    const { role, question } = customRoundOpener(name, target)
    onPractise(role, { question, speak, targetId: target.id })
  }
  const add = (e: FormEvent) => { e.preventDefault(); setNames(addCustomRound(target.id, draft)); setDraft('') }

  return (
    <div className="tg-extra">
      <h3>From your résumé</h3>
      {match && !match.hasResume && <p className="tg-muted">Add your résumé under Understand and MIRROR will suggest a round on what this job asks for that your résumé does not show.</p>}
      {match?.hasResume && gaps.length === 0 && <p className="tg-muted">Your résumé shows the main skills this job asks for.</p>}
      {match?.hasResume && gaps.length > 0 && (
        <ul className="tg-round-grid">
          <li>
            <FolderCard
              tint={firstTint} label={target.company} title="Résumé gaps" name="What your résumé does not show" headingId="tg-r-gaps" level="h3" pill="Suggested"
              summary="A round on what this job asks for that your résumé does not show yet."
              lines={gaps.slice(0, 3).map(g => g.skill)}
              footer={<><button type="button" className="tg-go" onClick={() => startGaps(true)}>Start interview <ArrowRight size={18} aria-hidden="true" /></button><button type="button" className="tg-alt" onClick={() => startGaps(false)}>Type instead</button></>}
            />
          </li>
        </ul>
      )}

      <h3>Rounds you know about</h3>
      <p className="tg-muted">If the company has told you the rounds, such as a case study or a hiring manager call, add them here.</p>
      <form className="tg-addround" onSubmit={add}>
        <label>Round name<input value={draft} maxLength={60} onChange={e => setDraft(e.target.value)} placeholder="For example, Case study" /></label>
        <button type="submit" className="m-btn m-btn--quiet" disabled={!draft.trim() || names.length >= 8}>Add a round</button>
      </form>
      {names.length > 0 && (
        <ul className="tg-round-grid">
          {names.map((n, i) => (
            <li key={n}>
              <FolderCard
                tint={firstTint + 1 + i} label={target.company} title={n} name={n} headingId={`tg-c-${i}`} level="h3" pill="Your round"
                summary="A round you added."
                lines={['A live interviewer, spoken or typed', 'Follow-ups use what this job asks for']}
                footer={<><button type="button" className="tg-go" onClick={() => startNamed(n, true)}>Start interview <ArrowRight size={18} aria-hidden="true" /></button><button type="button" className="tg-alt" onClick={() => startNamed(n, false)}>Type instead</button><button type="button" className="tg-alt" aria-label={`Remove ${n}`} onClick={() => setNames(removeCustomRound(target.id, n))}>Remove</button></>}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
