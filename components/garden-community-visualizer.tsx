"use client"

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sprout, Loader } from "lucide-react"
import * as THREE from 'three'

interface Token {
  id: number
  size: number
}

interface GardenCommunityVisualizerProps {
  tokens: Token[]
  isLoading: boolean
}

const MAX_SIZE = 1000
const MIN_RADIUS = 0.06
const MAX_RADIUS = 0.45

function getRadius(size: number) {
  if (size <= 1) return MIN_RADIUS
  const scale = Math.pow((size - 1) / (MAX_SIZE - 1), 0.7)
  return MIN_RADIUS + scale * (MAX_RADIUS - MIN_RADIUS)
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

interface ParticleData {
  id: number
  size: number
  pos: THREE.Vector3
  vel: THREE.Vector3
  radius: number
}

// ---------- The 3D scene ----------

function CubeScene({ tokens, onClickToken }: { tokens: Token[]; onClickToken: (id: number) => void }) {
  const cubeRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<ParticleData[]>([])
  const meshRefs = useRef<Map<number, THREE.Mesh>>(new Map())
  const { raycaster, pointer, camera, gl } = useThree()
  const hoveredId = useRef<number>(-1)
  const CUBE_HALF = 1.8

  // init / update particles
  useEffect(() => {
    const existing = new Map(particlesRef.current.map(p => [p.id, p]))
    particlesRef.current = tokens.map(token => {
      const prev = existing.get(token.id)
      if (prev) {
        prev.size = token.size
        prev.radius = getRadius(token.size)
        return prev
      }
      const rng = seededRandom(token.id * 7919 + 31)
      return {
        id: token.id,
        size: token.size,
        pos: new THREE.Vector3(
          (rng() * 2 - 1) * CUBE_HALF * 0.7,
          (rng() * 2 - 1) * CUBE_HALF * 0.7,
          (rng() * 2 - 1) * CUBE_HALF * 0.7,
        ),
        vel: new THREE.Vector3(0, 0, 0),
        radius: getRadius(token.size),
      }
    })
  }, [tokens])

  const gravityWorld = useMemo(() => new THREE.Vector3(0, -4, 0), [])
  const gravityLocal = useMemo(() => new THREE.Vector3(), [])
  const tempQuat = useMemo(() => new THREE.Quaternion(), [])
  const tmpV = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const cube = cubeRef.current
    if (!cube) return

    cube.rotation.y += 0.25 * dt
    cube.rotation.x += 0.15 * dt

    tempQuat.setFromEuler(cube.rotation).invert()
    gravityLocal.copy(gravityWorld).applyQuaternion(tempQuat)

    const particles = particlesRef.current
    const DAMPING = 0.98
    const BOUNCE = 0.45

    for (const p of particles) {
      p.vel.addScaledVector(gravityLocal, dt)
      p.vel.multiplyScalar(DAMPING)
      p.pos.addScaledVector(p.vel, dt)

      const w = CUBE_HALF - p.radius
      for (const axis of ['x', 'y', 'z'] as const) {
        if (p.pos[axis] > w) { p.pos[axis] = w; p.vel[axis] = -Math.abs(p.vel[axis]) * BOUNCE }
        if (p.pos[axis] < -w) { p.pos[axis] = -w; p.vel[axis] = Math.abs(p.vel[axis]) * BOUNCE }
      }
    }

    // collisions
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j]
        tmpV.subVectors(b.pos, a.pos)
        const dist = tmpV.length()
        const minDist = a.radius + b.radius + 0.02
        if (dist < minDist && dist > 0.001) {
          tmpV.divideScalar(dist)
          const overlap = (minDist - dist) * 0.5
          a.pos.addScaledVector(tmpV, -overlap)
          b.pos.addScaledVector(tmpV, overlap)
          const relVel = b.vel.dot(tmpV) - a.vel.dot(tmpV)
          if (relVel < 0) {
            const impulse = relVel * 0.4
            a.vel.addScaledVector(tmpV, impulse)
            b.vel.addScaledVector(tmpV, -impulse)
          }
        }
      }
    }

    // update meshes
    for (const p of particles) {
      const mesh = meshRefs.current.get(p.id)
      if (mesh) {
        mesh.position.copy(p.pos)
        mesh.scale.setScalar(p.radius)
      }
    }

    // hover
    raycaster.setFromCamera(pointer, camera)
    const meshes = Array.from(meshRefs.current.values())
    const hits = raycaster.intersectObjects(meshes)
    const newHovered = hits.length > 0 ? (hits[0].object.userData.tokenId as number) : -1
    if (newHovered !== hoveredId.current) {
      hoveredId.current = newHovered
      gl.domElement.style.cursor = newHovered >= 0 ? 'pointer' : 'default'
    }
  })

  const onClick = useCallback(() => {
    if (hoveredId.current >= 0) onClickToken(hoveredId.current)
  }, [onClickToken])

  useEffect(() => {
    const el = gl.domElement
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [gl, onClick])

  return (
    <group ref={cubeRef}>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(CUBE_HALF * 2, CUBE_HALF * 2, CUBE_HALF * 2)]} />
        <lineBasicMaterial color="#000" transparent opacity={0.35} />
      </lineSegments>

      {tokens.map(token => (
        <mesh
          key={token.id}
          ref={(mesh: THREE.Mesh | null) => {
            if (mesh) {
              meshRefs.current.set(token.id, mesh)
              mesh.userData.tokenId = token.id
            } else {
              meshRefs.current.delete(token.id)
            }
          }}
          scale={getRadius(token.size)}
        >
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            color="#1a1a1a"
            roughness={0.6}
            metalness={0.15}
          />
        </mesh>
      ))}
    </group>
  )
}

// ---------- Main component ----------

const GardenCommunityVisualizer: React.FC<GardenCommunityVisualizerProps> = ({ tokens, isLoading }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleClick = useCallback((tokenId: number) => {
    window.open(`https://opensea.io/assets/shape/0xca38813d69409e4e50f1411a0cab2570e570c75a/${tokenId}`, '_blank')
  }, [])

  return (
    <div className="border-l border-r border-t border-black">
      <div className="border-b border-black p-2 bg-gray-100">
        <div className="uppercase font-bold">COMMUNITY GARDEN</div>
      </div>
      <div className="relative w-full bg-gray-50 overflow-hidden" style={{ height: '560px' }}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 bg-white bg-opacity-80 z-10">
            <Loader size={24} className="animate-spin mb-2" />
            <span className="text-sm">Loading community garden...</span>
          </div>
        )}

        {!isLoading && tokens.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <Sprout size={24} className="mb-2" />
            <span className="text-sm">The community garden is currently empty.</span>
          </div>
        )}

        {mounted && !isLoading && tokens.length > 0 && (
          <Canvas
            camera={{ position: [0, 0, 8], fov: 45 }}
            gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={3} />
            <directionalLight position={[5, 8, 5]} intensity={5} />
            <directionalLight position={[-4, -2, 6]} intensity={3} />
            <pointLight position={[0, 4, 0]} intensity={4} color="#ffffff" />
            <pointLight position={[-3, -3, -3]} intensity={2} color="#ffffff" />
            <CubeScene tokens={tokens} onClickToken={handleClick} />
          </Canvas>
        )}
      </div>
    </div>
  )
}

export default GardenCommunityVisualizer
