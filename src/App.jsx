import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { XR, createXRStore, useXRControllerLocomotion, XROrigin } from '@react-three/xr'
import Takshshilla from './components/Takshshilla'
import MainBuilding from './components/mainBuilding'
import CampusLoop, { CAMPUS_BUILDINGS } from './components/CampusLoop'
import { useRef } from 'react'

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

function PlayerMovement() {
  const playerRef = useRef(null)

  // Binds VR joysticks to walk and turn
  useXRControllerLocomotion(playerRef, {
    speed: 50,
  })

  // Enforce solid walls every frame after joystick movement updates position
  useFrame(() => {
    if (!playerRef.current) return
    const pos = playerRef.current.position

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
  })

  return <XROrigin ref={playerRef} position={[0, 0, 0]} />
}

function App() {
  return (
    <>
      <button
        onClick={() => store.enterVR()}
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