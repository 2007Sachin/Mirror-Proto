import { Component, lazy, Suspense, type ReactNode } from 'react'
import FluidOrb from './FluidOrb'

const HeroOrbCanvas = lazy(() => import('./HeroOrbCanvas'))

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function Fallback() {
  if (typeof document !== 'undefined' && !supportsWebGL()) {
    return <div className="ml-static-orb" aria-hidden="true" />
  }
  return <FluidOrb size={260} color="#1A73F2" aria-hidden="true" />
}

class OrbErrorBoundary extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onFail()
  }

  render() {
    if (this.state.failed) return <Fallback />
    return this.props.children
  }
}

export default function HeroOrb({
  reduced,
  failed,
  onFail,
}: {
  reduced: boolean
  failed: boolean
  onFail: () => void
}) {
  const live = !reduced && !failed && typeof document !== 'undefined' && supportsWebGL()

  if (!live) {
    return (
      <div className="ml-hero-fallback">
        <Fallback />
      </div>
    )
  }

  return (
    <OrbErrorBoundary onFail={onFail}>
      <Suspense
        fallback={
          <div className="ml-hero-fallback">
            <Fallback />
          </div>
        }
      >
        <HeroOrbCanvas onUnavailable={onFail} />
      </Suspense>
    </OrbErrorBoundary>
  )
}
