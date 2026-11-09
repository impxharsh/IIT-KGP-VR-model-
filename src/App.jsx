import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { XR, createXRStore, useXR, useXRControllerLocomotion, XROrigin } from '@react-three/xr'
import { Vector3 } from 'three'
import Takshshilla from './components/Takshshilla'
import MainBuilding from './components/mainBuilding'
import CampusLoop, { CAMPUS_BUILDINGS } from './components/CampusLoop'
import MapSearch from './components/MapSearch'
import { useEffect, useRef, useState } from 'react'

const store = createXRStore()

// Pre-compute 2D bounding boxes (X and Z) for every building + Main Building
// so that player doesn't get go through walls
const PLAYER_RADIUS = 2.5 // Keeps the camera 2.5m away from clipping into walls

const COLLIDER_BOXES = [
  // 1. Main Academic Building GLB footprint (centered at [0, -4, -150])
  {
    id: 'main_building',
    minX: -20,
    maxX: 20,
    minZ: -178,
    maxZ: -125,
    minY: -100,
    maxY: 100
  },
  // 2. Roundabout Center Statue/Garden (optional: prevents walking through the center statue)
  {
    id: 'roundabout_statue',
    minX: -6,
    maxX: 6,
    minZ: -81,
    maxZ: -69,
  },
  // 3. All Procedural Department Placeholders (including foundation & porch margin)
  ...CAMPUS_BUILDINGS.map((b) => {
    const [w, , d] = b.size
    const [x, z] = b.pos

    // Extra padding on the side where the entrance porch sticks out
    const padLeft = b.entranceSide === 'left' ? 5 : 1.5
    const padRight = b.entranceSide === 'right' ? 5 : 1.5
    const padFront = b.entranceSide === 'front' ? 5 : 1.5
    const padBack = b.entranceSide === 'back' ? 5 : 1.5

    return {
      id: b.id,
      minX: x - w / 2 - padLeft,
      maxX: x + w / 2 + padRight,
      minZ: z - d / 2 - padBack,
      maxZ: z + d / 2 + padFront,
    }
  }),
]

// Pushes a position (Vector3) out of any building box, sliding along the wall.
// Used by both the VR player and the desktop keyboard walker.
function resolveCollisions(pos) {
  for (let i = 0; i < COLLIDER_BOXES.length; i++) {
    const box = COLLIDER_BOXES[i]
    const minX = box.minX - PLAYER_RADIUS
    const maxX = box.maxX + PLAYER_RADIUS
    const minZ = box.minZ - PLAYER_RADIUS
    const maxZ = box.maxZ + PLAYER_RADIUS

    // Check if player stepped inside this building's boundary
    if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
      // Find the shallowest penetration axis so the player slides smoothly along the wall
      const overlapLeft = pos.x - minX
      const overlapRight = maxX - pos.x
      const overlapBack = pos.z - minZ
      const overlapFront = maxZ - pos.z

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapBack, overlapFront)

      if (minOverlap === overlapLeft) pos.x = minX
      else if (minOverlap === overlapRight) pos.x = maxX
      else if (minOverlap === overlapBack) pos.z = minZ
      else pos.z = maxZ
    }
  }
}

function PlayerMovement() {
  const playerRef = useRef(null)

  // Binds VR joysticks to walk and turn
  useXRControllerLocomotion(playerRef, {
    speed: 50,
  })

  // Enforce solid walls every frame after joystick movement updates position
  useFrame(() => {
    if (!playerRef.current) return
    resolveCollisions(playerRef.current.position)
  })

  return <XROrigin ref={playerRef} position={[0, 0, 0]} />
}

// Desktop walking: W/A/S/D or arrow keys (hold Shift to run). Only active outside VR.
const walkDir = new Vector3()
const walkRight = new Vector3()
const walkMove = new Vector3()
const walkBefore = new Vector3()
const UP = new Vector3(0, 1, 0)

function DesktopWalk() {
  const keys = useRef({})
  const inVR = useXR((s) => s.session != null)
  const controls = useThree((s) => s.controls)

  useEffect(() => {
    const down = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return // don't walk while typing in the search box
      keys.current[e.code] = true
    }
    const up = (e) => {
      keys.current[e.code] = false
    }
    const clear = () => {
      keys.current = {}
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  useFrame(({ camera }, delta) => {
    if (inVR || !controls) return
    const k = keys.current
    const forward = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
    const strafe = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
    if (!forward && !strafe) return

    const speed = k.ShiftLeft || k.ShiftRight ? 70 : 28

    camera.getWorldDirection(walkDir)
    walkDir.y = 0
    walkDir.normalize()
    walkRight.crossVectors(walkDir, UP)

    walkMove
      .set(0, 0, 0)
      .addScaledVector(walkDir, forward)
      .addScaledVector(walkRight, strafe)
      .normalize()
      .multiplyScalar(speed * delta)

    walkBefore.copy(camera.position)
    camera.position.add(walkMove)
    resolveCollisions(camera.position)

    // Move the orbit target by the same amount so the camera doesn't snap back
    controls.target.x += camera.position.x - walkBefore.x
    controls.target.z += camera.position.z - walkBefore.z
  })

  return null
}

function App() {
  const [vrMessage, setVrMessage] = useState('')

  // Shows the reason on screen if VR can't start (instead of failing silently)
  async function handleEnterVR() {
    setVrMessage('')
    try {
      await store.enterVR()
    } catch (err) {
      console.error('Enter VR failed:', err)
      setVrMessage(`Could not start VR: ${err?.message || err}`)
    }
  }

  return (
    <>
      {/* 2D map search (top of the screen) */}
      <MapSearch />

      <div
        style={{
          position: 'absolute',
          zIndex: 10,
          bottom: 20,
          left: 16,
          background: 'rgba(15,23,42,0.7)',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: 8,
          fontSize: 13,
          fontFamily: 'system-ui, sans-serif',
          pointerEvents: 'none',
        }}
      >
        Walk: W A S D / arrow keys · Shift = run · drag = look
      </div>

      {vrMessage && (
        <div
          style={{
            position: 'absolute',
            zIndex: 10,
            bottom: 74,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.95)',
            color: '#b91c1c',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 14,
            maxWidth: 'min(520px, calc(100vw - 24px))',
          }}
        >
          {vrMessage}
        </div>
      )}

      <button
        onClick={handleEnterVR}
        style={{
          position: 'absolute',
          zIndex: 10,
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        Enter VR
      </button>

      <Canvas
        camera={{ position: [0, 2, 15], fov: 60, far: 2000 }}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#87CEEB',
        }}
      >
        <XR store={store}>
          <PlayerMovement />
          <DesktopWalk />

          {/* Lighting */}
          <ambientLight intensity={1.1} />
          <directionalLight position={[40, 80, 30]} intensity={1.2} />

          {/* Main Building GLB */}
          {/* <Takshshilla position={[0, 0, 0]} /> */}
          <MainBuilding position={[0, -4, -150]} />

          {/* Procedural Campus Loop + Roads + Signboards */}
          <CampusLoop />

          {/* Desktop Camera Controls */}
          <OrbitControls
            makeDefault
            enablePan={true}
            enableZoom={true}
            enableDamping={true}
            dampingFactor={0.05}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={(2.4 * Math.PI) / 3}
            maxDistance={450}
          />
        </XR>
      </Canvas>
    </>
  )
}

export default App