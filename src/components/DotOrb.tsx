import { useEffect, useRef } from 'react'

/**
 * MIRROR's orb: a sphere made of dots, tilted and turning, drawn on a 2D canvas (no library).
 * Colour comes from lighting: each dot is coloured by how much it faces a lamp at the upper left, through a dusk ramp. `energy` 0..1 is how alive it is: it swells, ripples and turns faster.
 * Under reduced motion it draws one still frame.
 */
const DOTS = 3400
const TILT = (22 * Math.PI) / 180
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

// Fibonacci sphere: evenly spread points, unit radius.
const POINTS = Array.from({ length: DOTS }, (_, i) => {
  const y = 1 - (i / (DOTS - 1)) * 2
  const r = Math.sqrt(1 - y * y)
  const a = i * GOLDEN
  return { x: Math.cos(a) * r, y, z: Math.sin(a) * r, seed: (i * 7919) % 97 / 97 }
})

// A lit sphere in dusk colours: shadow indigo, plum, ember, amber light. Brightness picks the colour, so it reads as one object under one lamp.
const STOPS: [number, [number, number, number]][] = [[0, [43, 33, 96]], [0.4, [138, 58, 122]], [0.72, [212, 105, 58]], [1, [255, 208, 138]]]
const RAMP = Array.from({ length: 256 }, (_, i) => {
  const t = i / 255
  let k = 1
  while (k < STOPS.length - 1 && t > STOPS[k][0]) k++
  const [t0, a] = STOPS[k - 1], [t1, b] = STOPS[k]
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))
  return [0, 1, 2].map(j => Math.round(a[j] + (b[j] - a[j]) * u))
})
const LIGHT = (() => { const v = [-0.55, -0.6, 0.58]; const n = Math.hypot(...v); return v.map(x => x / n) })()

export function DotOrb({ energy = 0, className }: { energy?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const target = useRef(energy)
  useEffect(() => { target.current = energy }, [energy])

  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let w = 0, h = 0, raf = 0, last = 0, spin = Math.random() * 6, pulse = 0, e = target.current
    let visible = true

    const size = () => {
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3) // always sharp: at least 2x
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const R = Math.min(w, h) * 0.46 * (1 + e * 0.015)
      const cx = w / 2, cy = h / 2
      const cs = Math.cos(spin), sn = Math.sin(spin), ct = Math.cos(TILT), st = Math.sin(TILT)
      const live = Math.min(1, e * 1.4)
      for (const p of POINTS) {
        // turn around the vertical axis, then tilt toward the viewer
        const x1 = p.x * cs + p.z * sn
        const z1 = -p.x * sn + p.z * cs
        const y2 = p.y * ct - z1 * st
        const z2 = p.y * st + z1 * ct
        // a slow ripple travels over the surface; it grows with energy
        const wave = 1 + Math.sin(p.y * 4 + pulse + p.seed * 1.2) * 0.012 * (0.5 + e * 1.1)
        const depth = (z2 + 1) / 2 // 0 far side, 1 near side
        const rr = R * wave
        const r = (0.5 + depth * 1.1) * (Math.min(w, h) / 560 + 0.3)
        const a = 0.1 + depth * 0.9
        // lamp from the upper left: how much this dot faces it, nudged brighter when the orb is lively
        const lit = (x1 * LIGHT[0] + y2 * LIGHT[1] + z2 * LIGHT[2] + 1) / 2
        const c = RAMP[Math.round(Math.min(1, Math.max(0, lit * 0.92 + live * 0.08 * (0.5 + p.seed * 0.5))) * 255)]
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(cx + x1 * rr, cy + y2 * rr, r, 0, 6.2832)
        ctx.fill()
      }
    }
    const loop = (now: number) => {
      const dt = Math.min(now - last, 64); last = now
      e += (target.current - e) * Math.min(1, dt / 900) // slow easing: it eases into a state, never jumps
      spin += dt * 0.0003 * (1 + e * 1.1)
      pulse += dt * 0.0012 * (1 + e * 1.2)
      draw()
      raf = requestAnimationFrame(loop)
    }
    const sync = () => {
      const run = visible && !document.hidden && !reduce
      if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(loop) }
      else if (!run && raf) { cancelAnimationFrame(raf); raf = 0 }
    }
    size(); draw()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { size(); draw() }) : null
    ro?.observe(cv)
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(en => { visible = en[en.length - 1].isIntersecting; sync() }) : null
    io?.observe(cv)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block' }} />
}

export default DotOrb
