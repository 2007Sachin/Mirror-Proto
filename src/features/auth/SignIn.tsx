import { useId, useRef, useState, type FormEvent } from 'react'
import '../../landing.css'
import './auth.css'
import { ApiError, authApi } from '../../lib/api'

interface Props {
  googleEnabled: boolean
  /** Shown when the last attempt (an old or used link) did not work. */
  notice?: string | null
  onBack?: () => void
}

const messageFor = (e: unknown) =>
  e instanceof ApiError && e.status === 429
    ? 'Too many tries just now. Please wait a few minutes and try again.'
    : e instanceof ApiError && e.status === 400
      ? 'That email does not look right. Please check it.'
      : 'We could not send the link. Please try again.'

export default function SignIn({ googleEnabled, notice, onBack }: Props) {
  const id = useId()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    if (!address || busy) return
    setBusy(true); setError(null)
    try {
      await authApi.requestMagicLink(address)
      setSentTo(address)
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mirror-landing auth-screen">
      <main className="auth-card" aria-labelledby={`${id}-h`}>
        {sentTo ? (
          <>
            <h1 id={`${id}-h`}>Check your email</h1>
            <p role="status">We sent a sign-in link to <strong>{sentTo}</strong>. Open it on this device to come back here.</p>
            <button type="button" className="auth-link" onClick={() => { setSentTo(null); setTimeout(() => input.current?.focus(), 0) }}>Use a different email</button>
          </>
        ) : (
          <>
            <h1 id={`${id}-h`}>Sign in to MIRROR</h1>
            <p>We will email you a link. No password to remember.</p>
            {notice && <p className="auth-error" role="alert">{notice}</p>}
            <form onSubmit={submit} noValidate>
              <label htmlFor={`${id}-email`}>Email</label>
              <input
                id={`${id}-email`} ref={input} type="email" inputMode="email" autoComplete="email" autoFocus required
                value={email} onChange={e => setEmail(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined}
              />
              {error && <p id={`${id}-err`} className="auth-error" role="alert">{error}</p>}
              <button type="submit" className="auth-primary" disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Send me a link'}</button>
            </form>
            {googleEnabled && <a className="auth-secondary" href="/auth/google">Continue with Google</a>}
          </>
        )}
        {onBack && <button type="button" className="auth-link" onClick={onBack}>Back to the start</button>}
      </main>
    </div>
  )
}
