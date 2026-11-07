// 1. Import the required 3D components
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { XR, createXRStore, useXRControllerLocomotion, XROrigin } from '@react-three/xr'
import Takshshilla from './components/Takshshilla'
import MainBuilding from './components/mainBuilding'
import CampusLoop from './components/CampusLoop'
import { useRef } from 'react'

const store = createXRStore()

function PlayerMovement() {
  const playerRef = useRef(null)

  // Binds the left/right VR joysticks to walk and turn
  // Bumped speed to 18 so you can traverse the full loop quickly during your demo
  useXRControllerLocomotion(playerRef, {
    speed: 18
  })
  return (
    <XROrigin ref={playerRef} position={[0, 0, 0]} />
  )
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
          cursor: 'pointer'
        }}
      >
        Enter VR
      </button>

      <Canvas
        camera={{ position: [0, 2, 15], fov: 60, far: 2000 }}
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', backgroundColor: '#87CEEB' }}
      >
        <XR store={store}>
          <PlayerMovement />

          {/* Lighting */}
          <ambientLight intensity={1.1} />
          <directionalLight position={[40, 80, 30]} intensity={1.2} />

          {/* Anchor GLB Model */}
          {/* <Takshshilla position={[0, 0, 0]} /> */}
          <MainBuilding position={[0, -4, -150]} />

          {/* Procedural U-Shape Loop + Roads + Signboards */}
          <CampusLoop />

          {/* Desktop Camera Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableDamping={true}
            dampingFactor={0.05}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={(2.4) * Math.PI / 3}
          />
        </XR>
      </Canvas>
    </>
  )
}

export default App