import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import './interviewPrep.css'
import FolderCard from '../components/FolderCard'
import { api, type TargetSummary } from '../lib/api'
import { AddForm, Mission, type PracticeOpts } from './Targets'
import { PREP_ROLES, firstSentence, type PrepRole } from '../prep/roles'

// Which questions you have already been asked live is kept in this browser only (cleared on sign-out with every other mirror.* key).
const KEY = (slug: string) => `mirror.prep.v1.${slug}`
const LAST = 'mirror.prep.v1.last'
const load = (slug: string): string[] => {
  try { const s = JSON.parse(localStorage.getItem(KEY(slug)) ?? 'null'); if (s && Array.isArray(s.done)) return s.done } catch { /* unreadable: start fresh */ }
  return []
}
const keep = (slug: string, done: string[]) => { try { localStorage.setItem(KEY(slug), JSON.stringify({ done })) } catch { /* private mode: lasts for this visit */ } }
const lastRole = () => { try { const slug = localStorage.getItem(LAST); return PREP_ROLES.find(r => r.slug === slug) ?? null } catch { return null } }

type Start = (role: string, openingQuestion: string, speak: boolean) => void

/** Handlers for a saved job. When they are not given (the tests), the page shows ready-made roles only. */
type JobProps = {
  jobId?: string | null
  onOpenJob?: (id: string | null) => void
  onPractise?: (role: string, opts?: PracticeOpts) => void
  onPractiseProbe?: (question: string) => void
  onScreen?: (targetId: string) => void
  onAddStory?: (theme: string | null) => void
}

/** Pick a ready-made role or bring your own job, then enter a live mock interview for any round. The interviewer opens with a question from that round and follows up from what you say. */
export default function InterviewPrep({ onStart, jobId = null, onOpenJob, onPractise, onPractiseProbe, onScreen, onAddStory }: { onStart: Start } & JobProps) {
  const [role, setRole] = useState<PrepRole | null>(lastRole)
  const open = (r: PrepRole | null) => { setRole(r); try { if (r) localStorage.setItem(LAST, r.slug); else localStorage.removeItem(LAST) } catch { /* ignore */ } }
  // "new" is the page for bringing a job; any other id is a saved job.
  if (jobId === 'new' && onOpenJob) {
    return (
      <section className="prep-page" aria-label="Interview Prep">
        <div className="page-title">
          <div>
            <p className="eyebrow">Interview Prep</p>
            <h1>Bring your own job</h1>
            <p>Paste the job description. MIRROR lines it up with your résumé, suggests rounds, and you can add the ones the company told you about.</p>
          </div>
          <button type="button" className="m-btn m-btn--quiet" onClick={() => onOpenJob(null)}>All roles</button>
        </div>
        <div className="targets prep-newjob"><AddForm onCancel={() => onOpenJob(null)} onCreated={onOpenJob} /></div>
      </section>
    )
  }
  if (jobId && onOpenJob && onPractise) {
    return (
      <section className="prep-page" aria-label="Interview Prep">
        <div className="targets">
          <Mission key={jobId} id={jobId} onBack={() => onOpenJob(null)} onPractise={onPractise} onPractiseProbe={onPractiseProbe} onScreen={onScreen} onAddStory={onAddStory} />
        </div>
      </section>
    )
  }
  return (
    <section className="prep-page" aria-label="Interview Prep">
      {role ? <RoleView key={role.slug} role={role} onChange={() => open(null)} onStart={onStart} /> : <Picker onPick={open} onOpenJob={onOpenJob} />}
    </section>
  )
}

/** Saved jobs and a way to bring a new one. A job is a role you made yourself: its rounds come from the posting and your résumé. */
function Jobs({ onOpen }: { onOpen: (id: string) => void }) {
  const [items, setItems] = useState<TargetSummary[] | null>(null)
  useEffect(() => {
    let live = true
    api.listTargets().then(t => { if (live) setItems(t) }).catch(() => { if (live) setItems([]) })
    return () => { live = false }
  }, [])
  return (
    <section className="prep-jobs" aria-labelledby="prep-jobs">
      <h2 id="prep-jobs">Prepare for a specific job</h2>
      <p>Bring the job description. MIRROR lines it up with your résumé, suggests rounds, and you can add the ones the company told you about.</p>
      <ul className="prep-grid">
        <li>
          <FolderCard tint={0} label="Your job" title="Bring a job" name="Bring your own job" pill="New" lines={['Paste the job description', 'Your résumé is matched to it', 'Get rounds to practise']} onOpen={() => onOpen('new')} action="Start" />
        </li>
        {items?.map((t, i) => (
          <li key={t.id}>
            <FolderCard tint={i + 1} label={t.company} title={t.role} name={t.company} pill={t.status === 'ready' ? 'Understood' : 'Reading the role'} summary={t.role} onOpen={() => onOpen(t.id)} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Picker({ onPick, onOpenJob }: { onPick: (r: PrepRole) => void; onOpenJob?: (id: string | null) => void }) {
  return (
    <>
      <div className="page-title"><div><p className="eyebrow">Interview Prep</p><h1>Pick the role you are preparing for</h1><p>Every round of the loop is a live mock interview. An interviewer asks, listens and follows up. Nothing is graded.</p></div></div>
      <ul className="prep-grid">
        {PREP_ROLES.map((r, i) => (
          <li key={r.slug}>
            <FolderCard tint={i} label="Interview loop" title={r.title} name={r.title} pill={`${r.rounds.length} rounds`} lines={r.rounds.slice(0, 3).map(x => x.name)} onOpen={() => onPick(r)} />
          </li>
        ))}
      </ul>
      {onOpenJob && <Jobs onOpen={onOpenJob} />}
    </>
  )
}

function RoleView({ role, onChange, onStart }: { role: PrepRole; onChange: () => void; onStart: Start }) {
  const [done, setDone] = useState<string[]>(() => load(role.slug))
  const count = (ri: number) => done.filter(d => d.startsWith(`${ri}-`)).length
  const begin = (ri: number, speak: boolean) => {
    const round = role.rounds[ri]
    // Open with the first question of this round you have not been asked yet, then start over once all ten are used.
    const qi = Math.max(0, round.questions.findIndex((_, i) => !done.includes(`${ri}-${i}`)))
    const next = qi === 0 && count(ri) >= round.questions.length ? done.filter(d => !d.startsWith(`${ri}-`)) : done
    const marked = [...next, `${ri}-${qi}`]
    setDone(marked); keep(role.slug, marked)
    onStart(`${role.title} · ${round.name}`.slice(0, 120), round.questions[qi], speak)
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Interview Prep</p>
          <h1>{role.title}</h1>
          <p>{role.rounds.length} rounds. Pick one to start a live mock interview for it.</p>
        </div>
        <button type="button" className="m-btn m-btn--quiet" onClick={onChange}>Change role</button>
      </div>
      <ul className="prep-grid">
        {role.rounds.map((r, ri) => (
          <li key={r.name}>
            <FolderCard
              tint={ri} label={role.title} title={r.name} name={r.name} headingId={`prep-r${ri}`} pill={`Round ${ri + 1}`}
              summary={firstSentence(r.tests)}
              lines={['A live interviewer, spoken or typed', `${r.questions.length} questions, a fresh one each time`, count(ri) ? `${count(ri)} asked so far` : 'Not started yet']}
              footer={
                <>
                  <button type="button" className="prep-go" onClick={() => begin(ri, true)}>Start interview <ArrowRight size={18} aria-hidden="true" /></button>
                  <button type="button" className="prep-alt" onClick={() => begin(ri, false)}>Type instead</button>
                </>
              }
            >
              <details className="prep-list">
                <summary>See the questions</summary>
                <ol>{r.questions.map(q => <li key={q}>{q}</li>)}</ol>
              </details>
            </FolderCard>
          </li>
        ))}
      </ul>
    </>
  )
}
