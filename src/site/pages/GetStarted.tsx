import { useEffect, useId, useState, type FormEvent } from 'react'
import SiteLayout from '../SiteLayout'
import { useSite } from '../SiteContext'
import { MeshGradient } from '../MeshGradient'
import { Button } from '../ui'
import { GET_STARTED as G } from '../copy/get-started'
import './get-started.css'

/** True from 992px up. The mesh gradient is desktop only: no WebGL work on phones and tablets. */
function useDesktop(): boolean {
  const q = '(min-width: 992px)'
  const [on, setOn] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const m = matchMedia(q)
    const f = () => setOn(m.matches)
    m.addEventListener('change', f)
    f()
    return () => m.removeEventListener('change', f)
  }, [])
  return on
}

export default function GetStarted() {
  const { onTry } = useSite()
  const desktop = useDesktop()
  const uid = useId()
  const [done, setDone] = useState(false)
  const [error, setError] = useState(false)

  // TODO(backend): this form is a preview and sends NOTHING (no fetch, no beacon, no storage). When a real backend exists,
  // POST the three fields from here (keys server-side, a table with row-level security) and add a real consent line.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim()
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError(true); return }
    setError(false)
    setDone(true)
  }

  return (
    <SiteLayout title="Get started" cta={false} footer={false} split>
      <div className="ms-split">
        <div className="ms-split__left">
          {desktop && <MeshGradient colors={['#e8400d', '#ffeed8', '#d0b2ff']} ground="#111111" />}
          <div>
            <div className="ms-phero__eyebrow" style={{ color: '#fff' }}><i />{G.eyebrow}</div>
            <h1 className="ms-h1--md" style={{ color: '#fff' }}>{G.h1}</h1>
            <div className="ms-split__list">{G.list.map(t => <span key={t}>✓ {t}</span>)}</div>
          </div>
          <div>
            {/* TODO(placeholder): real, permitted quote, name and partner wordmarks */}
            <p className="ms-split__quote">{G.quote}</p>
            <div className="ms-gs-who"><span className="ms-avatar" aria-hidden="true" />{G.who}<span className="ms-gs-sample">{G.sampleTag}</span></div>
            <div className="ms-mini-logos ms-gs-logos">{G.logos.map(l => <span key={l}>{l}</span>)}</div>
          </div>
        </div>
        <div className="ms-split__right">
          {done ? (
            <div className="ms-gs-done" role="status">
              <h2>{G.doneTitle}</h2>
              <p>{G.doneText}</p>
              <div className="ms-gs-done__actions">
                <Button onClick={onTry}>{G.doneCta}</Button>
                <Button variant="secondary" onClick={() => setDone(false)}>{G.doneBack}</Button>
              </div>
            </div>
          ) : (
            <form className="ms-formcard" onSubmit={submit} noValidate>
              <h2>{G.formTitle}</h2>
              <label className="ms-field">{G.emailLabel}
                <input name="email" type="email" required placeholder={G.emailPlaceholder} autoComplete="email"
                  aria-invalid={error} aria-describedby={error ? `${uid}-err` : undefined} onChange={() => error && setError(false)} />
              </label>
              {error && <span id={`${uid}-err`} className="ms-gs-error" role="alert">{G.emailError}</span>}
              <label className="ms-field">{G.goalLabel}
                <select name="goal">{G.goals.map(g => <option key={g}>{g}</option>)}</select>
              </label>
              <label className="ms-field">{G.noteLabel}
                <textarea name="note" placeholder={G.notePlaceholder} />
              </label>
              <button type="submit" className="ms-btn ms-btn--primary">{G.submit}</button>
              <p className="ms-fine">{G.fine}</p>
            </form>
          )}
        </div>
      </div>
    </SiteLayout>
  )
}
