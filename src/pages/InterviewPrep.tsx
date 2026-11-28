import { useEffect, useState } from 'react'
import PageSkeleton from '../ui/PageSkeleton'
import { ArrowRight } from 'lucide-react'
import './interviewPrep.css'
import FolderCard from '../components/FolderCard'
import { api, type TargetSummary } from '../lib/api'
import { AddForm, Mission, type PracticeOpts } from './Targets'
import { PREP_ROLES, firstSentence, type PrepRole } from '../prep/roles'
import { isWeak, loadWeakSpots, saveWeakSpots, toggleWeak, weakCount, weakForRole } from '../prep/weakSpots'
import { buildPlan, isoToday, loadPlanDate, readinessLine, savePlanDate } from '../prep/plan'

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
            <h1>Your target job</h1>
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
          <FolderCard tint={0} label="Custom prep" title="Your target job" name="Your target job" pill="New" lines={['Paste the job description', 'Matched to your résumé', 'Rounds built for this role']} onOpen={() => onOpen('new')} action="Start" />
        </li>
        {items === null && <li><PageSkeleton label="Loading your jobs" rows={2} /></li>}
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
      <div className="page-title"><div><p className="eyebrow">Interview Prep</p><h1>Pick the role you are preparing for</h1><p>Every round of the loop is a live mock interview. An interviewer asks, listens and follows up. No numbers and no pass or fail: you get clear levels and the lines behind them.</p></div></div>
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

const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

/** Interview date for this role, kept in this browser only, and what to practise today and over the next days. */
function PlanCard({ role }: { role: PrepRole }) {
  const [date, setDate] = useState(() => loadPlanDate(role.slug) ?? '')
  const today = isoToday()
  const plan = buildPlan(role.rounds.length, date || null, today)
  const change = (v: string) => { setDate(v); savePlanDate(role.slug, v || null) }
  const name = (ri: number | null) => (ri === null ? 'Revisit your weak spots' : `Round ${ri + 1} – ${role.rounds[ri].name}`)
  return (
    <section className="prep-plan" aria-label="Your interview plan">
      <label className="prep-plan-date">Interview date <span>(optional, kept on this device)</span>
        <input type="date" value={date} min={today} onChange={e => change(e.target.value)} />
      </label>
      {plan.status === 'none' && <p className="prep-plan-note">{date ? 'That is not a date we can read. Pick it again.' : 'Add your interview date to get a day-by-day plan.'}</p>}
      {plan.status === 'past' && <p className="prep-plan-note" role="status">That date has passed. Pick a new one to get a plan.</p>}
      {plan.status === 'ready' && (
        <>
          <p className="prep-plan-today"><strong>Today: {name(plan.days[0].round)}</strong></p>
          <p className="prep-plan-note" role="status">{plan.daysToGo === 0 ? 'Your interview is today' : `${plan.daysToGo} ${plan.daysToGo === 1 ? 'day' : 'days'} to go`}</p>
          {plan.days.length > 1 && (
            <ol className="prep-plan-next" aria-label="Next days">
              {plan.days.slice(1, 4).map(d => <li key={d.date}><span>{dayLabel(d.date)}</span> {name(d.round)}</li>)}
            </ol>
          )}
        </>
      )}
    </section>
  )
}

function RoleView({ role, onChange, onStart }: { role: PrepRole; onChange: () => void; onStart: Start }) {
  const [done, setDone] = useState<string[]>(() => load(role.slug))
  // Questions you flagged "needs more work", kept in this browser only.
  const [weak, setWeak] = useState(loadWeakSpots)
  const flag = (ri: number, qi: number) => setWeak(w => { const n = toggleWeak(w, { role: role.slug, round: ri, question: qi }); saveWeakSpots(n); return n })
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
          <p className="prep-ready">{readinessLine(role.rounds.filter((_, ri) => count(ri) > 0).length, role.rounds.length, weakForRole(weak, role.slug).length)}</p>
        </div>
        <button type="button" className="m-btn m-btn--quiet" onClick={onChange}>Change role</button>
      </div>
      <PlanCard role={role} />
      <ul className="prep-grid">
        {role.rounds.map((r, ri) => (
          <li key={r.name}>
            <FolderCard
              tint={ri} label={role.title} title={r.name} name={r.name} headingId={`prep-r${ri}`} pill={`Round ${ri + 1}`}
              summary={firstSentence(r.tests)}
              lines={['A live interviewer, spoken or typed', `${r.questions.length} questions, a fresh one each time`, count(ri) ? `${count(ri)} asked so far` : 'Not started yet', ...(weakCount(weak, role.slug, ri) ? [`Revisit these: ${weakCount(weak, role.slug, ri)}`] : [])]}
              footer={
                <>
                  <button type="button" className="prep-go" onClick={() => begin(ri, true)}>Start interview <ArrowRight size={18} aria-hidden="true" /></button>
                  <button type="button" className="prep-alt" onClick={() => begin(ri, false)}>Type instead</button>
                </>
              }
            >
              <details className="prep-list">
                <summary>See the questions</summary>
                <ol>{r.questions.map((q, qi) => {
                  const on = isWeak(weak, { role: role.slug, round: ri, question: qi })
                  return <li key={q}><span>{q}</span><button type="button" className="prep-alt prep-flag" aria-pressed={on} onClick={() => flag(ri, qi)}>{on ? 'Needs more work ✓' : 'Needs more work'}</button></li>
                })}</ol>
              </details>
            </FolderCard>
          </li>
        ))}
      </ul>
    </>
  )
}
