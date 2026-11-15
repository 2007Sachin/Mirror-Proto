import { useEffect, useId, useRef, useState } from 'react'

interface Props {
  email: string | null
  onSignOut: () => void
}

/** The header avatar: opens a small menu with the signed-in email and Sign out. */
export default function AccountMenu({ email, onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [open])

  return (
    <div className="account-menu" ref={root}>
      <button className="avatar-button" aria-label="Account" aria-haspopup="true" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
        {(email ?? '?').charAt(0).toUpperCase()}
      </button>
      {open && (
        <div id={id} className="account-menu__panel" role="group" aria-label="Account">
          {email && <p className="account-menu__email">{email}</p>}
          <button type="button" className="account-menu__item" onClick={() => { setOpen(false); onSignOut() }}>Sign out</button>
        </div>
      )}
    </div>
  )
}
