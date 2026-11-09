import React, { Suspense, useMemo } from 'react'
import { Text, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const GROUND_Y = -4
const GRASS_Y = GROUND_Y - 0.05
const ROAD_Y = GROUND_Y + 0.04

// Shared materials to minimize WebGL shader compilations and draw overhead
const SHARED_MATERIALS = {
  grass: new THREE.MeshStandardMaterial({ color: '#2d5a22', roughness: 0.95 }),
  asphalt: new THREE.MeshStandardMaterial({
    color: '#22252a',
    roughness: 0.9,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  }),
  curb: new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 0.8 }),
  laneLine: new THREE.MeshStandardMaterial({
    color: '#e5e7eb',
    polygonOffset: true,
    polygonOffsetFactor: -2,
  }),
  plinth: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.8 }),
  signPillar: new THREE.MeshStandardMaterial({ color: '#374151', metalness: 0.6, roughness: 0.4 }),
  signGreen: new THREE.MeshStandardMaterial({ color: '#0b4f26', roughness: 0.5 }),
  signWhite: new THREE.MeshStandardMaterial({ color: '#f8fafc' }),
  boardPillar: new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.7, roughness: 0.3 }),
  boardSlate: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4 }),
  wallGold: new THREE.MeshStandardMaterial({ color: '#facc15' }),
  wallDark: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.6 }),
  cornice: new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.5 }),
  porch: new THREE.MeshStandardMaterial({ color: '#e2e8f0' }),
  collider: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
}

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
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        child.userData.isBuildingCollider = true
      }
    })

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

// 4-Sided Invisible Wall Collision Preventer around every building
function BuildingCollisionPreventer({ width, height, depth, buildingId }) {
  const wallThickness = 1.2
  const halfW = width / 2
  const halfD = depth / 2
  const centerY = height / 2

  const colliderMeta = useMemo(
    () => ({ isBuildingCollider: true, buildingId }),
    [buildingId]
  )

  return (
    <group name={`collider-${buildingId}`} userData={colliderMeta}>
      {/* North Wall (-Z) */}
      <mesh
        position={[0, centerY, -halfD]}
        material={SHARED_MATERIALS.collider}
        userData={{ ...colliderMeta, side: 'north' }}
      >
        <boxGeometry args={[width + wallThickness, height, wallThickness]} />
      </mesh>
      {/* South Wall (+Z) */}
      <mesh
        position={[0, centerY, halfD]}
        material={SHARED_MATERIALS.collider}
        userData={{ ...colliderMeta, side: 'south' }}
      >
        <boxGeometry args={[width + wallThickness, height, wallThickness]} />
      </mesh>
      {/* West Wall (-X) */}
      <mesh
        position={[-halfW, centerY, 0]}
        material={SHARED_MATERIALS.collider}
        userData={{ ...colliderMeta, side: 'west' }}
      >
        <boxGeometry args={[wallThickness, height, depth + wallThickness]} />
      </mesh>
      {/* East Wall (+X) */}
      <mesh
        position={[halfW, centerY, 0]}
        material={SHARED_MATERIALS.collider}
        userData={{ ...colliderMeta, side: 'east' }}
      >
        <boxGeometry args={[wallThickness, height, depth + wallThickness]} />
      </mesh>
    </group>
  )
}

// 1. Intersection Route Signboard (Double-Sided)
function Signboard({ position, rotation = [0, 0, 0], title, subtitle, arrow = 'right' }) {
  const frontText = arrow === 'left' ? `◄ ${title}` : `${title} ►`
  const backText = arrow === 'left' ? `${title} ►` : `◄ ${title}`

  return (
    <group position={[position[0], GROUND_Y, position[2]]} rotation={rotation}>
      <mesh position={[-4.5, 3, 0]} material={SHARED_MATERIALS.signPillar}>
        <cylinderGeometry args={[0.15, 0.15, 6, 12]} />
      </mesh>
      <mesh position={[4.5, 3, 0]} material={SHARED_MATERIALS.signPillar}>
        <cylinderGeometry args={[0.15, 0.15, 6, 12]} />
      </mesh>

      <mesh position={[0, 5.2, 0]} material={SHARED_MATERIALS.signGreen}>
        <boxGeometry args={[12, 2.6, 0.26]} />
      </mesh>

      <mesh position={[0, 5.2, 0]} material={SHARED_MATERIALS.signWhite}>
        <boxGeometry args={[12.3, 2.85, 0.22]} />
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
      <mesh position={[-boardWidth / 2 + 0.8, 2.2, 0]} material={SHARED_MATERIALS.boardPillar}>
        <cylinderGeometry args={[0.14, 0.14, 4.4, 12]} />
      </mesh>
      <mesh position={[boardWidth / 2 - 0.8, 2.2, 0]} material={SHARED_MATERIALS.boardPillar}>
        <cylinderGeometry args={[0.14, 0.14, 4.4, 12]} />
      </mesh>

      {/* Outer White Frame */}
      <mesh position={[0, 3.4, 0]} material={SHARED_MATERIALS.signWhite}>
        <boxGeometry args={[boardWidth + 0.4, 2.5, 0.22]} />
      </mesh>

      {/* Inner Dark Blue/Slate Sign Plate */}
      <mesh position={[0, 3.4, 0]} material={SHARED_MATERIALS.boardSlate}>
        <boxGeometry args={[boardWidth, 2.2, 0.26]} />
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
      <mesh position={[0, 0, 0]} material={SHARED_MATERIALS.wallGold}>
        <boxGeometry args={[plateWidth + 0.6, 4.6, 0.18]} />
      </mesh>

      {/* Dark Contrast Fascia Board on the Wall */}
      <mesh position={[0, 0, 0.06]} material={SHARED_MATERIALS.wallDark}>
        <boxGeometry args={[plateWidth, 4.1, 0.2]} />
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={SHARED_MATERIALS.asphalt} receiveShadow>
        <planeGeometry args={[width, length]} />
      </mesh>

      <mesh
        position={
          orientation === 'vertical' ? [-width / 2 - 0.8, 0.08, 0] : [0, 0.08, -length / 2 - 0.8]
        }
        material={SHARED_MATERIALS.curb}
      >
        <boxGeometry
          args={orientation === 'vertical' ? [1.6, 0.16, length] : [width, 0.16, 1.6]}
        />
      </mesh>
      <mesh
        position={
          orientation === 'vertical' ? [width / 2 + 0.8, 0.08, 0] : [0, 0.08, length / 2 + 0.8]
        }
        material={SHARED_MATERIALS.curb}
      >
        <boxGeometry
          args={orientation === 'vertical' ? [1.6, 0.16, length] : [width, 0.16, 1.6]}
        />
      </mesh>

      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={SHARED_MATERIALS.laneLine}
      >
        <planeGeometry
          args={orientation === 'vertical' ? [0.35, length * 0.94] : [width * 0.94, 0.35]}
        />
      </mesh>
    </group>
  )
}

// 5. Handmade Map Building Coordinates + Mapped GLB Paths, Scale & Rotation Controls (UNTOUCHED)
export const CAMPUS_BUILDINGS = [
  // LEFT ROUTE — OUTER LEFT SIDE
  {
    id: 'ece',
    name: 'Dept. of ECE',
    code: 'ECE',
    pos: [-200, -210],
    size: [40, 20, 75],
    color: '#0d9488',
    entranceSide: 'right',
    modelPath: '/models/iit_kgp_ece_dept.glb',
    modelScale: 2.5,
    modelRotationOffset: 0,
  },
  {
    id: 'mining',
    name: 'Dept. of Mining Engineering',
    code: 'MINING',
    pos: [-200, -400],
    size: [40, 18, 75],
    color: '#57534e',
    entranceSide: 'right',
    modelPath: '/models/iit_kgp_mining_dept.glb',
    modelScale: 2,
    modelRotationOffset: 0,
  },

  // LEFT ROUTE — INNER RIGHT SIDE
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
    pos: [-85, -210],
    size: [44, 24, 65],
    color: '#ca8a04',
    upperFloorColor: '#b45309',
    isTwoFloorShared: true,
    entranceSide: 'left',
    modelPath: '/models/iit_kgp_electrical_math_complex.glb',
    modelScale: 1.8,
    modelRotationOffset: 0,
  },
  {
    id: 'metallurgy',
    name: 'Dept. of Metallurgy & Materials',
    code: 'METALLURGY',
    pos: [-90, -340],
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
    pos: [-20, -430],
    size: [54, 16, 65],
    color: '#475569',
    entranceSide: 'front',
    modelPath: '/models/Training_Workshop_Mech_Eng_IIT_KGP.glb',
    modelScale: 1.8,
    modelRotationOffset: Math.PI / 2,
  },
  {
    id: 'rubber',
    name: 'Rubber Technology',
    code: 'RUBBER',
    pos: [18, -320],
    size: [45, 20, 46],
    color: '#78716c',
    entranceSide: 'front',
    modelPath: '/models/Rubber_Technology_Centre_IIT_KGP.glb',
    modelScale: 1.5,
    modelRotationOffset: 0,
  },

  // RIGHT ROUTE — INNER LEFT SIDE
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
    modelRotationOffset: -Math.PI / 2,
    modelOffset: [0, 0, 0],
  },
  {
    id: 'hss',
    name: 'Humanities & Social Sciences',
    code: 'HSS',
    pos: [80, -195],
    size: [42, 18, 36],
    color: '#be185d',
    entranceSide: 'right',
    modelPath: '/models/iit_kgp_hss_geology_complex.glb',
    modelScale: 3.2,
    modelRotationOffset: 0,
    modelOffset: [0, 0, 0],
  },
  {
    id: 'geology',
    name: 'Geology & Geophysics',
    code: 'GEOLOGY',
    pos: [88, -230],
    size: [42, 18, 38],
    color: '#a16207',
    entranceSide: 'right',
    modelPath: '/models/iit_kgp_hss_geology_complex.glb',
    modelScale: 0.1,
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
    pos: [88, -405],
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
    pos: [92, -485],
    size: [44, 22, 38],
    color: '#7c2d12',
    entranceSide: 'right',
    modelPath: '/models/VGSOM.glb',
    modelScale: 2.5,
    modelRotationOffset: 0,
    modelOffset: [0, 0, 0],
  },

  // RIGHT ROUTE — OUTER RIGHT SIDE
  {
    id: 'arch',
    name: 'Architecture Department',
    code: 'ARCHITECTURE',
    pos: [190, -130],
    size: [40, 18, 44],
    color: '#0f766e',
    entranceSide: 'left',
    modelPath: '/models/iit_kgp_architecture_dept.glb',
    modelScale: 2.9,
    modelRotationOffset: 0,
  },
  {
    id: 'education',
    name: 'Education Department',
    code: 'EDUCATION',
    pos: [190, -230],
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
    pos: [205, -300],
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
    pos: [205, -420],
    size: [42, 20, 54],
    color: '#1d4ed8',
    entranceSide: 'left',
    modelPath: '/models/iit_kgp_industrial_dept.glb',
    modelScale: 2,
    modelRotationOffset: 0,
    modelOffset: [0, 0, 0],
  },
]

// Precomputed 4-sided AABB collision boxes for every building (accounting for scaled walls while allowing outer grass access)
export const CAMPUS_BUILDING_COLLIDERS = CAMPUS_BUILDINGS.map((b) => {
  const [w, h, d] = b.size
  const [x, z] = b.pos
  const scale = b.modelPath ? b.modelScale || 1 : 1
  // 0.72 factor tightly wraps the solid building walls inside the GLB's outer grass margin
  const wallFactor = b.modelPath ? Math.max(1, scale * 0.72) : 1
  const colW = w * wallFactor
  const colD = d * wallFactor
  const colH = h * Math.max(1, scale) + 6

  return {
    id: b.id,
    name: b.name,
    centerX: x,
    centerZ: z,
    width: colW,
    height: colH,
    depth: colD,
    minX: x - colW / 2,
    maxX: x + colW / 2,
    minZ: z - colD / 2,
    maxZ: z + colD / 2,
  }
})

/**
 * Call this helper inside your player/camera movement loop (useFrame)
 * to prevent passing through any building from North, South, East, or West.
 */
export function resolveBuildingCollisions(nextPosition, playerRadius = 2.2) {
  for (let i = 0; i < CAMPUS_BUILDING_COLLIDERS.length; i++) {
    const box = CAMPUS_BUILDING_COLLIDERS[i]
    if (box.width < 5 || box.depth < 5) continue // Skip tiny sub-complexes like geology (0.1 scale)

    const minX = box.minX - playerRadius
    const maxX = box.maxX + playerRadius
    const minZ = box.minZ - playerRadius
    const maxZ = box.maxZ + playerRadius

    if (
      nextPosition.x > minX &&
      nextPosition.x < maxX &&
      nextPosition.z > minZ &&
      nextPosition.z < maxZ
    ) {
      const penLeft = nextPosition.x - minX
      const penRight = maxX - nextPosition.x
      const penFront = nextPosition.z - minZ
      const penBack = maxZ - nextPosition.z

      const minPen = Math.min(penLeft, penRight, penFront, penBack)
      if (minPen === penLeft) nextPosition.x = minX
      else if (minPen === penRight) nextPosition.x = maxX
      else if (minPen === penFront) nextPosition.z = minZ
      else nextPosition.z = maxZ
    }
  }
  return nextPosition
}

// Road avenue centers tailored to your scaled building arrangement
const LEFT_ROAD_X = -140
const RIGHT_ROAD_X = 152

export default function CampusLoop() {
  return (
    <group>
      {/* 0. CONTINUOUS CAMPUS GRASS */}
      <mesh
        position={[0, GRASS_Y, -300]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={SHARED_MATERIALS.grass}
        receiveShadow
      >
        <planeGeometry args={[2800, 2800]} />
      </mesh>

      {/* 1. RE-ALIGNED ROAD NETWORK (Clears VGSoM, Workshop, HSS & Scaled Outer Grass) */}
      {/* Top Entry Branches from Main Building Loop */}
      <RoadSegment position={[-112, -72]} size={[74, 18]} orientation="horizontal" />
      <RoadSegment position={[118, -72]} size={[86, 18]} orientation="horizontal" />

      {/* Left Main Vertical Avenue (X = -140, cleanly between ECE/Mining and Library/Math-EE/Metallurgy) */}
      <RoadSegment position={[LEFT_ROAD_X, -313.5]} size={[18, 501]} orientation="vertical" />

      {/* Right Main Vertical Avenue (X = +152, shifted East so VGSoM & HSS don't touch the asphalt) */}
      <RoadSegment position={[RIGHT_ROAD_X, -313.5]} size={[18, 501]} orientation="vertical" />

      {/* Bottom Loop Closure (Z = -555, passes cleanly south of VGSoM, Workshop & Metallurgy) */}
      <RoadSegment position={[6, -555]} size={[310, 18]} orientation="horizontal" />

      {/* Middle Core Connector Roads (Serving Rubber Technology & Workshop without overlapping them) */}
      <RoadSegment position={[6, -268]} size={[274, 15]} orientation="horizontal" />
      <RoadSegment position={[48, -365]} size={[190, 14]} orientation="horizontal" />
      <RoadSegment position={[-46, -316.5]} size={[14, 111]} orientation="vertical" />
      <RoadSegment position={[-15, -518]} size={[14, 74]} orientation="vertical" />

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

      {/* 3. BUILDINGS + 4-SIDED COLLISION PREVENTERS + ROADSIDE FRONT BOARDS */}
      {CAMPUS_BUILDINGS.map((b, idx) => {
        const [w, h, d] = b.size
        const [x, z] = b.pos
        const collider = CAMPUS_BUILDING_COLLIDERS[idx]

        let porchOffset = [0, 2.5, d / 2 + 2]
        let porchSize = [8, 5, 4]
        let wallSignPos = [0, h - 3.2, d / 2 + 0.15]
        let wallSignRot = [0, 0, 0]
        let wallWidth = w

        // Place roadside front boards right beside the new road curb so scaled GLB grass never buries them
        let frontBoardPos = [0, 0, ( b.id === 'workshop' ? -78 : -44 )]
        let frontBoardRot = [0, Math.PI, 0]

        if (b.entranceSide === 'left') {
          porchOffset = [-w / 2 - 2, 2.5, 0]
          porchSize = [4, 5, 8]
          wallSignPos = [-w / 2 - 0.15, h - 3.2, 0]
          wallSignRot = [0, -Math.PI / 2, 0]
          wallWidth = d
          const targetRoadCurbX = x < 0 ? LEFT_ROAD_X + 13.5 : RIGHT_ROAD_X + 13.5
          frontBoardPos = [targetRoadCurbX - x, 0, 0]
          frontBoardRot = [0, -Math.PI / 2, 0]
        } else if (b.entranceSide === 'right') {
          porchOffset = [w / 2 + 2, 2.5, 0]
          porchSize = [4, 5, 8]
          wallSignPos = [w / 2 + 0.15, h - 3.2, 0]
          wallSignRot = [0, Math.PI / 2, 0]
          wallWidth = d
          const targetRoadCurbX = x < 0 ? LEFT_ROAD_X - 13.5 : RIGHT_ROAD_X - 13.5
          frontBoardPos = [targetRoadCurbX - x, 0, 0]
          frontBoardRot = [0, Math.PI / 2, 0]
        }

        return (
          <group key={b.id} position={[x, GROUND_Y, z]}>
            {/* 4-Sided Wall Collision Preventer Cage */}
            <BuildingCollisionPreventer
              width={collider.width}
              height={collider.height}
              depth={collider.depth}
              buildingId={b.id}
            />

            {/* Concrete Foundation Plinth */}
            <mesh position={[0, 0.4, 0]} material={SHARED_MATERIALS.plinth} receiveShadow>
              <boxGeometry args={[w + 3, 0.8, d + 3]} />
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
                <mesh position={[0, h / 2 + 0.8, 0]} material={SHARED_MATERIALS.signWhite}>
                  <boxGeometry args={[w + 1.4, 0.9, d + 1.4]} />
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
                <mesh position={[0, h + 1.2, 0]} material={SHARED_MATERIALS.cornice}>
                  <boxGeometry args={[w + 1.2, 0.8, d + 1.2]} />
                </mesh>

                {/* Entrance Porch Facing the Road */}
                <mesh position={porchOffset} material={SHARED_MATERIALS.porch}>
                  <boxGeometry args={porchSize} />
                </mesh>
              </>
            )}

            {/* Roadside Front Name Board in front of every Building (Aligned cleanly along the road edge) */}
            {b.modelScale !== 0.1 && (
              <DepartmentFrontBoard
                position={frontBoardPos}
                rotation={frontBoardRot}
                name={b.name}
                code={b.code}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

// Automatically preload all unique department GLB models configured in CAMPUS_BUILDINGS
const UNIQUE_MODEL_PATHS = [
  ...new Set(CAMPUS_BUILDINGS.map((b) => b.modelPath).filter(Boolean)),
]
UNIQUE_MODEL_PATHS.forEach((path) => useGLTF.preload(path))