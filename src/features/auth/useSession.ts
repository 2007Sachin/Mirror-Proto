import { useCallback, useEffect, useState } from 'react'
import { authApi, type Providers } from '../../lib/api'
import { setUser } from '../../lib/data'

export type SessionState =
  | { status: 'loading'; providers: Providers }
  | { status: 'signedOut'; providers: Providers; failed?: boolean }
  | { status: 'signedIn'; providers: Providers; user: { id: string; email: string | null } }
  | { status: 'demo'; providers: Providers }

const none: Providers = { google: false }

/** Asks the server who is signed in. A `mirror:unauthenticated` event (any 401) returns to signed out. */
export function useSession(): SessionState & { refresh: () => void; clear: () => void } {
  const [state, setState] = useState<SessionState>({ status: 'loading', providers: none })

  const refresh = useCallback(() => {
    authApi.getSession().then(
      ({ session, providers }) => {
        if (!session) { setUser(null); setState({ status: 'signedOut', providers }) }
        else if ('demo' in session) { setUser('demo'); setState({ status: 'demo', providers }) }
        else { setUser(session.user.id); setState({ status: 'signedIn', providers, user: session.user }) }
      },
      () => { setUser(null); setState({ status: 'signedOut', providers: none, failed: true }) },
    )
  }, [])

  const clear = useCallback(() => { setUser(null); setState(s => ({ status: 'signedOut', providers: s.providers })) }, [])

  useEffect(() => {
    refresh()
    const onLost = () => clear()
    window.addEventListener('mirror:unauthenticated', onLost)
    return () => window.removeEventListener('mirror:unauthenticated', onLost)
  }, [refresh, clear])

  return { ...state, refresh, clear }
}
