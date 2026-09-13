// 1. Import the required 3D components
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { XR, createXRStore, useXRControllerLocomotion, XROrigin} from '@react-three/xr'
import Takshshilla from './components/Takshshilla'
import MainBuilding from './components/mainBuilding'
import { useRef } from 'react'

const store = createXRStore()

function PlayerMovement() {
  const playerRef = useRef(null);

  // This automatically binds the left/right VR joysticks to walk and turn!
  useXRControllerLocomotion(playerRef, {
    speed:10
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

      <Canvas style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', backgroundColor: '#87CEEB' }}>
        <XR store={store}>
          <PlayerMovement/>
        {/* Lighting */}
        <ambientLight intensity={1} />
        <directionalLight position={[5, 10, 7]} intensity={1} />
        
        {/* <Takshshilla position={[0, 0, 0]} /> */}
        <MainBuilding position={[0,-4,-150]} />
        {/* Camera Controls */}
        <OrbitControls 
            enablePan={false}
            enableZoom={false}
            enableDamping={true}
            dampingFactor={0.05}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={(2.4)*Math.PI/3}
            minAzimuthAngle={-Math.PI}
            maxAzimuthAngle={Math.PI}
       
         />
        
        {/* Environment Grid */}
        <Grid
          infiniteGrid
          sectionColor={[0.3, 0.3, 0.3, 1]}
          sectionThickness={2}
          cellThickness={0}
          cellColor={[0.15, 0.15, 0.15, 1]}
          fadeDistance={0}
          fadeStrength={2}
        />
        </XR>
      </Canvas>
    </>
  )
}

export default App