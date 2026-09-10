import { useGLTF } from "@react-three/drei";

export default function mainBuilding({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
    const { scene } = useGLTF('./models/IIT_Kharagpur_Main_Building.glb')
    return (
      <primitive
        object={scene.clone()}
        position={position}
        rotation={rotation}
        scale={scale}
      />
    )
  }
  
  useGLTF.preload('/models/IIT_Kharagpur_Main_Building.glb')