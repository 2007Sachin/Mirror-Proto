import type { SessionState } from '../features/auth/useSession'
import '../styles/app-shell.css'

/** The sidebar footer opens this. It shows the account that is signed in. It does not invent a profile. */
export default function Account({ session, role, onSettings }: {
  session: SessionState
  role: string
  onSettings: () => void
}) {
  const email = session.status === 'signedIn' ? session.user.email : null
  const name = email ?? 'Demo account'
  return (
    <div className="workspace-content">
      <div className="page-title">
        <div>
          <p className="eyebrow">Account</p>
          <h1>{name}</h1>
          <p>{email ? 'Signed in. Your practice stays on this account.' : 'A demo on this browser. It is not saved to an account.'}</p>
        </div>
      </div>
      <div className="set-layout"><nav className="set-subnav" aria-label="Account sections"><a href="#acct-h" aria-current="true" onClick={e => { e.preventDefault(); document.getElementById('acct-h')?.scrollIntoView() }}>This account</a><a href="/settings" onClick={e => { e.preventDefault(); onSettings() }}>Settings</a></nav>
      <div className="set-body"><section className="m-card" aria-labelledby="acct-h">
        <h2 id="acct-h">This account</h2>
        <p className="m-quiet">{role ? `You are preparing as ${role}.` : 'You have not named a direction yet.'}</p>
        <p className="m-quiet">Interview answers live under Sessions. Stories live under Stories. Roles live under Targets. Settings is where you export or delete what MIRROR stores.</p>
        <button type="button" className="m-btn" onClick={onSettings}>Open Settings</button>
      </section></div></div>
    </div>
  )
}
