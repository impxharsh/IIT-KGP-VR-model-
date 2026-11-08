import React, { Suspense, useMemo } from 'react'
import { Text, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const GROUND_Y = -4
const GRASS_Y = GROUND_Y - 0.05
const ROAD_Y = GROUND_Y + 0.04

function DepartmentGLB({
  path,
  targetSize,
  entranceSide,
  modelRotationOffset = 0,
  modelScale = 1,
  modelOffset = [0, 0, 0],
}) {
  const { scene } = useGLTF(path)

  // Calculate total Y rotation first so bounding box fits the rotated plot orientation
  let rotY = modelRotationOffset
  if (entranceSide === 'left') rotY += -Math.PI / 2
  else if (entranceSide === 'right') rotY += Math.PI / 2

  const { clonedScene, scale, offset } = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const [targetW, targetH, targetD] = targetSize

    // If rotated ~90 or ~270 degrees, swap width and depth targets so it fits the plinth
    const isSideRotated = Math.abs(Math.sin(rotY)) > 0.707
    const fitW = isSideRotated ? targetD : targetW
    const fitD = isSideRotated ? targetW : targetD

    const maxDimX = size.x > 0 ? fitW / size.x : 1
    const maxDimY = size.y > 0 ? targetH / size.y : 1
    const maxDimZ = size.z > 0 ? fitD / size.z : 1

    // Multiply the auto-fitted scale by your custom modelScale
    const finalScale = Math.min(maxDimX, maxDimY, maxDimZ) * 0.95 * modelScale

    const posOffset = [
      -center.x * finalScale,
      0.8 - box.min.y * finalScale,
      -center.z * finalScale,
    ]

    return { clonedScene: clone, scale: finalScale, offset: posOffset }
  }, [scene, targetSize, modelScale, rotY])

  return (
    <group position={modelOffset} rotation={[0, rotY, 0]}>
      <primitive object={clonedScene} position={offset} scale={scale} />
    </group>
  )
}

// 1. Intersection Route Signboard (Double-Sided)
function Signboard({ position, rotation = [0, 0, 0], title, subtitle, arrow = 'right' }) {
  const frontText = arrow === 'left' ? `◄ ${title}` : `${title} ►`
  const backText = arrow === 'left' ? `${title} ►` : `◄ ${title}`

  return (
    <group position={[position[0], GROUND_Y, position[2]]} rotation={rotation}>
      <mesh position={[-4.5, 3, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 6, 12]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[4.5, 3, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 6, 12]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
      </mesh>

      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[12, 2.6, 0.26]} />
        <meshStandardMaterial color="#0b4f26" roughness={0.5} />
      </mesh>

      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[12.3, 2.85, 0.22]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Front Side */}
      <Text
        position={[0, 5.55, 0.16]}
        fontSize={0.65}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="#000000"
      >
        {frontText}
      </Text>
      <Text
        position={[0, 4.65, 0.16]}
        fontSize={0.42}
        color="#fde047"
        anchorX="center"
        anchorY="middle"
      >
        {subtitle}
      </Text>

      {/* Back Side */}
      <Text
        position={[0, 5.55, -0.16]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.65}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="#000000"
      >
        {backText}
      </Text>
      <Text
        position={[0, 4.65, -0.16]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.42}
        color="#fde047"
        anchorX="center"
        anchorY="middle"
      >
        {subtitle}
      </Text>
    </group>
  )
}

// 2. Dedicated Department Front Name Board (Placed right in front of each building by the road)
function DepartmentFrontBoard({ position, rotation, name, code }) {
  const boardWidth = Math.max(name.length * 0.42, 10)

  return (
    <group position={position} rotation={rotation}>
      {/* Left & Right Steel Pillars */}
      <mesh position={[-boardWidth / 2 + 0.8, 2.2, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 4.4, 12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[boardWidth / 2 - 0.8, 2.2, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 4.4, 12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Outer White Frame */}
      <mesh position={[0, 3.4, 0]}>
        <boxGeometry args={[boardWidth + 0.4, 2.5, 0.22]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Inner Dark Blue/Slate Sign Plate */}
      <mesh position={[0, 3.4, 0]}>
        <boxGeometry args={[boardWidth, 2.2, 0.26]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>

      {/* FRONT FACE (Facing the road) */}
      <Text
        position={[0, 3.95, 0.16]}
        fontSize={0.55}
        color="#38bdf8"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {`IIT KHARAGPUR  •  ${code}`}
      </Text>
      <Text
        position={[0, 3.05, 0.16]}
        fontSize={0.78}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {name}
      </Text>

      {/* BACK FACE (Readable when looking back from the building/porch) */}
      <Text
        position={[0, 3.95, -0.16]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.55}
        color="#38bdf8"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {`IIT KHARAGPUR  •  ${code}`}
      </Text>
      <Text
        position={[0, 3.05, -0.16]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.78}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  )
}

// 3. On-Building Facade Sign (Mounted directly onto the building wall itself)
function BuildingWallSign({ position, rotation, name, code, maxWidth }) {
  const plateWidth = Math.min(Math.max(name.length * 0.95, 16), maxWidth - 2)

  return (
    <group position={position} rotation={rotation}>
      {/* Gold Trim Border */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[plateWidth + 0.6, 4.6, 0.18]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>

      {/* Dark Contrast Fascia Board on the Wall */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[plateWidth, 4.1, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>

      {/* Department Code on Wall */}
      <Text
        position={[0, 1.05, 0.2]}
        fontSize={1.05}
        color="#fde047"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {`[ ${code} ]`}
      </Text>

      {/* Large Building Name Mounted on Wall */}
      <Text
        position={[0, -0.65, 0.2]}
        fontSize={1.45}
        maxWidth={plateWidth - 1.5}
        textAlign="center"
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.08}
        outlineColor="#000000"
      >
        {name.toUpperCase()}
      </Text>
    </group>
  )
}

// 4. Flat Asphalt Road Segment
function RoadSegment({ position, size, orientation = 'vertical' }) {
  const [width, length] = size
  return (
    <group position={[position[0], ROAD_Y, position[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          color="#22252a"
          roughness={0.9}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      <mesh
        position={orientation === 'vertical' ? [-width / 2 - 0.8, 0.08, 0] : [0, 0.08, -length / 2 - 0.8]}
      >
        <boxGeometry args={orientation === 'vertical' ? [1.6, 0.16, length] : [width, 0.16, 1.6]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
      <mesh
        position={orientation === 'vertical' ? [width / 2 + 0.8, 0.08, 0] : [0, 0.08, length / 2 + 0.8]}
      >
        <boxGeometry args={orientation === 'vertical' ? [1.6, 0.16, length] : [width, 0.16, 1.6]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={orientation === 'vertical' ? [0.35, length * 0.94] : [width * 0.94, 0.35]} />
        <meshStandardMaterial color="#e5e7eb" polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  )
}

// 5. Handmade Map Building Coordinates + Mapped GLB Paths, Scale & Rotation Controls
export const CAMPUS_BUILDINGS = [
  // LEFT ROUTE — OUTER LEFT SIDE (X = -185, facing Right towards X = -135 road)
  {
    id: 'ece',
    name: 'Dept. of ECE',
    code: 'ECE',
    pos: [-185, -210],
    size: [40, 20, 75],
    color: '#0d9488',
    entranceSide: 'right',
    modelPath: '/models/iit_kgp_ece_dept.glb',
    modelScale: 1.5,
    modelRotationOffset: 0,
  },
  {
    id: 'mining',
    name: 'Dept. of Mining Engineering',
    code: 'MINING',
    pos: [-185, -340],
    size: [40, 18, 75],
    color: '#57534e',
    entranceSide: 'right',
    modelPath: '/models/iit_kgp_mining_dept.glb',
    modelScale: 1.5,
    modelRotationOffset: 0,
  },

  // LEFT ROUTE — INNER RIGHT SIDE (X = -88, facing Left towards X = -135 road)
  {
    id: 'library',
    name: 'Central Library',
    code: 'LIBRARY',
    pos: [-88, -150],
    size: [44, 22, 45],
    color: '#d97706',
    entranceSide: 'left',
    // modelPath: '/models/ECE_Department.glb',
    // modelScale: 1,
    // modelRotationOffset: 0,
  },
  {
    id: 'math_ee_shared',
    name: 'Electrical (2F) & Mathematics (1F)',
    code: 'EE & MATH',
    pos: [-88, -225],
    size: [44, 24, 65],
    color: '#ca8a04',
    upperFloorColor: '#b45309',
    isTwoFloorShared: true,
    entranceSide: 'left',
    modelPath: '/models/iit_kgp_electrical_math_complex.glb',
    modelScale: 2,
    modelRotationOffset: 0,
  },
  {
    id: 'metallurgy',
    name: 'Dept. of Metallurgy & Materials',
    code: 'METALLURGY',
    pos: [-88, -420],
    size: [44, 20, 68],
    color: '#b91c1c',
    entranceSide: 'left',
    modelPath: '/models/iit_kgp_metallurgy_dept.glb',
    modelScale: 1.5,
    modelRotationOffset: 0,
    modelOffset: [0, 0, 0],
  },

  // MIDDLE CORE BLOCKS
  {
    id: 'workshop',
    name: 'Workshop Practice',
    code: 'WORKSHOP',
    pos: [-15, -420],
    size: [54, 16, 65],
    color: '#475569',
    entranceSide: 'front',
    modelPath: '/models/Training_Workshop_Mech_Eng_IIT_KGP.glb',
    modelScale: 2,
    modelRotationOffset: 0,
  },
  {
    id: 'rubber',
    name: 'Rubber Technology',
    code: 'RUBBER',
    pos: [18, -320],
    size: [42, 17, 46],
    color: '#78716c',
    entranceSide: 'front',
    modelPath: '/models/Rubber_Technology_Centre_IIT_KGP.glb',
    modelScale: 1.5,
    modelRotationOffset: 0,
  },

  // RIGHT ROUTE — INNER LEFT SIDE (X = +88, facing Right towards X = +135 road)
  {
    id: 'netaji',
    name: 'Netaji Auditorium',
    code: 'AUDITORIUM',
    pos: [88, -140],
    size: [42, 18, 34],
    color: '#991b1b',
    entranceSide: 'right',
    modelPath: '/models/Netaji_Auditorium.glb',
    modelScale: 2,
    modelRotationOffset: -Math.PI/2,
    modelOffset: [0, 0, 0],
  },
  {
    id: 'hss',
    name: 'Humanities & Social Sciences',
    code: 'HSS',
    pos: [88, -190],
    size: [42, 18, 36],
    color: '#be185d',
    entranceSide: 'right',
    modelPath: '/models/iit_kgp_hss_geology_complex.glb',
    modelScale: 3,
    modelRotationOffset: 0,
    modelOffset: [0, 0, 0],
  },
  {
    id: 'geology',
    name: 'Geology & Geophysics',
    code: 'GEOLOGY',
    pos: [88, -242],
    size: [42, 18, 38],
    color: '#a16207',
    entranceSide: 'right',
    modelPath: '/models/iit_kgp_hss_geology_complex.glb',
    modelScale: 1,
    modelRotationOffset: 0,
    modelOffset: [0, 0, 0],
  },
  {
    id: 'civil',
    name: 'Civil Engineering Dept.',
    code: 'CIVIL',
    pos: [88, -320],
    size: [42, 19, 46],
    color: '#64748b',
    entranceSide: 'right',
    modelPath: '/models/Department_of_Civil_Engineering.glb',
    modelScale: 1.5,
    modelRotationOffset: 0,
    modelOffset: [0, 0, 0],
  },
  {
    id: 'mech',
    name: 'Mechanical Engineering',
    code: 'MECHANICAL',
    pos: [88, -398],
    size: [44, 21, 44],
    color: '#2563eb',
    entranceSide: 'right',
    modelPath: '/models/Department_of_Mechanical_Engineering.glb',
    modelScale: 1.5,
    modelRotationOffset: 0,
    modelOffset: [0, 0, 0],
  },
  {
    id: 'vgsom',
    name: 'VGSoM School of Management',
    code: 'VGSOM',
    pos: [88, -450],
    size: [44, 22, 38],
    color: '#7c2d12',
    entranceSide: 'right',
    modelPath: '/models/VGSOM.glb',
    modelScale: 2.5,
    modelRotationOffset: 0,
    modelOffset: [0, 0, 0],
  },

  // RIGHT ROUTE — OUTER RIGHT SIDE (X = +185, facing Left towards X = +135 road)
  {
    id: 'arch',
    name: 'Architecture Department',
    code: 'ARCHITECTURE',
    pos: [185, -165],
    size: [40, 18, 44],
    color: '#0f766e',
    entranceSide: 'left',
    modelPath: '/models/iit_kgp_architecture_dept.glb',
    modelScale: 1.5,
    modelRotationOffset: 0,
  },
  {
    id: 'education',
    name: 'Education Department',
    code: 'EDUCATION',
    pos: [185, -230],
    size: [40, 17, 44],
    color: '#4f46e5',
    entranceSide: 'left',
    modelPath: '/models/iit_kgp_education_dept.glb',
    modelScale: 1.5,
    modelRotationOffset: 0,
  },
  {
    id: 'cryogenic',
    name: 'Cryogenic Engineering',
    code: 'CRYOGENIC',
    pos: [200, -300],
    size: [40, 18, 48],
    color: '#0369a1',
    entranceSide: 'left',
    modelPath: '/models/Cryogenic_Engineering_Centre.glb',
    modelScale: 3,
    modelRotationOffset: 0,
    modelOffset: [0, 0, 0],
  },
  {
    id: 'industrial',
    name: 'Industrial & Systems Engg.',
    code: 'INDUSTRIAL',
    pos: [185, -375],
    size: [42, 20, 54],
    color: '#1d4ed8',
    entranceSide: 'left',
    modelPath: '/models/iit_kgp_industrial_dept.glb',
    modelScale: 1.5,
    modelRotationOffset: 0,
    modelOffset: [0, 0, 0],
  },
]

export default function CampusLoop() {
  return (
    <group>
      {/* 0. CONTINUOUS CAMPUS GRASS */}
      <mesh position={[0, GRASS_Y, -250]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2800, 2800]} />
        <meshStandardMaterial color="#2d5a22" roughness={0.95} />
      </mesh>

      {/* 1. ROAD NETWORK */}
      <RoadSegment position={[-115, -85]} size={[95, 18]} orientation="horizontal" />
      <RoadSegment position={[115, -85]} size={[95, 18]} orientation="horizontal" />
      <RoadSegment position={[-135, -285]} size={[18, 415]} orientation="vertical" />
      <RoadSegment position={[135, -285]} size={[18, 415]} orientation="vertical" />
      <RoadSegment position={[0, -485]} size={[288, 18]} orientation="horizontal" />
      <RoadSegment position={[0, -280]} size={[252, 16]} orientation="horizontal" />
      <RoadSegment position={[40, -360]} size={[172, 15]} orientation="horizontal" />
      <RoadSegment position={[-45, -320]} size={[14, 80]} orientation="vertical" />

      {/* 2. INTERSECTION WAYFINDING SIGNBOARDS */}
      <Signboard
        position={[-42, 0, -52]}
        rotation={[0, Math.PI / 6, 0]}
        title="LEFT LOOP: LIBRARY, ECE, MATH & EE"
        subtitle="Left: ECE • Mining | Right: Library • Math (1F) & EE (2F) • Metallurgy"
        arrow="left"
      />
      <Signboard
        position={[42, 0, -52]}
        rotation={[0, -Math.PI / 6, 0]}
        title="RIGHT LOOP: NETAJI, MECH & INDUSTRIAL"
        subtitle="Left: Netaji • HSS • GG • Civil • Mech • VGSoM | Right: Arch • Edu • Cryo • IM"
        arrow="right"
      />

      {/* 3. BUILDINGS + ON-WALL FACADE SIGNS + ROADSIDE FRONT BOARDS */}
      {CAMPUS_BUILDINGS.map((b) => {
        const [w, h, d] = b.size
        const [x, z] = b.pos

        let porchOffset = [0, 2.5, d / 2 + 2]
        let porchSize = [8, 5, 4]
        let wallSignPos = [0, h - 3.2, d / 2 + 0.15]
        let wallSignRot = [0, 0, 0]
        let wallWidth = w
        let frontBoardPos = [0, 0, d / 2 + 9]
        let frontBoardRot = [0, 0, 0]

        if (b.entranceSide === 'left') {
          porchOffset = [-w / 2 - 2, 2.5, 0]
          porchSize = [4, 5, 8]
          wallSignPos = [-w / 2 - 0.15, h - 3.2, 0]
          wallSignRot = [0, -Math.PI / 2, 0]
          wallWidth = d
          frontBoardPos = [-w / 2 - 10, 0, 0]
          frontBoardRot = [0, -Math.PI / 2, 0]
        } else if (b.entranceSide === 'right') {
          porchOffset = [w / 2 + 2, 2.5, 0]
          porchSize = [4, 5, 8]
          wallSignPos = [w / 2 + 0.15, h - 3.2, 0]
          wallSignRot = [0, Math.PI / 2, 0]
          wallWidth = d
          frontBoardPos = [w / 2 + 10, 0, 0]
          frontBoardRot = [0, Math.PI / 2, 0]
        }

        return (
          <group key={b.id} position={[x, GROUND_Y, z]}>
            {/* Concrete Foundation Plinth */}
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[w + 3, 0.8, d + 3]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.8} />
            </mesh>

            {/* Render 3D GLB Model if available, otherwise fallback to procedural building */}
            {b.modelPath ? (
              <Suspense fallback={null}>
                <DepartmentGLB
                  path={b.modelPath}
                  targetSize={b.size}
                  entranceSide={b.entranceSide}
                  modelRotationOffset={b.modelRotationOffset || 0}
                  modelScale={b.modelScale || 1}
                  modelOffset={b.modelOffset || [0, 0, 0]}
                />
              </Suspense>
            ) : b.isTwoFloorShared ? (
              <>
                {/* 1st Floor: Mathematics */}
                <mesh position={[0, h / 4 + 0.8, 0]}>
                  <boxGeometry args={[w, h / 2, d]} />
                  <meshStandardMaterial color={b.color} roughness={0.65} />
                </mesh>

                {/* Floor Divider Ledge */}
                <mesh position={[0, h / 2 + 0.8, 0]}>
                  <boxGeometry args={[w + 1.4, 0.9, d + 1.4]} />
                  <meshStandardMaterial color="#f8fafc" />
                </mesh>

                {/* 2nd Floor: Electrical Engineering */}
                <mesh position={[0, (3 * h) / 4 + 0.8, 0]}>
                  <boxGeometry args={[w, h / 2, d]} />
                  <meshStandardMaterial color={b.upperFloorColor} roughness={0.65} />
                </mesh>

                {/* 2nd Floor Mounted Wall Sign */}
                <BuildingWallSign
                  position={[-w / 2 - 0.15, (3 * h) / 4 + 1.2, 0]}
                  rotation={[0, -Math.PI / 2, 0]}
                  name="2nd Floor: Electrical Engg."
                  code="EE DEPT"
                  maxWidth={d}
                />

                {/* 1st Floor Mounted Wall Sign */}
                <BuildingWallSign
                  position={[-w / 2 - 0.15, h / 4 + 1.8, 0]}
                  rotation={[0, -Math.PI / 2, 0]}
                  name="1st Floor: Mathematics Dept."
                  code="MATH DEPT"
                  maxWidth={d}
                />
              </>
            ) : (
              <>
                <mesh position={[0, h / 2 + 0.8, 0]}>
                  <boxGeometry args={[w, h, d]} />
                  <meshStandardMaterial color={b.color} roughness={0.65} />
                </mesh>

                <BuildingWallSign
                  position={wallSignPos}
                  rotation={wallSignRot}
                  name={b.name}
                  code={b.code}
                  maxWidth={wallWidth}
                />

                {/* Roof Cornice Trim */}
                <mesh position={[0, h + 1.2, 0]}>
                  <boxGeometry args={[w + 1.2, 0.8, d + 1.2]} />
                  <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
                </mesh>

                {/* Entrance Porch Facing the Road */}
                <mesh position={porchOffset}>
                  <boxGeometry args={porchSize} />
                  <meshStandardMaterial color="#e2e8f0" />
                </mesh>
              </>
            )}

            {/* Roadside Front Name Board in front of every Building (both GLB and procedural) */}
            <DepartmentFrontBoard
              position={frontBoardPos}
              rotation={frontBoardRot}
              name={b.name}
              code={b.code}
            />
          </group>
        )
      })}
    </group>
  )
}

// Preload all 8 department GLB models
useGLTF.preload('/models/Cryogenic_Engineering_Centre.glb')
useGLTF.preload('/models/Department_of_Civil_Engineering.glb')
useGLTF.preload('/models/Department_of_Mechanical_Engineering.glb')
useGLTF.preload('/models/iit_kgp_hss_geology_complex.glb')
useGLTF.preload('/models/iit_kgp_industrial_dept.glb')
useGLTF.preload('/models/iit_kgp_metallurgy_dept.glb')
useGLTF.preload('/models/Netaji_Auditorium.glb')
useGLTF.preload('/models/VGSOM.glb')