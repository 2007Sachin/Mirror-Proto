import { useEffect, useState } from 'react'
import { useInView, usePrefersReducedMotion } from './motion'

export type Pair = { readonly first: string; readonly again: string; readonly changed: readonly string[] }

const STEP_MS = 170

/**
 * An ordinary sentence that re-forms, word by word and in place, into the clearer one.
 * `run` starts it; `loop` repeats it between pairs (only while in view). With reduced motion both
 * sentences are shown statically, before and after.
 */
export default function Reforming({
  pairs,
  run = true,
  loop = false,
  showChanged = true,
  changedLabel,
}: {
  pairs: readonly Pair[]
  run?: boolean
  loop?: boolean
  showChanged?: boolean
  changedLabel: string
}) {
  const reduced = usePrefersReducedMotion()
  const [ref, inView] = useInView<HTMLDivElement>(0.3)
  const [idx, setIdx] = useState(0)
  const [k, setK] = useState(-1) // -1: the first sentence; n-1: fully re-formed
  const pair = pairs[idx % pairs.length]
  const a = pair.first.split(' ')
  const b = pair.again.split(' ')
  const active = !reduced && run && (!loop || inView)

  useEffect(() => {
    if (!active) return
    let t: number
    if (k < b.length - 1) t = window.setTimeout(() => setK(k + 1), k < 0 ? 900 : STEP_MS)
    else if (loop) {
      t = window.setTimeout(() => {
        setK(-1)
        setIdx(idx + 1)
      }, 3600)
    } else return
    return () => window.clearTimeout(t)
  }, [active, k, b.length, loop, idx])

  const changed = (
    <div className="rf-changed">
      <h3>{changedLabel}</h3>
      <ul>{pair.changed.map(c => <li key={c}>{c}</li>)}</ul>
    </div>
  )

  if (reduced && (loop || run)) {
    return (
      <div ref={ref} className="rf rf-static">
        <p className="rf-before">{pair.first}</p>
        <p className="rf-after">{pair.again}</p>
        {showChanged && changed}
      </div>
    )
  }

  const slots = Math.max(a.length, b.length)
  const done = k >= b.length - 1
  return (
    <div ref={ref} className="rf">
      <p className="rf-line" aria-live={loop ? 'off' : 'polite'}>
        {Array.from({ length: slots }, (_, i) => {
          const fromAgain = done || i <= k
          const w = fromAgain ? b[i] : a[i]
          if (w === undefined) return null
          return <span key={`${idx}-${i}-${fromAgain ? 'b' : 'a'}`} className={fromAgain ? 'rf-w rf-new' : 'rf-w'}>{w} </span>
        })}
      </p>
      {showChanged && done && changed}
    </div>
  )
}
