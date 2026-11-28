import { useEffect, useRef } from 'react'

/**
 * MIRROR's orb: a sphere made of dots, tilted and turning, drawn on a 2D canvas (no library).
 * It takes its colour from the surrounding text colour, so it is ink on paper, not a gradient. A touch of the site's violet
 * shows on the near side when it is lively. `energy` 0..1 is how alive it is: it swells, ripples and turns faster.
 * Under reduced motion it draws one still frame.
 */
const DOTS = 1100
const TILT = (22 * Math.PI) / 180
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

// Fibonacci sphere: evenly spread points, unit radius.
const POINTS = Array.from({ length: DOTS }, (_, i) => {
  const y = 1 - (i / (DOTS - 1)) * 2
  const r = Math.sqrt(1 - y * y)
  const a = i * GOLDEN
  return { x: Math.cos(a) * r, y, z: Math.sin(a) * r, seed: (i * 7919) % 97 / 97 }
})

const parse = (css: string): [number, number, number] => {
  const m = css.match(/\d+(\.\d+)?/g)
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : [17, 17, 17]
}
const VIOLET: [number, number, number] = [153, 61, 202]

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
    let ink = parse(getComputedStyle(cv).color)
    let visible = true

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ink = parse(getComputedStyle(cv).color)
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const R = Math.min(w, h) * 0.4 * (1 + e * 0.05)
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
        const wave = 1 + Math.sin(p.y * 5 + pulse + p.seed * 2) * 0.035 * (0.3 + e * 2.2)
        const depth = (z2 + 1) / 2 // 0 far side, 1 near side
        const rr = R * wave
        const r = (0.55 + depth * 1.35) * (Math.min(w, h) / 420 + 0.35)
        const a = 0.12 + depth * 0.88
        // near-side dots lean toward violet as it comes alive; the rest stay ink
        const t = depth > 0.7 ? Math.max(0, live * (depth - 0.7) / 0.3) * (0.4 + p.seed * 0.6) : 0
        const c0 = Math.round(ink[0] + (VIOLET[0] - ink[0]) * t), c1 = Math.round(ink[1] + (VIOLET[1] - ink[1]) * t), c2 = Math.round(ink[2] + (VIOLET[2] - ink[2]) * t)
        ctx.fillStyle = `rgba(${c0},${c1},${c2},${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(cx + x1 * rr, cy + y2 * rr, r, 0, 6.2832)
        ctx.fill()
      }
    }
    const loop = (now: number) => {
      const dt = Math.min(now - last, 64); last = now
      e += (target.current - e) * Math.min(1, dt / 220)
      spin += dt * 0.00035 * (1 + e * 5)
      pulse += dt * 0.002 * (1 + e * 4)
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

  return <canvas ref={ref} className={className} aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block', color: 'inherit' }} />
}

export default DotOrb
