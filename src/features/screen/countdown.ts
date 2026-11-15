// The call's clock. It counts from an absolute start time (so a reload does not reset it), the same way the mock test does.
import { useEffect, useRef, useState } from 'react'
import { makeClock, remainingMs } from '../../practice/sql/mock/mockLogic'

/** The calm line under the question: whole minutes, no seconds ticking. */
export function screenLine(ms: number): string {
  if (ms <= 0) return 'Time is up.'
  const m = Math.ceil(ms / 60000)
  return m <= 1 ? 'About a minute left.' : `About ${m} minutes left.`
}

/** Said only when the clock reaches 5, 2 and 1 minutes; otherwise null. */
export function screenMilestone(ms: number, totalMs: number): string | null {
  if (ms <= 0) return null
  for (const [m, text] of [[1, 'One minute left.'], [2, 'Two minutes left.'], [5, 'Five minutes left.']] as const) {
    if (ms <= m * 60000 && m * 60000 < totalMs) return text
  }
  return null
}

/** Remaining milliseconds, ticking each second; `onExpire` runs once when it reaches zero. Null when there is no clock. */
export function useScreenClock(startedAtMs: number | null, capSeconds: number | null, onExpire: () => void): number | null {
  const [now, setNow] = useState(() => Date.now())
  const expire = useRef(onExpire)
  useEffect(() => { expire.current = onExpire })
  useEffect(() => {
    if (startedAtMs === null) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [startedAtMs])

  const c = startedAtMs !== null && capSeconds !== null ? makeClock(capSeconds / 60, startedAtMs) : null
  const left = c ? remainingMs(c.startedAt, c.deadline, now) : null
  const over = left !== null && left <= 0
  useEffect(() => { if (over) expire.current() }, [over])
  return left
}
