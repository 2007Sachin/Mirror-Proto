import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'

const VERT = `
varying vec3 vNormal;
varying vec3 vWorld;
uniform float uTime;
void main() {
  vec3 displaced = position + normal * (sin(position.y * 3.2 + uTime * 0.7) * cos(position.x * 2.6 + uTime * 0.5) * 0.03);
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const FRAG = `
precision highp float;
varying vec3 vNormal;
varying vec3 vWorld;
uniform vec2 uPointer;
void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float facing = clamp(dot(normal, viewDir), 0.0, 1.0);
  float fresnel = pow(1.0 - facing, 1.75);
  vec3 blue = vec3(0.102, 0.451, 0.949);
  vec3 lift = vec3(0.78, 0.89, 1.0);
  vec3 white = vec3(1.0);
  vec3 key = normalize(vec3(0.35 + uPointer.x * 0.12, 0.82, 0.48));
  float shade = clamp(dot(normal, key), 0.0, 1.0);
  vec3 color = mix(blue, lift, shade);
  color = mix(color, white, pow(shade, 2.1) * 0.62);
  color = mix(color, blue, fresnel * 0.72);
  float spec = pow(max(dot(reflect(-key, normal), viewDir), 0.0), 42.0);
  color += spec * 0.26;
  gl_FragColor = vec4(color, 1.0);
}
`

function Sphere({ pointer }: { pointer: RefObject<{ x: number; y: number }> }) {
  const tilt = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Mesh>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const [uniforms] = useState(() => ({
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
  }))

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.05)
    const x = pointer.current?.x ?? 0
    const y = pointer.current?.y ?? 0
    if (spin.current) {
      spin.current.rotation.y += step * 0.28
      spin.current.rotation.x += step * 0.045
    }
    if (tilt.current) {
      tilt.current.rotation.y += (x * 0.28 - tilt.current.rotation.y) * 0.05
      tilt.current.rotation.x += (-y * 0.18 - tilt.current.rotation.x) * 0.05
      tilt.current.position.x += (x * 0.07 - tilt.current.position.x) * 0.05
      tilt.current.position.y += (-y * 0.04 - tilt.current.position.y) * 0.05
    }
    const live = material.current
    if (live) {
      live.uniforms.uTime.value += step
      ;(live.uniforms.uPointer.value as THREE.Vector2).set(x, y)
    }
  })

  return (
    <group ref={tilt}>
      <mesh ref={spin}>
        <sphereGeometry args={[1, 80, 80]} />
        <shaderMaterial
          ref={material}
          toneMapped={false}
          uniforms={uniforms}
          vertexShader={VERT}
          fragmentShader={FRAG}
        />
      </mesh>
    </group>
  )
}

function ContextGuard({ onUnavailable }: { onUnavailable: () => void }) {
  const gl = useThree(state => state.gl)
  const set = useThree(state => state.set)
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault()
      onUnavailable()
    }
    gl.domElement.addEventListener('webglcontextlost', lost)
    const onVis = () => set({ frameloop: document.hidden ? 'never' : 'always' })
    document.addEventListener('visibilitychange', onVis)
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [gl, onUnavailable, set])
  return null
}

export default function HeroOrbCanvas({ onUnavailable }: { onUnavailable: () => void }) {
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const move = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  return (
    <Canvas
      className="ml-hero-canvas"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.6], fov: 30 }}
      flat
      gl={{ alpha: true, antialias: true }}
      frameloop="always"
    >
      <ContextGuard onUnavailable={onUnavailable} />
      <Sphere pointer={pointer} />
    </Canvas>
  )
}
