import type { ReactNode } from 'react'
import SignIn from './SignIn'
import PageSkeleton from '../../ui/PageSkeleton'
import type { SessionState } from './useSession'

/** Children render only for a signed-in (or local demo) session; otherwise the calm sign-in screen. */
export default function AuthGate({ session, notice, onBack, children }: { session: SessionState; notice?: string | null; onBack?: () => void; children: ReactNode }) {
  if (session.status === 'loading') {
    // The same frame as the app, so the page does not jump when the session is known.
    return <div className="app workspace-app"><aside className="sidebar" aria-hidden="true" /><main className="workspace-main"><header className="workspace-header" /><PageSkeleton label="Loading" /></main></div>
  }
  if (session.status === 'signedOut') return <SignIn googleEnabled={session.providers.google} notice={notice} onBack={onBack} />
  return <>{children}</>
}
