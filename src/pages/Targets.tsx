import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import '../landing.css'
import './targets.css'
import FallbackNote from '../components/FallbackNote'
import MatchSection from '../features/match/MatchSection'
import { api, type Skill, type SkillArea, type Target, type TargetSummary } from '../lib/api'

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
function countdown(date: string | null): string | null {
  if (!date) return null
  const n = daysUntil(date)
  if (n < 0) return null
  return n === 0 ? 'Interview is today' : n === 1 ? '1 day to go' : `${n} days to go`
}
const time = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

export default function Targets({ openId, onOpen, onPractise, onPractiseProbe }: {
  openId: string | null
  onOpen: (id: string | null) => void
  onPractise: (role: string) => void
  /** Optional: when given, each résumé probe question gets a "Practise this question" button. */
  onPractiseProbe?: (question: string) => void
}) {
  return (
    <div className="mirror-landing targets">
      {openId ? <Mission key={openId} id={openId} onBack={() => onOpen(null)} onPractise={onPractise} onPractiseProbe={onPractiseProbe} /> : <List onOpen={onOpen} />}
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
          <p className="ml-eyebrow">Your targets</p>
          <h1>Where you are headed</h1>
        </div>
        {!adding && <button type="button" className="ml-btn ml-btn--sm" onClick={() => setAdding(true)}>Add a target</button>}
      </header>

      {adding && <AddForm onCancel={() => setAdding(false)} onCreated={onOpen} />}

      {loadError && (
        <p className="tg-note" role="alert">
          We could not load your targets. <button type="button" className="tg-link" onClick={load}>Try again</button>
        </p>
      )}

      {items === null && <p className="tg-note" role="status">Loading your targets…</p>}

      {items && items.length === 0 && !loadError && !adding && (
        <section className="ml-glass tg-empty">
          <h2>A target is a job you want.</h2>
          <p>Paste its job description and we will work out what they look for and plan your practice. Then you rehearse the rounds before the real thing.</p>
          <button type="button" className="ml-btn ml-btn--sm" onClick={() => setAdding(true)}>Add your first target</button>
        </section>
      )}

      {items && items.length > 0 && (
        <ul className="tg-list">
          {items.map(t => (
            <li key={t.id}>
              <button type="button" className="ml-glass tg-card" onClick={() => onOpen(t.id)}>
                <span className="tg-card-main">
                  <b>{t.company}</b>
                  <span>{t.role}</span>
                  {when(t.interviewDate) && <small>Interview {when(t.interviewDate)}</small>}
                </span>
                <span className={`ml-chip tg-status ${t.status === 'ready' ? 'is-ready' : ''}`}>{t.status === 'ready' ? 'Ready' : 'Scouting…'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AddForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
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
      setError('We could not create the target. Check your connection and try again.')
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <form className="ml-glass tg-form" onSubmit={e => void submit(e)} noValidate>
      <div className="tg-fields">
        <label>Company<input value={company} maxLength={120} onChange={e => setCompany(e.target.value)} autoComplete="organization" autoFocus /></label>
        <label>Role<input value={role} maxLength={120} onChange={e => setRole(e.target.value)} /></label>
        <label>Interview date <span>(optional)</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      </div>
      <label>Job description
        <textarea value={jd} onChange={e => setJd(e.target.value)} rows={10} placeholder="Paste the whole posting here." />
      </label>
      <p className={`tg-count ${jd.trim().length > 0 && jd.trim().length < MIN_JD ? 'is-low' : ''}`}>{jd.length.toLocaleString()} / {MAX_JD.toLocaleString()} characters</p>
      {error && <p className="tg-error" role="alert">{error}</p>}
      <div className="tg-actions">
        <button type="submit" className="ml-btn ml-btn--sm" disabled={busy}>{busy ? 'Creating…' : 'Create target'}</button>
        <button type="button" className="ml-btn ml-btn--sm ml-btn--quiet" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  )
}

function Mission({ id, onBack, onPractise, onPractiseProbe }: { id: string; onBack: () => void; onPractise: (role: string) => void; onPractiseProbe?: (question: string) => void }) {
  const [target, setTarget] = useState<Target | null>(null)
  const [failures, setFailures] = useState(0)
  const [sqlOpen, setSqlOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const [tick, setTick] = useState(0) // bump to refetch now
  const refetch = useCallback(() => setTick(n => n + 1), [])

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

  const back = <button type="button" className="tg-link tg-back" onClick={onBack}>← All targets</button>

  if (!target) {
    return (
      <div className="tg-wrap">
        {back}
        {failures >= 3
          ? <p className="tg-note" role="alert">We cannot reach this target right now. We keep trying. <button type="button" className="tg-link" onClick={onBack}>Back to targets</button></p>
          : <p className="tg-note" role="status">Opening your target…</p>}
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
  const left = countdown(target.interviewDate)
  const debriefs = [...target.debriefs].reverse()

  return (
    <div className="tg-wrap">
      {back}
      <header className="tg-top">
        <div>
          <p className="ml-eyebrow">{target.company}</p>
          <h1>{target.role}</h1>
        </div>
        {left && <span className="ml-chip tg-days">{left}</span>}
      </header>

      <section className="ml-glass tg-card-body" aria-labelledby="tg-live">
        <h2 id="tg-live">{ready ? 'What we did' : 'Working on it'}</h2>
        {target.events.length === 0
          ? <p className="tg-muted" role="status">Scout is getting started…</p>
          : (
            <ol className="tg-feed" aria-live="polite">
              {target.events.map((e, i) => (
                <li key={`${e.at}-${i}`} className={i === target.events.length - 1 && !ready ? 'is-new' : ''}>
                  <span className="tg-agent">{e.agent}</span>
                  <span>{e.text}</span>
                </li>
              ))}
            </ol>
          )}
        {!ready && failures >= 3 && <p className="tg-muted" role="alert">Having trouble reaching the server. We keep trying.</p>}
      </section>

      {ready && (
        <>
          {target.nextStep && (
            <section className="ml-glass tg-card-body tg-plan">
              <p className="ml-eyebrow">The Planner&rsquo;s plan</p>
              <p className="tg-next">{target.nextStep}</p>
              <FallbackNote source={target.nextStepSource} />
            </section>
          )}

          <section className="ml-glass tg-card-body" aria-labelledby="tg-skills">
            <h2 id="tg-skills">What they&rsquo;ll look for</h2>
            {target.skills.length === 0 && <p className="tg-muted">We did not find specific skills in this description.</p>}
            {AREAS.map(a => {
              const list = target.skills.filter((s: Skill) => s.area === a.id)
              return list.length === 0 ? null : (
                <div key={a.id} className="tg-area">
                  <h3>{a.label}</h3>
                  <ul>
                    {list.map(s => (
                      <li key={s.name}>
                        <span className="tg-skill"><b>{s.name}</b><span className={`ml-chip tg-weight ${s.weight === 'core' ? 'is-core' : ''}`}>{s.weight === 'core' ? 'Core' : 'Nice to have'}</span></span>
                        <q>{s.quote}</q>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </section>

          <MatchSection targetId={id} onPractiseProbe={onPractiseProbe} />

          <section className="ml-glass tg-card-body" aria-labelledby="tg-rounds">
            <h2 id="tg-rounds">Rounds to practise</h2>
            <ul className="tg-rounds">
              {target.rounds.map(r => (
                <li key={r.id}>
                  <div><b>{r.title}</b><p>{r.why}</p></div>
                  {r.available
                    ? <button type="button" className="ml-btn ml-btn--sm" onClick={() => (r.kind === 'sql' ? setSqlOpen(true) : onPractise(target.role))}>Start</button>
                    : <span className="ml-chip tg-next-chip">Next</span>}
                </li>
              ))}
            </ul>
          </section>

          {debriefs.length > 0 && (
            <section className="ml-glass tg-card-body" aria-labelledby="tg-debriefs">
              <h2 id="tg-debriefs">How it went</h2>
              <ul className="tg-debriefs">
                {debriefs.map(d => (
                  <li key={d.id}>
                    <p className="tg-meta">{time(d.createdAt)} · SQL round · solved {d.solved} of {d.total} {d.total === 1 ? 'problem' : 'problems'}</p>
                    <p><b>Went well.</b> {d.wentWell}</p>
                    <p><b>Keep working on.</b> {d.keepWorkingOn}</p>
                    <p><b>Suggestion.</b> {d.suggestion}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <div className="tg-danger">
        {!confirmDelete
          ? <button type="button" className="tg-link" onClick={() => setConfirmDelete(true)}>Delete this target</button>
          : (
            <div role="group" aria-label="Confirm delete" className="tg-confirm">
              <span>Delete {target.company}? This cannot be undone.</span>
              <button type="button" className="ml-btn ml-btn--sm" onClick={() => void remove()} disabled={deleting}>{deleting ? 'Deleting…' : 'Yes, delete'}</button>
              <button type="button" className="ml-btn ml-btn--sm ml-btn--quiet" onClick={() => setConfirmDelete(false)} disabled={deleting}>Keep it</button>
            </div>
          )}
        {deleteError && <p className="tg-error" role="alert">We could not delete it. Try again.</p>}
      </div>
    </div>
  )
}
