import { useEffect, useState } from 'react'
import DotOrb from './DotOrb'

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface LiveOrbProps {
  state?: OrbState
  compact?: boolean
  label?: string
  /** Real input (mic) activity 0..1. Falls back to simulated activity when omitted. */
  inputLevel?: number
  /** Real output (TTS) activity 0..1. Falls back to simulated activity when omitted. */
  outputLevel?: number
}

export function LiveOrb({ state = 'idle', compact = false, label, inputLevel, outputLevel }: LiveOrbProps) {
  const [activity, setActivity] = useState(.28)
  useEffect(() => {
    if (state !== 'listening' && state !== 'speaking') return
    const tick = () => setActivity(.4 + Math.random() * .2)
    tick()
    const interval = window.setInterval(tick, 700)
    return () => window.clearInterval(interval)
  }, [state])

  const live = state === 'listening' ? inputLevel : state === 'speaking' ? outputLevel : undefined
  const talking = state === 'listening' || state === 'speaking'
  const level = talking ? (live ?? activity) : 0
  // The orb breathes with the voice: bigger while someone is talking.
  const scale = state === 'thinking' ? 1.02 : 1 + level * .025
  // How lively the swirl is. While MIRROR speaks it never drops below a visible floor, so it always moves; thinking is a steady slow swirl.
  const energy = state === 'speaking' ? Math.max(.4, level * .8) : state === 'listening' ? .15 + level * .5 : state === 'thinking' ? .3 : .1

  return <div className={`orb-wrap ${compact ? 'orb-wrap--compact' : ''} orb--${state}`} role="img" aria-label={label || `MIRROR orb, ${state}`}>
    <div style={{ width: '100%', height: '100%', color: 'var(--p-ink, #111)', transform: `scale(${scale})`, transition: 'transform .16s ease-out' }}><DotOrb energy={energy} /></div>
  </div>
}
