import type { ReactNode } from 'react'
import SignIn from './SignIn'
import type { SessionState } from './useSession'

/** Children render only for a signed-in (or local demo) session; otherwise the calm sign-in screen. */
export default function AuthGate({ session, notice, onBack, children }: { session: SessionState; notice?: string | null; onBack?: () => void; children: ReactNode }) {
  if (session.status === 'loading') {
    return <div className="mirror-landing auth-screen"><p className="auth-wait" role="status">One moment…</p></div>
  }
  if (session.status === 'signedOut') return <SignIn googleEnabled={session.providers.google} notice={notice} onBack={onBack} />
  return <>{children}</>
}
