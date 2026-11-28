import { useEffect, useRef } from 'react'

// Three soft colour fields drifting over a ground colour, with a light domain warp and film grain.
// Written from scratch as a raw WebGL fragment shader (no library). Same pacing as the design reference: 0.0025 per ms.
const FRAG = `precision highp float;
uniform vec2 r;uniform float t;uniform vec3 a;uniform vec3 b;uniform vec3 c;uniform vec3 g;uniform float w;
float h(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
float blob(vec2 p,vec2 o,float s){return 1.0-smoothstep(0.0,s,distance(p,o));}
void main(){
 vec2 uv=gl_FragCoord.xy/r; vec2 p=uv; p.x*=r.x/r.y;
 p+=vec2(sin(t*.31+p.y*4.0),cos(t*.27+p.x*3.0))*.06*w;
 float k=r.x/r.y;
 vec2 o1=vec2(k*(.25+.2*sin(t*.23)), .3+.25*cos(t*.19));
 vec2 o2=vec2(k*(.75+.2*cos(t*.17)), .7+.2*sin(t*.21));
 vec2 o3=vec2(k*(.5+.3*sin(t*.13+1.)), .5+.3*cos(t*.11+2.));
 vec3 col=g;
 col=mix(col,a,blob(p,o1,.95)*.95);
 col=mix(col,c,blob(p,o2,1.05)*.9);
 col=mix(col,b,blob(p,o3,.7)*.7);
 col*=1.0-h(gl_FragCoord.xy)*.05;
 gl_FragColor=vec4(col,1.0);}`
const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'

function rgb(hex: string): [number, number, number] {
  let s = hex.trim().replace('#', '')
  if (s.length === 3) s = s.replace(/./g, '$&$&')
  const n = parseInt(s, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
const lum = (c: number[]) => Math.max(...c) + Math.min(...c)

/** A WebGL mesh-gradient canvas that fills its parent (which must be `position: relative`; put it first, and raise siblings with z-index).
 *  `colors`: three hex colours. `ground`: base colour (defaults to the lightest colour). Draws one still frame under reduced motion,
 *  animates only while on screen and while the tab is visible, survives WebGL context loss, and renders nothing if WebGL is missing. */
export function MeshGradient({ colors, ground, className }: { colors: [string, string, string]; ground?: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const colorKey = colors.join(',')
  useEffect(() => {
    const cv = ref.current
    const host = cv?.parentElement
    if (!cv || !host) return
    const stops = colorKey.split(',').map(rgb)
    const base = ground ? rgb(ground) : [...stops].sort((x, y) => lum(y) - lum(x))[0]
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' })
    if (!gl) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    const U: Record<string, WebGLUniformLocation | null> = {}
    let ready = false, lost = false, visible = false, raf = 0, last = 0, time = Math.random() * 100

    const shader = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s }
    const build = (): boolean => {
      const pr = gl.createProgram()
      gl.attachShader(pr, shader(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, shader(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr)
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false
      gl.useProgram(pr)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(pr, 'p')
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      for (const k of ['r', 't', 'a', 'b', 'c', 'g', 'w']) U[k] = gl.getUniformLocation(pr, k)
      return true
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = () => { cv.width = Math.max(1, (host.clientWidth * dpr) | 0); cv.height = Math.max(1, (host.clientHeight * dpr) | 0); gl.viewport(0, 0, cv.width, cv.height) }
    const draw = () => {
      if (!ready || lost) return
      gl.uniform2f(U.r, cv.width, cv.height); gl.uniform1f(U.t, time)
      gl.uniform3fv(U.a, stops[0]); gl.uniform3fv(U.b, stops[1]); gl.uniform3fv(U.c, stops[2]); gl.uniform3fv(U.g, base)
      gl.uniform1f(U.w, 0.6 + 0.4 * Math.sin(time * 0.05))
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      cv.classList.add('ms-is-ready')
    }
    const loop = (now: number) => { time += 0.0025 * Math.min(now - last, 100); last = now; draw(); raf = requestAnimationFrame(loop) }
    const sync = () => {
      const run = ready && !lost && visible && !document.hidden && !reduce.matches
      if (run && !raf) { last = performance.now(); raf = requestAnimationFrame(loop) }
      else if (!run && raf) { cancelAnimationFrame(raf); raf = 0 }
    }
    const onLost = (e: Event) => { e.preventDefault(); lost = true; ready = false; sync() }
    const onRestored = () => { lost = false; ready = build(); size(); draw(); sync() }

    ready = build()
    size(); draw()
    cv.addEventListener('webglcontextlost', onLost)
    cv.addEventListener('webglcontextrestored', onRestored)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { size(); draw() }) : null
    ro?.observe(host)
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(e => { visible = e[e.length - 1].isIntersecting; sync() }) : null
    io?.observe(host)
    document.addEventListener('visibilitychange', sync)
    reduce.addEventListener('change', sync)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect(); io?.disconnect()
      document.removeEventListener('visibilitychange', sync)
      reduce.removeEventListener('change', sync)
      cv.removeEventListener('webglcontextlost', onLost)
      cv.removeEventListener('webglcontextrestored', onRestored)
      cv.classList.remove('ms-is-ready')
    }
  }, [colorKey, ground])
  return <canvas ref={ref} className={className ? `ms-mg-canvas ${className}` : 'ms-mg-canvas'} aria-hidden="true" />
}
