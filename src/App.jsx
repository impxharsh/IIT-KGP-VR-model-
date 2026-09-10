// 1. Import the required 3D components
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import Takshshilla from './components/Takshshilla'
import MainBuilding from './components/mainBuilding'

function App() {
  return (
    <>
      <Canvas style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', backgroundColor: '#87CEEB' }}>
        
        {/* Lighting */}
        <ambientLight intensity={1} />
        <directionalLight position={[5, 10, 7]} intensity={1} />
        
        {/* <Takshshilla position={[0, 0, 0]} /> */}
        <MainBuilding position={[0,-10,-150]} />
        {/* Camera Controls */}
        <OrbitControls 
            enablePan={false}
            enableZoom={false}
            enableDamping={true}
            dampingFactor={0.05}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI - Math.PI / 8}
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
      </Canvas>
    </>
  )
}

export default App