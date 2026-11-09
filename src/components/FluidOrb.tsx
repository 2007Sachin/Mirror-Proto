import { useEffect, useRef } from 'react'

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uPointer;
uniform float uFocus;
uniform float uStill;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p * 2.02 + 1.7;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
  float t = uStill > 0.5 ? 0.35 : uTime * (0.32 + uFocus * 0.4);
  vec2 pull = clamp(uPointer, vec2(-1.2), vec2(1.2));
  vec2 p = uv - pull * 0.028;
  float ang = atan(p.y, p.x);
  float breathe = uStill > 0.5 ? 0.0 : 0.007 * sin(t * 1.5 + ang * 2.0);
  float radius = 0.40 + breathe;
  float rad = length(p);
  float edge = smoothstep(radius + 0.006, radius - 0.02, rad);
  float z = sqrt(max(radius * radius - rad * rad, 0.0));
  vec3 normal = normalize(vec3(p, z + 0.0001));
  vec3 light = normalize(vec3(-0.42 + pull.x * 0.6 + sin(t) * 0.06, 0.7 + pull.y * 0.28, 0.72));
  float shade = max(dot(normal, light), 0.0);
  float fres = pow(1.0 - clamp(normal.z, 0.0, 1.0), 2.05);
  vec3 halfV = normalize(light + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(normal, halfV), 0.0), 70.0);
  float broad = pow(max(dot(normal, normalize(vec3(-0.15, 0.85, 0.45))), 0.0), 5.0);

  vec2 flowUv = p * 2.5;
  float n1 = fbm(flowUv + vec2(t * 0.62, -t * 0.28));
  float n2 = fbm(flowUv * 1.55 + n1 + vec2(-t * 0.36, t * 0.5));
  float pool = smoothstep(0.32, 0.82, n1);
  float vein = smoothstep(0.48, 0.7, n2) * (1.0 - smoothstep(0.72, 0.9, n1));

  vec3 deep = vec3(0.027, 0.169, 0.478);
  vec3 blue = vec3(0.102, 0.451, 0.949);
  vec3 bright = vec3(0.62, 0.82, 1.0);
  vec3 ice = vec3(0.910, 0.945, 0.996);

  vec3 col = mix(deep, blue, 0.35 + shade * 0.75);
  col = mix(col, bright, pool * 0.36 + vein * (0.55 + uFocus * 0.3));
  col += ice * broad * 0.16;
  col = mix(col, ice, fres * 0.5);
  col += vec3(1.0) * spec * 0.95;
  float rim = smoothstep(radius * 0.78, radius, rad);
  col = mix(col, deep, rim * 0.28);

  float halo = smoothstep(radius + 0.15, radius, rad) * (0.16 + uFocus * 0.06);
  float alpha = max(edge, halo);
  vec3 rgb = mix(blue, col, clamp(edge, 0.0, 1.0));
  gl_FragColor = vec4(rgb, alpha);
}
`

type FluidOrbProps = {
  className?: string
  focus?: number
  label?: string
}

export function FluidOrb({ className = '', focus = 0, label = 'MIRROR fluid orb' }: FluidOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const focusRef = useRef(focus)
  useEffect(() => {
    focusRef.current = focus
  }, [focus])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    })
    if (!gl) {
      wrap.dataset.fallback = 'true'
      return
    }

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) {
      wrap.dataset.fallback = 'true'
      return
    }

    const program = gl.createProgram()
    if (!program) {
      wrap.dataset.fallback = 'true'
      return
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.bindAttribLocation(program, 0, 'aPos')
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      wrap.dataset.fallback = 'true'
      return
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    gl.useProgram(program)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const uResolution = gl.getUniformLocation(program, 'uResolution')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uPointer = gl.getUniformLocation(program, 'uPointer')
    const uFocus = gl.getUniformLocation(program, 'uFocus')
    const uStill = gl.getUniformLocation(program, 'uStill')

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = { x: 0, y: 0 }
    const smooth = { x: 0, y: 0 }
    let visible = true
    let raf = 0
    let running = true

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(2, Math.round(rect.width * dpr))
      const height = Math.max(2, Math.round(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const draw = (now: number) => {
      if (!running) return
      smooth.x += (pointer.x - smooth.x) * 0.08
      smooth.y += (pointer.y - smooth.y) * 0.08
      gl.useProgram(program)
      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uTime, now * 0.001)
      gl.uniform2f(uPointer, smooth.x, smooth.y)
      gl.uniform1f(uFocus, focusRef.current)
      gl.uniform1f(uStill, motion.matches ? 1 : 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const tick = (now: number) => {
      draw(now)
      if (running && visible && !motion.matches) raf = window.requestAnimationFrame(tick)
    }

    const start = () => {
      window.cancelAnimationFrame(raf)
      if (running && visible) raf = window.requestAnimationFrame(tick)
    }

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      pointer.x = Math.max(-1.15, Math.min(1.15, x))
      pointer.y = Math.max(-1.15, Math.min(1.15, y))
      if (motion.matches) draw(performance.now())
    }

    const onMotion = () => {
      if (motion.matches) {
        window.cancelAnimationFrame(raf)
        draw(performance.now())
      } else {
        start()
      }
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(wrap)
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else window.cancelAnimationFrame(raf)
    }, { threshold: 0.08 })
    visibility.observe(wrap)

    window.addEventListener('pointermove', onPointer, { passive: true })
    motion.addEventListener('change', onMotion)
    start()
    if (motion.matches) draw(performance.now())

    return () => {
      running = false
      window.cancelAnimationFrame(raf)
      observer.disconnect()
      visibility.disconnect()
      window.removeEventListener('pointermove', onPointer)
      motion.removeEventListener('change', onMotion)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return (
    <div ref={wrapRef} className={`fluid-orb ${className}`.trim()}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  )
}
