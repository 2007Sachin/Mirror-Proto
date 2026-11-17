import { useState } from 'react'
import { request } from '../../lib/api'

/** One quiet question after a live call. The answer is sent once and nothing is shown back. */
export default function FollowedTap({ interviewId }: { interviewId: string }) {
  const [sent, setSent] = useState(false)
  const send = (followed: boolean) => {
    setSent(true)
    void request('/room/feedback', { method: 'POST', body: JSON.stringify({ interviewId, followed }) }).catch(() => {})
  }
  if (sent) return <p className="m-quiet" role="status">Thank you, that helps.</p>
  return (
    <div role="group" aria-label="About this call">
      <p className="m-quiet">Did it follow what you said?</p>
      <button type="button" className="m-btn m-btn--quiet" onClick={() => send(true)}>Yes</button>{' '}
      <button type="button" className="m-btn m-btn--quiet" onClick={() => send(false)}>Not really</button>
    </div>
  )
}
