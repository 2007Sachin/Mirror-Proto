import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import './targets.css'
import FallbackNote from '../components/FallbackNote'
import MatchSection from '../features/match/MatchSection'
import { api, type Skill, type SkillArea, type Target, type TargetSummary } from '../lib/api'
import * as data from '../lib/data'
import { ArrowRight } from 'lucide-react'
import FolderCard from '../components/FolderCard'
import { rolesNeedStories, themeHint } from '../stories/bank'
import { canTalk, nextStart, roundOpener } from '../targets/roundOpener'
import ExtraRounds from '../targets/ExtraRounds'

/** A live practice round tied to one job: the opening question, voice or text, and the job it came from. */
export type PracticeOpts = { question?: string; speak?: boolean; targetId?: string }

// The SQL round (and sql.js with it) loads only when someone opens it.
const SqlRound = lazy(() => import('./target/SqlRound'))

const MIN_JD = 20
const MAX_JD = 20000
const AREAS: { id: SkillArea; label: string }[] = [
  { id: 'sql', label: 'SQL' }, { id: 'python', label: 'Python' }, { id: 'tools', label: 'Tools' },
  { id: 'analytics', label: 'Analytics' }, { id: 'behavioural', label: 'Behavioural' },
]

function daysUntil(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const today = new Date()
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000)
}
function when(date: string | null): string | null {
  if (!date) return null
  const n = daysUntil(date)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n > 1) return `in ${n} days`
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
function dayLabel(date: string | null): string | null {
  if (!date) return null
  const n = daysUntil(date)
  if (n < 0) return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  if (n === 0) return 'This is the day'
  if (n === 1) return 'Tomorrow'
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })
}
const time = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

export default function Targets({ openId, onOpen, onPractise, onPractiseProbe, onScreen, onAddStory }: {
  openId: string | null
  onOpen: (id: string | null) => void
  onPractise: (role: string, opts?: PracticeOpts) => void
  /** Optional: when given, each résumé probe question gets a prepare button. */
  onPractiseProbe?: (question: string) => void
  /** Starts a realistic screening call for this target. */
  onScreen?: (targetId: string) => void
  onAddStory?: (theme: string | null) => void
}) {
  return (
    <div className="targets">
      {openId ? <Mission key={openId} id={openId} onBack={() => onOpen(null)} onPractise={onPractise} onPractiseProbe={onPractiseProbe} onScreen={onScreen} onAddStory={onAddStory} /> : <List onOpen={onOpen} />}
    </div>
  )
}

function List({ onOpen }: { onOpen: (id: string | null) => void }) {
  const [items, setItems] = useState<TargetSummary[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    api.listTargets().then(t => { setItems(t); setLoadError(false) }).catch(() => { setItems([]); setLoadError(true) })
  }, [])
  useEffect(load, [load])

  return (
    <div className="tg-wrap">
      <header className="tg-top">
        <div>
          <p className="m-kicker">Roles</p>
          <h1>Roles you are preparing for</h1>
        </div>
        {!adding && <button type="button" className="m-btn" onClick={() => setAdding(true)}>Add a role</button>}
      </header>

      {adding && <AddForm onCancel={() => setAdding(false)} onCreated={onOpen} />}

      {loadError && (
        <p className="tg-note" role="alert">
          We could not load your roles. <button type="button" className="tg-link" onClick={load}>Try again</button>
        </p>
      )}

      {items === null && <p className="tg-note" role="status">Loading your roles…</p>}

      {items && items.length === 0 && !loadError && !adding && (
        <section className="m-card tg-empty">
          <h2>A role is a job you are preparing for.</h2>
          <p>Paste the job description. MIRROR reads what they ask for, lines it up with your résumé, and gives you a way to prepare.</p>
          <button type="button" className="m-btn" onClick={() => setAdding(true)}>Add a role</button>
        </section>
      )}

      {items && items.length > 0 && (
        <ul className="tg-list">
          {items.map((t, i) => (
            <li key={t.id}>
              <FolderCard
                tint={i} label="Target" title={t.company} name={t.company}
                pill={t.status === 'ready' ? 'Understood' : 'Reading the role'}
                summary={t.role}
                lines={when(t.interviewDate) ? [`Interview ${when(t.interviewDate)}`] : []}
                onOpen={() => onOpen(t.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AddForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [date, setDate] = useState('')
  const [jd, setJd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (inFlight.current) return
    const c = company.trim(), r = role.trim(), j = jd.trim()
    if (!c || !r) return setError('Add the company and the role.')
    if (j.length < MIN_JD) return setError(`Paste a little more of the job description. It needs at least ${MIN_JD} characters.`)
    if (j.length > MAX_JD) return setError(`That is too long. Keep it under ${MAX_JD.toLocaleString()} characters.`)
    inFlight.current = true
    setBusy(true); setError(null)
    try {
      const t = await api.createTarget({ company: c, role: r, jd: j, ...(date ? { interviewDate: date } : {}) })
      onCreated(t.id)
    } catch {
      setError('We could not save this role. Check your connection and try again.')
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <form className="m-card tg-form" onSubmit={e => void submit(e)} noValidate>
      <div className="tg-fields">
        <label>Company<input value={company} maxLength={120} onChange={e => setCompany(e.target.value)} autoComplete="organization" autoFocus /></label>
        <label>Role<input value={role} maxLength={120} onChange={e => setRole(e.target.value)} /></label>
        <label>Interview date <span>(optional)</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      </div>
      <label>Job description
        <textarea value={jd} onChange={e => setJd(e.target.value)} rows={10} placeholder="Paste the whole posting here." />
      </label>
      <p className={`tg-count ${jd.trim().length > 0 && jd.trim().length < MIN_JD ? 'is-low' : ''}`}>{jd.trim().length > MAX_JD ? 'That is too long to save.' : jd.trim().length > 0 && jd.trim().length < MIN_JD ? 'Paste a little more of the posting.' : jd.trim().length >= MIN_JD ? 'That is enough to read.' : 'Paste the posting when you are ready.'}</p>
      {error && <p className="tg-error" role="alert">{error}</p>}
      <div className="tg-actions">
        <button type="submit" className="m-btn" disabled={busy}>{busy ? 'Saving…' : 'Save this role'}</button>
        <button type="button" className="m-btn m-btn--quiet" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  )
}

export function Mission({ id, onBack, onPractise, onPractiseProbe, onScreen, onAddStory }: { id: string; onBack: () => void; onPractise: (role: string, opts?: PracticeOpts) => void; onPractiseProbe?: (question: string) => void; onScreen?: (targetId: string) => void; onAddStory?: (theme: string | null) => void }) {
  const [target, setTarget] = useState<Target | null>(null)
  const [failures, setFailures] = useState(0)
  const [sqlOpen, setSqlOpen] = useState(false)
  const [stage, setStage] = useState<'understand' | 'prepare' | 'day' | 'after' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const [tick, setTick] = useState(0) // bump to refetch now
  const refetch = useCallback(() => setTick(n => n + 1), [])
  const [storyRows, setStoryRows] = useState<{ title: string; themes: string[] }[]>([])
  useEffect(() => {
    let live = true
    data.stories.list().then(rows => { if (live) setStoryRows(rows) }).catch(() => { if (live) setStoryRows([]) })
    return () => { live = false }
  }, [id, tick])

  // ponytail: fixed 1s poll, no backoff; add one if the server ever needs it.
  // Poll once a second while Scout works; stop when ready or unmounted. A failed fetch just retries.
  useEffect(() => {
    let stop = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = () => {
      api.getTarget(id).then(t => {
        if (stop) return
        setTarget(t); setFailures(0)
        if (t.status === 'scouting') timer = setTimeout(run, 1000)
      }).catch(() => {
        if (stop) return
        setFailures(n => n + 1)
        timer = setTimeout(run, 1000)
      })
    }
    run()
    return () => { stop = true; clearTimeout(timer) }
  }, [id, tick])

  const remove = async () => {
    setDeleting(true); setDeleteError(false)
    try { await api.deleteTarget(id); onBack() } catch { setDeleting(false); setDeleteError(true) }
  }

  const back = <button type="button" className="tg-link tg-back" onClick={onBack}>All roles</button>

  if (!target) {
    return (
      <div className="tg-wrap">
        {back}
        {failures >= 3
          ? <p className="tg-note" role="alert">We cannot reach this role right now. We keep trying. <button type="button" className="tg-link" onClick={onBack}>Back to roles</button></p>
          : <p className="tg-note" role="status">Opening this role…</p>}
      </div>
    )
  }

  if (sqlOpen) {
    return (
      <Suspense fallback={<div className="tg-wrap">{back}<p className="tg-note" role="status">Getting the SQL round ready…</p></div>}>
        <SqlRound
          target={{ company: target.company, role: target.role }}
          onTurn={async attempt => (await api.sqlTurn(id, attempt)).followUp}
          onFinish={async attempts => { await api.sqlDebrief(id, { attempts }); refetch() }}
          onClose={() => { setSqlOpen(false); refetch() }}
        />
      </Suspense>
    )
  }

  const ready = target.status === 'ready'
  const day = dayLabel(target.interviewDate)
  const debriefs = [...target.debriefs].reverse()
  const need = rolesNeedStories([{ id, company: target.company, role: target.role, skills: target.skills }], storyRows)[0]
  const open = stage ?? (day === 'This is the day' ? 'day' : ready ? 'prepare' : 'understand')

  return (
    <div className="tg-wrap">
      <div className="page-title">
        <div>
          <p className="eyebrow">{target.company}</p>
          <h1>{target.role}</h1>
          {day && <p>{day}</p>}
        </div>
        <button type="button" className="m-btn m-btn--quiet" onClick={onBack}>All roles</button>
      </div>

      <ol className="tg-stages" aria-label="How you prepare for this role">
        {([
          ['understand', 'Understand'],
          ['prepare', 'Prepare'],
          ['day', 'Interview day'],
          ['after', 'Afterwards'],
        ] as const).map(([stageId, label]) => (
          <li key={stageId}><button type="button" className={open === stageId ? 'is-now' : ''} aria-current={open === stageId ? 'true' : undefined} onClick={() => setStage(stageId)}>{label}</button></li>
        ))}
      </ol>

      <p className="tg-muted" role="status">{ready ? 'The role has been read.' : 'Reading the job description.'}</p>
      {target.events.length > 0 && (
        <details className="tg-feed-details">
          <summary>What has been read</summary>
          <ol className="tg-feed" aria-live="polite">
            {target.events.map((e, i) => (
              <li key={`${e.at}-${i}`} className={i === target.events.length - 1 && !ready ? 'is-new' : ''}>
                <span className="tg-agent">{e.agent}</span>
                <span>{e.text}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
      {!ready && failures >= 3 && <p className="tg-muted" role="alert">Having trouble reaching the server. We keep trying.</p>}

      {open === 'understand' && <section className="m-card tg-card-body" aria-labelledby="tg-skills">
          <h2 id="tg-skills">Understand</h2>
          <p className="tg-muted">What the posting asks for, in their words, lined up with your résumé.</p>
          {target.skills.length === 0 && <p className="tg-muted">{ready ? 'We did not find specific skills in this description.' : 'Skills will appear here once the posting has been read.'}</p>}
          {AREAS.map(a => {
            const list = target.skills.filter((s: Skill) => s.area === a.id)
            return list.length === 0 ? null : (
              <div key={a.id} className="tg-area">
                <h3>{a.label}</h3>
                <ul>
                  {list.map(s => (
                    <li key={s.name}>
                      <span className="tg-skill"><b>{s.name}</b><span className={`m-chip tg-weight ${s.weight === 'core' ? 'is-core' : ''}`}>{s.weight === 'core' ? 'Core' : 'Useful'}</span></span>
                      <q>{s.quote}</q>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          <MatchSection targetId={id} onPractiseProbe={onPractiseProbe} />
        </section>}

        {open === 'prepare' && <section className="m-card tg-card-body" aria-labelledby="tg-prepare">
          <h2 id="tg-prepare">Prepare</h2>
          {target.nextStep && (
            <div className="tg-plan">
              <p className="tg-next">{target.nextStep}</p>
              <FallbackNote source={target.nextStepSource} />
            </div>
          )}
          <p>{themeHint(need.storyTitle, need.needs)}</p>
          {onAddStory && need.needsId && <button type="button" className="m-btn m-btn--quiet" onClick={() => onAddStory(need.needsId)}>Add that story</button>}
          <ul className="tg-round-grid">
            {target.rounds.map((r, i) => {
              // The SQL round keeps its own room. Behavioural, Python and tools open a live interview built from this job.
              const sql = r.kind === 'sql'
              const talk = !sql && canTalk(r.kind, target.skills)
              const begin = (speak: boolean) => {
                const { role, question } = roundOpener(r, target, nextStart(target.id, r.id))
                onPractise(role, { question, speak, targetId: target.id })
              }
              return (
                <li key={r.id}>
                  <FolderCard
                    tint={i} label={target.company} title={r.title} name={r.title} headingId={`tg-r-${r.id}`} level="h3"
                    pill={sql || talk ? `Round ${i + 1}` : 'Later'}
                    summary={r.why}
                    lines={sql
                      ? ['Write queries against a practice database', 'What worked and what to strengthen, afterwards']
                      : ['A live interviewer, spoken or typed', 'Questions come from this job’s skills']}
                    footer={sql && r.available
                      ? <button type="button" className="tg-go" onClick={() => setSqlOpen(true)}>Start round <ArrowRight size={18} aria-hidden="true" /></button>
                      : talk
                        ? <><button type="button" className="tg-go" onClick={() => begin(true)}>Start interview <ArrowRight size={18} aria-hidden="true" /></button><button type="button" className="tg-alt" onClick={() => begin(false)}>Type instead</button></>
                        : undefined}
                  />
                </li>
              )
            })}
            {onScreen && (
              <li>
                <FolderCard
                  tint={target.rounds.length} label={target.company} title="Screening call" name="Rehearse a screening call" headingId="tg-r-screen" level="h3"
                  pill="Call" summary="A short call with questions from this job. No hints. It ends on its own."
                  lines={target.skills.length === 0 ? ['There is nothing to ask about until the posting has been read.'] : undefined}
                  footer={<button type="button" className="tg-go" disabled={!ready || target.skills.length === 0} onClick={() => onScreen(target.id)}>Start the call <ArrowRight size={18} aria-hidden="true" /></button>}
                />
              </li>
            )}
          </ul>
          {ready && <ExtraRounds target={target} firstTint={target.rounds.length + 1} onPractise={onPractise} />}
        </section>}

      {open === 'day' && <section className="m-card tg-card-body" aria-labelledby="tg-day">
        <h2 id="tg-day">Interview day</h2>
        <p>{day ?? 'No date yet. Add one and Briefing will keep the day in view.'}</p>
        {day === 'This is the day' && <p className="tg-muted">A short warm-up is enough. Leave the longer practice for another day.</p>}
      </section>}

      {open === 'after' && <section className="m-card tg-card-body" aria-labelledby="tg-after">
        <h2 id="tg-after">Afterwards</h2>
        {debriefs.length === 0 && <p className="tg-muted">After you practise a round, what worked and what to strengthen will sit here.</p>}
        {debriefs.length > 0 && (
          <ul className="tg-debriefs">
            {debriefs.map(d => (
              <li key={d.id}>
                <p className="tg-meta">{time(d.createdAt)} · SQL round</p>
                <p><b>What worked.</b> {d.wentWell}</p>
                <p><b>What to strengthen.</b> {d.keepWorkingOn}</p>
                <p><b>Next.</b> {d.suggestion}</p>
              </li>
            ))}
          </ul>
        )}
      </section>}

      <div className="tg-danger">
        {!confirmDelete
          ? <button type="button" className="tg-link" onClick={() => setConfirmDelete(true)}>Remove this role</button>
          : (
            <div role="group" aria-label="Confirm delete" className="tg-confirm">
              <span>Delete {target.company}? This cannot be undone.</span>
              <button type="button" className="m-btn m-btn--quiet" onClick={() => void remove()} disabled={deleting}>{deleting ? 'Deleting…' : 'Yes, delete'}</button>
              <button type="button" className="m-btn m-btn--quiet" onClick={() => setConfirmDelete(false)} disabled={deleting}>Keep it</button>
            </div>
          )}
        {deleteError && <p className="tg-error" role="alert">We could not delete it. Try again.</p>}
      </div>
    </div>
  )
}
