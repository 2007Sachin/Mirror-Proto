import { useEffect, useState } from 'react'
import { Orb } from 'orb-ui'

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface LiveOrbProps {
  state?: OrbState
  compact?: boolean
  label?: string
  /** Real input (mic) activity 0..1 — modulates signal.inputVolume. Falls back to simulated activity when omitted. */
  inputLevel?: number
  /** Real output (TTS) activity 0..1 — modulates signal.outputVolume. Falls back to simulated activity when omitted. */
  outputLevel?: number
}

export function LiveOrb({ state = 'idle', compact = false, label, inputLevel, outputLevel }: LiveOrbProps) {
  const [activity, setActivity] = useState(.28)
  useEffect(() => {
    if (state === 'idle' || state === 'thinking') { setActivity(state === 'thinking' ? .32 : .16); return }
    const tick = () => setActivity(.35 + Math.random() * .45)
    tick()
    const interval = window.setInterval(tick, 160)
    return () => window.clearInterval(interval)
  }, [state])

  const hasLiveLevels = inputLevel !== undefined || outputLevel !== undefined
  const inputVolume = state === 'listening'
    ? (hasLiveLevels ? (inputLevel ?? 0) : activity)
    : 0
  const outputVolume = state === 'speaking'
    ? (hasLiveLevels ? (outputLevel ?? 0) : activity)
    : 0

  return <div className={`orb-wrap ${compact ? 'orb-wrap--compact' : ''} orb--${state}`} role="img" aria-label={label || `MIRROR orb, ${state}`}>
    <Orb
      signal={{ state: state === 'idle' ? 'thinking' : state, inputVolume, outputVolume }}
      theme={{ name: 'cloud', preset: 'calm', appearance: {
        deepColor: '#121936', upperColor: '#637df4', lowerColor: '#c3e5ff', highlightColor: '#eef7ff',
      }, geometry: { diameterRatio: .72, listeningMinScale: .82, speakingMaxScale: 1.08 }, motion: { idleSpeed: .16, stateTransitionMs: 650 } }}
      interactive={false}
      style={{ '--orb-ui-size': '100%' }}
      aria-label={label || `MIRROR is ${state}`}
    />
    <span className="orb-specular" />
  </div>
}
