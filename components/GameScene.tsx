import React, { useState, useRef, useEffect, useCallback, memo, useMemo, forwardRef, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, BakeShadows, Text, Billboard, OrbitControls, PointLight } from '@react-three/drei';
import * as THREE from 'three';
import { PlayerStats, GameMessage, FarmingStage, Enemy } from '../types';
import { COLORS, XP_TABLE, LEVEL_FORMULA, MAX_HIT_FORMULA } from '../constants';
import { examineObject } from '../services/geminiService';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// --- Props ---
interface GameSceneProps {
  stats: PlayerStats;
  setStats: React.Dispatch<React.SetStateAction<PlayerStats>>;
  addMessage: (text: string, type: GameMessage['type']) => void;
  setHoverAction: (action: string | null) => void;
  playerTarget: THREE.Vector3;
  setPlayerTarget: (pos: THREE.Vector3) => void;
  enemies: Enemy[];
  setEnemies: React.Dispatch<React.SetStateAction<Enemy[]>>;
}

// --- Helper Components ---
const CameraController = ({ playerRef, shakeIntensity }: { playerRef: React.RefObject<THREE.Group>, shakeIntensity: number }) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useFrame(() => {
    if (playerRef.current && controlsRef.current) {
      // Calculate shake offset
      const shakeX = (Math.random() - 0.5) * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * shakeIntensity;
      const shakeZ = (Math.random() - 0.5) * shakeIntensity;

      // STRICT FOLLOW: Copy player pos and add shake
      controlsRef.current.target.copy(playerRef.current.position).add(new THREE.Vector3(shakeX, shakeY, shakeZ));
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enablePan={false} 
      enableZoom={true}
      maxPolarAngle={Math.PI / 2 - 0.1} 
      minDistance={5}
      maxDistance={30}
      mouseButtons={{
        LEFT: undefined as any, 
        MIDDLE: THREE.MOUSE.ROTATE,
        RIGHT: THREE.MOUSE.PAN
      }}
    />
  );
};

// --- Scenery Components ---
const GrassField = memo(() => {
  const count = 15000; 
  const range = 200;  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * range;
      const z = (Math.random() - 0.5) * range;
      // Clear areas for features
      if (Math.abs(x) < 4 && Math.abs(z) < 4) continue; // Home
      if (x > 3 && x < 7 && z > 3 && z < 7) continue; // Farm
      if (x > 3 && x < 9 && z > -9 && z < -3) continue; // Goblin Camp
      if (x < -3 && x > -8 && z > 1 && z < 6) continue; // Pond

      const scale = 0.5 + Math.random() * 0.6;
      const rotation = Math.random() * Math.PI;
      temp.push({ x, z, scale, rotation });
    }
    return temp;
  }, []);

  useEffect(() => {
    if (meshRef.current) {
      particles.forEach((p, i) => {
        dummy.position.set(p.x, 0, p.z);
        dummy.rotation.set(0, p.rotation, 0);
        dummy.scale.set(p.scale, p.scale, p.scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
        const color = new THREE.Color(COLORS.GROUND).lerp(new THREE.Color('#3a4f28'), Math.random() * 0.5);
        meshRef.current!.setColorAt(i, color);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [dummy, particles]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} receiveShadow>
       <coneGeometry args={[0.05, 0.4, 3]} />
       <meshStandardMaterial color={COLORS.GROUND} roughness={1} />
    </instancedMesh>
  );
});

const Tree = memo(({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => (
    <group position={position} scale={scale}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.2, 0.3, 1.5, 6]} />
            <meshStandardMaterial color={COLORS.TREE_TRUNK} />
        </mesh>
        <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.9]} />
            <meshStandardMaterial color={COLORS.TREE_LEAVES_DARK} />
        </mesh>
        <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.7]} />
            <meshStandardMaterial color={COLORS.TREE_LEAVES_LIGHT} />
        </mesh>
    </group>
));

const Bush = memo(({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => (
    <group position={position} scale={scale}>
         <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.5]} />
            <meshStandardMaterial color={COLORS.TREE_LEAVES_DARK} />
        </mesh>
        <mesh position={[0.2, 0.5, 0.2]} castShadow>
             <dodecahedronGeometry args={[0.3]} />
             <meshStandardMaterial color={COLORS.TREE_LEAVES_LIGHT} />
        </mesh>
    </group>
));

const Rock = memo(({ position, scale = 1, rotation = [0,0,0] }: { position: [number, number, number], scale?: number, rotation?: [number, number, number] }) => (
    <group position={position} rotation={rotation as any} scale={scale}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.4]} />
            <meshStandardMaterial color={COLORS.ROCK_BASE} />
        </mesh>
        <mesh position={[0.2, 0.2, 0.1]} castShadow>
             <boxGeometry args={[0.2, 0.2, 0.2]} />
             <meshStandardMaterial color={COLORS.ROCK_HIGHLIGHT} />
        </mesh>
    </group>
));

const Mushroom = memo(({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => (
    <group position={position} scale={scale}>
        <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.2]} />
            <meshStandardMaterial color={COLORS.MUSHROOM_STEM} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
             <coneGeometry args={[0.2, 0.15, 8]} />
             <meshStandardMaterial color={COLORS.MUSHROOM_RED} />
        </mesh>
    </group>
));

// --- Enhanced Props Components ---
const Crate = memo(({ position, rotation = 0 }: { position: [number, number, number], rotation?: number }) => (
    <group position={[position[0], 0, position[2]]} rotation={[0, rotation, 0]} scale={0.8}>
        {/* Main Box */}
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.7, 0.7, 0.7]} />
            <meshStandardMaterial color={COLORS.WOOD_LIGHT} />
        </mesh>
        {/* Framing */}
        <mesh position={[0, 0.35, 0]} castShadow>
             <boxGeometry args={[0.72, 0.68, 0.68]} /> {/* Side frames */}
             <meshStandardMaterial color={COLORS.WOOD_DARK} />
        </mesh>
        <mesh position={[0, 0.35, 0]} castShadow>
             <boxGeometry args={[0.68, 0.72, 0.68]} /> {/* Top/Bottom frames */}
             <meshStandardMaterial color={COLORS.WOOD_DARK} />
        </mesh>
        {/* Diagonal Bracing */}
        <mesh position={[0, 0.35, 0.36]} rotation={[0, 0, Math.PI/4]}>
            <boxGeometry args={[0.8, 0.08, 0.02]} />
            <meshStandardMaterial color={COLORS.WOOD_DARK} />
        </mesh>
         <mesh position={[0, 0.35, 0.36]} rotation={[0, 0, -Math.PI/4]}>
            <boxGeometry args={[0.8, 0.08, 0.02]} />
            <meshStandardMaterial color={COLORS.WOOD_DARK} />
        </mesh>
    </group>
));

const Barrel = memo(({ position }: { position: [number, number, number] }) => (
    <group position={[position[0], 0.35, position[2]]}>
        {/* Main Body */}
        <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.7, 10]} />
            <meshStandardMaterial color={COLORS.WOOD_DARK} />
        </mesh>
        {/* Metal Bands */}
        <mesh position={[0, 0.2, 0]}>
             <cylinderGeometry args={[0.29, 0.29, 0.05, 10]} />
             <meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
             <cylinderGeometry args={[0.29, 0.29, 0.05, 10]} />
             <meshStandardMaterial color="#333" roughness={0.5} metalness={0.8} />
        </mesh>
        {/* Vertical Plank Details (simulated with thin boxes) */}
        {[...Array(6)].map((_, i) => (
             <mesh key={i} rotation={[0, (i * Math.PI) / 3, 0]} position={[Math.sin((i * Math.PI) / 3)*0.28, 0, Math.cos((i * Math.PI) / 3)*0.28]}>
                 <boxGeometry args={[0.02, 0.7, 0.02]} />
                 <meshStandardMaterial color="#2d1f15" />
             </mesh>
        ))}
    </group>
));

const Campfire = memo(({ position }: { position: [number, number, number] }) => {
    const lightRef = useRef<THREE.PointLight>(null);
    const fireRef = useRef<THREE.Group>(null);
    
    useFrame(({ clock }) => {
        if (lightRef.current) {
            lightRef.current.intensity = 1.5 + Math.sin(clock.elapsedTime * 15) * 0.5 + Math.random() * 0.3;
        }
        if (fireRef.current) {
            fireRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 10) * 0.1);
            fireRef.current.rotation.y += 0.05;
        }
    });

    return (
        <group position={position}>
            {/* Stone Ring */}
            {[...Array(8)].map((_, i) => (
                <mesh key={i} position={[Math.sin(i * Math.PI/4)*0.4, 0.05, Math.cos(i * Math.PI/4)*0.4]} castShadow>
                     <dodecahedronGeometry args={[0.08]} />
                     <meshStandardMaterial color={COLORS.ROCK_BASE} />
                </mesh>
            ))}
            
            {/* Charred Logs */}
            <group position={[0, 0.05, 0]}>
                <mesh rotation={[Math.PI/4, 0, Math.PI/4]} castShadow>
                    <cylinderGeometry args={[0.05, 0.05, 0.5]} />
                    <meshStandardMaterial color="#2a1f1b" />
                </mesh>
                 <mesh rotation={[Math.PI/4, Math.PI/2, -Math.PI/4]} castShadow>
                    <cylinderGeometry args={[0.05, 0.05, 0.5]} />
                    <meshStandardMaterial color="#2a1f1b" />
                </mesh>
            </group>

            {/* Fire */}
            <group ref={fireRef} position={[0, 0.1, 0]}>
                <mesh position={[0, 0.1, 0]}>
                    <coneGeometry args={[0.15, 0.4, 5]} />
                    <meshStandardMaterial color={COLORS.FIRE_ORANGE} emissive={COLORS.FIRE_ORANGE} emissiveIntensity={1.5} transparent opacity={0.8} />
                </mesh>
                 <mesh position={[0, 0.2, 0]} rotation={[0, 1, 0]}>
                    <coneGeometry args={[0.1, 0.3, 5]} />
                    <meshStandardMaterial color={COLORS.FIRE_YELLOW} emissive={COLORS.FIRE_YELLOW} emissiveIntensity={2} transparent opacity={0.8} />
                </mesh>
            </group>
            
            <pointLight ref={lightRef} position={[0, 0.5, 0]} color={COLORS.FIRE_ORANGE} distance={8} decay={2} />
        </group>
    );
});

const FenceSection = memo(({ position, rotation = 0 }: { position: [number, number, number], rotation?: number }) => (
    <group position={position} rotation={[0, rotation, 0]}>
        {/* Posts (Uneven) */}
        <mesh position={[-0.5, 0.35, 0]} castShadow>
            <boxGeometry args={[0.12, 0.7, 0.12]} />
            <meshStandardMaterial color={COLORS.WOOD_LIGHT} />
        </mesh>
        <mesh position={[0.5, 0.32, 0]} castShadow>
            <boxGeometry args={[0.12, 0.65, 0.12]} />
            <meshStandardMaterial color={COLORS.WOOD_LIGHT} />
        </mesh>
        
        {/* Rails (Jagged/Rustic) */}
        <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0.05]} castShadow>
            <boxGeometry args={[1.1, 0.08, 0.05]} />
            <meshStandardMaterial color={COLORS.WOOD_DARK} />
        </mesh>
        <mesh position={[0, 0.2, 0]} rotation={[0, 0, -0.02]} castShadow>
            <boxGeometry args={[1.1, 0.08, 0.05]} />
            <meshStandardMaterial color={COLORS.WOOD_DARK} />
        </mesh>
    </group>
));

const Ruins = memo(({ position }: { position: [number, number, number] }) => (
    <group position={position}>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
             <circleGeometry args={[3, 16]} />
             <meshStandardMaterial color="#221100" /> 
        </mesh>
        
        {/* Broken Archway */}
        <group position={[-1, 0, -1]}>
             <mesh position={[0, 0.6, 0]} castShadow>
                  <boxGeometry args={[0.6, 1.2, 0.6]} />
                  <meshStandardMaterial color={COLORS.STONE_RUIN} />
             </mesh>
             {/* Moss */}
             <mesh position={[0.31, 0.2, 0]} rotation={[0, 0, 0]}>
                  <planeGeometry args={[0.2, 0.4]} />
                  <meshStandardMaterial color="#4a6a4a" />
             </mesh>
        </group>
        
        <group position={[1.5, 0, -0.5]} rotation={[0, -0.2, 0]}>
              <mesh position={[0, 0.4, 0]} castShadow>
                  <boxGeometry args={[0.5, 0.8, 0.5]} />
                  <meshStandardMaterial color={COLORS.STONE_RUIN} />
             </mesh>
        </group>

        {/* Fallen Lintel */}
        <mesh position={[0.2, 0.2, 1]} rotation={[0.1, 0.5, 1.4]} castShadow>
            <boxGeometry args={[0.4, 1.5, 0.4]} />
            <meshStandardMaterial color={COLORS.STONE_RUIN} />
        </mesh>

        {/* Scattered Rubble */}
        {[...Array(5)].map((_, i) => (
             <mesh key={i} position={[Math.random()*3 - 1.5, 0.1, Math.random()*3 - 1.5]} rotation={[Math.random(), Math.random(), Math.random()]}>
                 <dodecahedronGeometry args={[0.15]} />
                 <meshStandardMaterial color={COLORS.STONE_RUIN} />
             </mesh>
        ))}
    </group>
));

const Pond = memo(({ position }: { position: [number, number, number] }) => (
    <group position={position}>
         {/* Water */}
         <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
             <circleGeometry args={[2.8, 32]} />
             <meshStandardMaterial color={COLORS.WATER_SURFACE} roughness={0.0} metalness={0.1} />
         </mesh>
         
         {/* Shoreline Ring */}
         <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
             <ringGeometry args={[2.7, 3.2, 32]} />
             <meshStandardMaterial color="#5a4d33" /> 
         </mesh>

         {/* Lily Pads */}
         {[...Array(5)].map((_, i) => (
             <mesh key={i} position={[Math.sin(i*2)*1.5, 0.03, Math.cos(i*2)*1.5]} rotation={[-Math.PI/2, 0, Math.random()]}>
                 <circleGeometry args={[0.3, 12]} />
                 <meshStandardMaterial color="#4a7a4a" />
                 <mesh position={[0.1, 0, 0.01]}>
                      <circleGeometry args={[0.08, 6]} />
                      <meshStandardMaterial color="pink" />
                 </mesh>
             </mesh>
         ))}

         {/* Rocks on shore */}
         {[...Array(8)].map((_, i) => (
             <mesh key={i} position={[Math.sin(i)*2.9, 0.1, Math.cos(i)*2.9]} scale={0.5 + Math.random()}>
                 <dodecahedronGeometry args={[0.2]} />
                 <meshStandardMaterial color={COLORS.ROCK_BASE} />
             </mesh>
         ))}
         
         {/* Reeds */}
         {[...Array(25)].map((_, i) => (
             <mesh key={i} position={[Math.sin(i)*2.6, 0.3, Math.cos(i)*2.6]} rotation={[0, Math.random()*Math.PI, (Math.random()-0.5)*0.2]}>
                 <cylinderGeometry args={[0.02, 0.03, 0.7]} />
                 <meshStandardMaterial color="#3a5a2a" />
             </mesh>
         ))}
    </group>
));

const DirtPath = memo(() => {
    // Generate stepping stones path instead of random dots
    const stones = [];
    
    // Helper to add path segment
    const addSegment = (startX: number, startZ: number, endX: number, endZ: number, count: number) => {
        for(let i=0; i<=count; i++) {
            const t = i/count;
            const x = startX + (endX - startX) * t;
            const z = startZ + (endZ - startZ) * t;
            // Jitter
            const jx = (Math.random() - 0.5) * 0.4;
            const jz = (Math.random() - 0.5) * 0.4;
            stones.push({ x: x+jx, z: z+jz, scale: 0.3 + Math.random()*0.2 });
        }
    };

    addSegment(0, 0, 5, 5, 12); // To Farm
    addSegment(0, 0, 6, -6, 15); // To Goblins
    addSegment(0, 0, -6, 3, 14); // To Pond

    return (
        <group position={[0, 0.015, 0]}>
            {stones.map((s, i) => (
                <mesh key={i} position={[s.x, 0, s.z]} rotation={[-Math.PI/2, 0, Math.random() * Math.PI]} receiveShadow>
                     <circleGeometry args={[s.scale, 7]} />
                     <meshStandardMaterial color={COLORS.PATH_DIRT} roughness={1} />
                </mesh>
            ))}
        </group>
    );
});

const WorldScenery = memo(() => {
    const sceneryItems = useMemo(() => {
        const _items = [];
        // Forest Loop
        for(let i=0; i<80; i++) {
            const x = (Math.random() - 0.5) * 180;
            const z = (Math.random() - 0.5) * 180;
            if(Math.abs(x) < 10 && Math.abs(z) < 10) continue; 
            _items.push(<Tree key={`t-${i}`} position={[x, 0, z]} scale={0.8 + Math.random() * 0.5} />);
        }
        // Rocks
        for(let i=0; i<40; i++) {
            const x = (Math.random() - 0.5) * 180;
            const z = (Math.random() - 0.5) * 180;
            if(Math.abs(x) < 8 && Math.abs(z) < 8) continue;
            _items.push(<Rock key={`r-${i}`} position={[x, 0, z]} scale={0.5 + Math.random()} rotation={[0, Math.random()*Math.PI, 0]} />);
        }
        // Bushes
        for(let i=0; i<30; i++) {
             const x = (Math.random() - 0.5) * 50;
             const z = (Math.random() - 0.5) * 50;
             if(Math.abs(x) < 3 && Math.abs(z) < 3) continue;
             _items.push(<Bush key={`b-${i}`} position={[x, 0, z]} scale={0.8 + Math.random()*0.3} />);
        }
        // Mushrooms
        for(let i=0; i<15; i++) {
             const x = (Math.random() - 0.5) * 20;
             const z = (Math.random() - 0.5) * 20;
             if(Math.abs(x) < 3 && Math.abs(z) < 3) continue;
             _items.push(<Mushroom key={`m-${i}`} position={[x, 0, z]} scale={0.5 + Math.random()*0.5} />);
        }

        return _items;
    }, []);

    return (
        <group>
            <GrassField />
            <DirtPath />
            
            {/* Home Base */}
            <Campfire position={[0, 0, 0]} />
            <Crate position={[1.5, 0, 1.2]} rotation={0.2} />
            <Crate position={[1.5, 0.5, 1.2]} rotation={-0.1} />
            <Barrel position={[1.8, 0, 0.5]} />
            
            {/* Pond Area */}
            <Pond position={[-6, 0, 3]} />

            {/* Goblin Camp Ruins */}
            <Ruins position={[6, 0, -6]} />
            
            {/* Farm Fencing */}
            <group position={[5, 0, 5]}>
                {/* Back */}
                <FenceSection position={[0, 0, -1.5]} />
                <FenceSection position={[1, 0, -1.5]} />
                <FenceSection position={[-1, 0, -1.5]} />
                {/* Front */}
                <FenceSection position={[1, 0, 1.5]} />
                <FenceSection position={[-1, 0, 1.5]} />
                 {/* Left */}
                <FenceSection position={[-1.5, 0, 0]} rotation={Math.PI/2} />
                <FenceSection position={[-1.5, 0, 1]} rotation={Math.PI/2} />
                <FenceSection position={[-1.5, 0, -1]} rotation={Math.PI/2} />
                {/* Right */}
                <FenceSection position={[1.5, 0, 0]} rotation={Math.PI/2} />
                <FenceSection position={[1.5, 0, 1]} rotation={Math.PI/2} />
                <FenceSection position={[1.5, 0, -1]} rotation={Math.PI/2} />
            </group>

            {sceneryItems}
        </group>
    )
})

// --- UI Components ---
const HealthBar = ({ current, max, width = 1, height = 0.15, offset = 1.2 }: { current: number, max: number, width?: number, height?: number, offset?: number }) => {
    const ratio = Math.max(0, current / max);
    let barColor = COLORS.HP_BAR_FILL;
    if (ratio < 0.2) barColor = COLORS.HP_BAR_LOW;
    else if (ratio < 0.5) barColor = '#ffff00';

    return (
        <Billboard position={[0, offset, 0]}>
            <mesh position={[0, 0, 0]}>
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial color={COLORS.HP_BAR_BG} />
            </mesh>
            <mesh position={[(-width / 2) + (width * ratio) / 2, 0, 0.01]}>
                <planeGeometry args={[width * ratio, height * 0.8]} />
                <meshBasicMaterial color={barColor} />
            </mesh>
        </Billboard>
    );
};

// --- Player Component ---
interface PlayerProps {
    targetPosition: THREE.Vector3;
    hp: number;
    maxHp: number;
    combatTargetPos: THREE.Vector3 | null;
    isDying: boolean;
    lastPositionRef: React.MutableRefObject<THREE.Vector3>;
}

const Player = memo(forwardRef<THREE.Group, PlayerProps>(({ targetPosition, hp, maxHp, combatTargetPos, isDying, lastPositionRef }, ref) => {
  const speed = 0.12;
  const [isMoving, setIsMoving] = useState(false);
  
  // Animation Refs
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const deathStartTime = useRef<number | null>(null);

  // Keep a fresh ref to combatTargetPos for useFrame
  const combatTargetPosRef = useRef(combatTargetPos);
  useEffect(() => {
    combatTargetPosRef.current = combatTargetPos;
  }, [combatTargetPos]);

  // RESTORE POSITION ON MOUNT
  useLayoutEffect(() => {
    if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.position.copy(lastPositionRef.current);
    }
  }, [ref, lastPositionRef]);

  useFrame((state) => {
    if (!ref || typeof ref === 'function' || !ref.current) return;
    const group = ref.current;
    
    // --- Dying Logic ---
    if (isDying) {
        const t = state.clock.getElapsedTime();
        if (deathStartTime.current === null) deathStartTime.current = t;
        const elapsed = t - deathStartTime.current;

        // Phase 1: Shock / Jump (0 - 0.15s)
        if (elapsed < 0.15) {
             // Jump up slightly
             group.position.y = THREE.MathUtils.lerp(group.position.y, 0.4, 0.2);
             // Arms flare out
             if (leftArmRef.current) leftArmRef.current.rotation.z = 2.5; // Arms up
             if (rightArmRef.current) rightArmRef.current.rotation.z = -2.5;
             if (weaponRef.current) weaponRef.current.rotation.z = -2.5;
        } 
        // Phase 2: Collapse (0.15 - 0.6s)
        else if (elapsed < 0.6) {
             const progress = (elapsed - 0.15) / 0.45;
             
             // Fall to ground
             group.position.y = THREE.MathUtils.lerp(0.4, 0.1, progress);
             
             // Rotate back to -90 deg
             group.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2, progress);

             // Arms drop back
             if (leftArmRef.current) {
                leftArmRef.current.rotation.z = THREE.MathUtils.lerp(2.5, 0.2, progress);
                leftArmRef.current.rotation.x = THREE.MathUtils.lerp(0, -Math.PI, progress);
             }
             if (rightArmRef.current) {
                rightArmRef.current.rotation.z = THREE.MathUtils.lerp(-2.5, -0.2, progress);
                rightArmRef.current.rotation.x = THREE.MathUtils.lerp(0, -Math.PI, progress);
             }
             if (weaponRef.current) {
                weaponRef.current.rotation.z = THREE.MathUtils.lerp(-2.5, -0.2, progress);
                weaponRef.current.rotation.x = THREE.MathUtils.lerp(0, -Math.PI, progress);
             }
        } 
        // Phase 3: Dead (0.6s+)
        else {
             group.rotation.x = -Math.PI / 2;
             // Sink slightly
             if (group.position.y > -0.15) {
                 group.position.y -= 0.002;
             }
        }
        
        // Reset legs during death
        if(leftLegRef.current) leftLegRef.current.rotation.x = 0;
        if(rightLegRef.current) rightLegRef.current.rotation.x = 0;

        return; // Skip normal movement/anim
    } else {
        // Reset Death State
        deathStartTime.current = null;
        if (group.rotation.x !== 0) group.rotation.x = 0;
        if (group.position.y < 0) group.position.y = 0; 
        
        // Reset Arm Z rotation (flare)
        if (leftArmRef.current) leftArmRef.current.rotation.z = 0;
        if (rightArmRef.current) rightArmRef.current.rotation.z = 0;
        if (weaponRef.current) weaponRef.current.rotation.z = 0;
    }

    // --- Movement Logic ---
    const currentPos = group.position;
    const distance = new THREE.Vector2(currentPos.x, currentPos.z).distanceTo(new THREE.Vector2(targetPosition.x, targetPosition.z));

    if (distance > 0.1) {
      if (!isMoving) setIsMoving(true);
      
      const direction = new THREE.Vector3().subVectors(targetPosition, currentPos).normalize();
      direction.y = 0; 
      
      currentPos.add(direction.multiplyScalar(speed));
      group.lookAt(targetPosition.x, currentPos.y, targetPosition.z);
    } else {
      if (isMoving) setIsMoving(false);
      
      // If stopped and in combat, face the enemy using the REF to avoid stale closure
      const activeTarget = combatTargetPosRef.current;
      if (activeTarget) {
          group.lookAt(activeTarget.x, group.position.y, activeTarget.z);
      }
    }
    
    // UPDATE PERSISTENT REF
    lastPositionRef.current.copy(group.position);

    // --- Animation Logic ---
    const t = state.clock.getElapsedTime();
    
    if (isMoving) {
        // Walking Animation
        if(leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t * 12) * 0.5;
        if(rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(t * 12 + Math.PI) * 0.5;
        
        if(leftArmRef.current) leftArmRef.current.rotation.x = -Math.sin(t * 12) * 0.5;
        if(rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * 12 + Math.PI) * 0.5;
        if(weaponRef.current) weaponRef.current.rotation.x = -Math.sin(t * 12 + Math.PI) * 0.5;
    } else if (combatTargetPosRef.current) {
        // Combat Idle / Attack Animation
        // Reset Legs
        if(leftLegRef.current) leftLegRef.current.rotation.x = 0;
        if(rightLegRef.current) rightLegRef.current.rotation.x = 0;

        // Attack Chop
        const attackSpeed = 8;
        const attackAnim = -Math.abs(Math.sin(t * attackSpeed)); // Always negative (chopping down)
        
        if(rightArmRef.current) rightArmRef.current.rotation.x = attackAnim * 1.5;
        if(weaponRef.current) weaponRef.current.rotation.x = attackAnim * 1.5;
        
        // Defensive arm
        if(leftArmRef.current) leftArmRef.current.rotation.x = -0.5 + Math.sin(t * 2) * 0.1;

    } else {
        // Idle Animation
        if(leftLegRef.current) leftLegRef.current.rotation.x = 0;
        if(rightLegRef.current) rightLegRef.current.rotation.x = 0;
        if(leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * 2) * 0.05;
        if(rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * 2) * 0.05;
        if(weaponRef.current) weaponRef.current.rotation.x = -Math.sin(t * 2) * 0.05;
    }
  });

  const bobOffset = isMoving ? Math.sin(Date.now() / 100) * 0.05 : 0;

  return (
    <group ref={ref} frustumCulled={false}> 
      {/* HP Bar - Only show if not dying/dead */}
      {hp < maxHp && !isDying && hp > 0 && <HealthBar current={hp} max={maxHp} offset={2.1} />}

      <group ref={bodyGroupRef} position={[0, bobOffset, 0]}>
        {/* Legs */}
        <mesh ref={leftLegRef} position={[-0.1, 0.15, 0]} castShadow>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshStandardMaterial color={COLORS.PLAYER_PANTS} />
        </mesh>
        <mesh ref={rightLegRef} position={[0.1, 0.15, 0]} castShadow>
            <boxGeometry args={[0.1, 0.3, 0.1]} />
            <meshStandardMaterial color={COLORS.PLAYER_PANTS} />
        </mesh>
        
        {/* Torso */}
        <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.2]} />
            <meshStandardMaterial color={COLORS.PLAYER_SHIRT} />
        </mesh>

        {/* Arms */}
        <mesh ref={leftArmRef} position={[-0.2, 0.5, 0]} castShadow>
            <boxGeometry args={[0.1, 0.35, 0.1]} />
            <meshStandardMaterial color={COLORS.PLAYER_SHIRT} />
            <mesh position={[0, -0.2, 0]}>
                 <boxGeometry args={[0.09, 0.1, 0.09]} />
                 <meshStandardMaterial color={COLORS.PLAYER_SKIN} />
            </mesh>
        </mesh>

        <group position={[0.2, 0.5, 0]}>
            <mesh ref={rightArmRef} position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.1, 0.35, 0.1]} />
                <meshStandardMaterial color={COLORS.PLAYER_SHIRT} />
                <mesh position={[0, -0.2, 0]}>
                    <boxGeometry args={[0.09, 0.1, 0.09]} />
                    <meshStandardMaterial color={COLORS.PLAYER_SKIN} />
                </mesh>
            </mesh>
            {/* Weapon attached to right arm group - FIXED VERTICAL */}
            {/* Hand is at y: -0.2. Weapon group at -0.2 to be in hand center */}
            <group ref={weaponRef} position={[0, -0.2, 0.05]}> 
                <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0]}> {/* Blade vertical */}
                    <boxGeometry args={[0.05, 0.6, 0.05]} />
                    <meshStandardMaterial color="#888" /> 
                </mesh>
                 <mesh position={[0, 0, 0]} rotation={[0, 0, 1.57]}> {/* Hilt Crossguard */}
                    <boxGeometry args={[0.05, 0.2, 0.05]} />
                    <meshStandardMaterial color="#4a3728" />
                </mesh>
            </group>
        </group>

        {/* Head */}
        <mesh position={[0, 0.825, 0]} castShadow>
            <boxGeometry args={[0.2, 0.25, 0.2]} />
            <meshStandardMaterial color={COLORS.PLAYER_SKIN} />
        </mesh>
        <mesh position={[0, 0.78, 0.1]} castShadow>
            <boxGeometry args={[0.2, 0.12, 0.05]} />
            <meshStandardMaterial color="#4a3728" />
        </mesh>
        
        {/* Name */}
        <Text position={[0, 1.4, 0]} fontSize={0.2} color="yellow" outlineColor="black" outlineWidth={0.02} anchorX="center" anchorY="middle">
            Player
        </Text>
      </group>
    </group>
  );
}));

const EnemyCharacter = memo(({ enemy, setHoverAction, onAttack, playerPos }: { enemy: Enemy, setHoverAction: (a: string | null) => void, onAttack: (id: string, pos: THREE.Vector3) => void, playerPos: THREE.Vector3 }) => {
    
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Group>(null);
    const weaponRef = useRef<THREE.Mesh>(null);
    
    const [isVisualDead, setIsVisualDead] = useState(false);
    const deathStartTime = useRef<number | null>(null);

    // Reset state when enemy respawns (isDead becomes false)
    useEffect(() => {
        if (!enemy.isDead) {
            setIsVisualDead(false);
            deathStartTime.current = null;
            if (groupRef.current) {
                groupRef.current.visible = true;
                groupRef.current.rotation.x = 0;
                groupRef.current.position.y = enemy.position.y;
            }
        }
    }, [enemy.isDead, enemy.position.y]);

    // If "visually" dead (animation finished), render nothing to fully remove from scene
    if (isVisualDead && enemy.isDead) return null;

    useFrame((state) => {
        if (!groupRef.current || !bodyRef.current) return;
        
        // --- Death Animation ---
        if (enemy.isDead) {
             const t = state.clock.getElapsedTime();
             if (deathStartTime.current === null) deathStartTime.current = t;
             const elapsed = t - deathStartTime.current;

             if (elapsed < 1.0) {
                 // Fall animation (1 second)
                 const progress = elapsed / 1.0;
                 groupRef.current.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2, progress);
                 // Sink into ground slightly
                 groupRef.current.position.y = THREE.MathUtils.lerp(enemy.position.y, enemy.position.y - 0.2, progress);
             } else {
                 if (!isVisualDead) {
                     // Hide mesh immediately before unmount to prevent ghosting
                     groupRef.current.visible = false;
                     setIsVisualDead(true);
                 }
             }
             return; // Skip normal animation
        }

        const dist = groupRef.current.position.distanceTo(playerPos);
        const t = state.clock.getElapsedTime();

        // If in combat range, look at player and animate
        if (dist < 2.5) {
            groupRef.current.lookAt(playerPos.x, groupRef.current.position.y, playerPos.z);
            
            // Attack animation
            if (weaponRef.current) {
                // Swing weapon
                 weaponRef.current.rotation.x = 0.5 + Math.sin(t * 5) * 1.2;
            }
            // Bob body angrily
            bodyRef.current.position.y = Math.abs(Math.sin(t * 10)) * 0.05;

        } else {
             // Idle
             if (weaponRef.current) weaponRef.current.rotation.x = 0.5;
             bodyRef.current.position.y = 0;
             // Slow bob
             bodyRef.current.position.y = Math.sin(t) * 0.02;
        }
    });

    const handlePointerOver = (e: any) => {
        if (enemy.isDead) return;
        e.stopPropagation();
        setHoverAction(`Attack ${enemy.name} (Lvl ${enemy.level})`);
        document.body.style.cursor = 'pointer';
    };

    const handlePointerOut = () => {
        setHoverAction(null);
        document.body.style.cursor = 'auto';
    };

    const handleClick = (e: any) => {
        if (enemy.isDead) return;
        e.stopPropagation();
        onAttack(enemy.id, enemy.position);
    };

    return (
        <group ref={groupRef} position={enemy.position}>
             {!enemy.isDead && <HealthBar current={enemy.currentHp} max={enemy.maxHp} />}
             <group 
                ref={bodyRef}
                onPointerOver={handlePointerOver} 
                onPointerOut={handlePointerOut} 
                onClick={handleClick}
             >
                {/* Body */}
                <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.2, 0.25, 0.8, 8]} />
                    <meshStandardMaterial color="#2a4a2a" />
                </mesh>
                {/* Head */}
                <mesh position={[0, 0.9, 0]} castShadow>
                    <dodecahedronGeometry args={[0.25]} />
                    <meshStandardMaterial color="#3a6a3a" />
                </mesh>
                {/* Weapon Arm */}
                <group position={[0.3, 0.5, 0]}>
                    <mesh ref={weaponRef} position={[0, 0, 0.2]} rotation={[0.5, 0, -0.5]}>
                        <boxGeometry args={[0.05, 0.6, 0.05]} />
                        <meshStandardMaterial color="#555" />
                    </mesh>
                </group>
                {!enemy.isDead && (
                    <Text position={[0, 1.3, 0]} fontSize={0.2} color="white" outlineColor="black" outlineWidth={0.02}>
                        {enemy.name}
                    </Text>
                )}
             </group>
        </group>
    );
});


// --- Farming Patch ---
const FarmingPatch = memo(({ position, setStats, addMessage, playerPos, onMoveTo, setHoverAction }: any) => {
  const [stage, setStage] = useState<FarmingStage>(FarmingStage.WEEDS);
  const [timer, setTimer] = useState<number>(0);

  useEffect(() => {
    let interval: any;
    if (stage === FarmingStage.GROWING_1 || stage === FarmingStage.GROWING_2) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    if (stage === FarmingStage.GROWING_1 && timer > 3) {
      setStage(FarmingStage.GROWING_2);
    } else if (stage === FarmingStage.GROWING_2 && timer > 6) {
      setStage(FarmingStage.READY);
    }
  }, [timer, stage]);

  const handleInteract = async () => {
    const dist = new THREE.Vector3(...position).distanceTo(playerPos);
    if (dist > 3) {
      onMoveTo(new THREE.Vector3(position[0], 0, position[1] + 1.2));
      addMessage("Walking to patch...", 'info');
      return;
    }

    if (stage === FarmingStage.WEEDS) {
      addMessage("You rake the patch.", 'action');
      setStage(FarmingStage.EMPTY);
      setStats((prev: PlayerStats) => ({ ...prev, farmingXp: prev.farmingXp + XP_TABLE.RAKE }));
    } else if (stage === FarmingStage.EMPTY) {
      addMessage("You plant the seeds.", 'action');
      setStage(FarmingStage.SEEDS);
    } else if (stage === FarmingStage.SEEDS) {
      addMessage("You water the seeds.", 'action');
      setStage(FarmingStage.GROWING_1);
      setTimer(0);
    } else if (stage === FarmingStage.READY) {
      addMessage("You harvest the herbs. Smells like success!", 'action');
      setStage(FarmingStage.WEEDS);
      setStats((prev: PlayerStats) => ({ ...prev, farmingXp: prev.farmingXp + XP_TABLE.HARVEST }));
    } else {
      addMessage("The crops are still growing.", 'info');
    }
  };

  const getPatchColor = () => {
    switch (stage) {
      case FarmingStage.WEEDS: return '#2f4f2f';
      case FarmingStage.EMPTY: return '#3d2e22';
      case FarmingStage.SEEDS: return '#4a3b2d';
      case FarmingStage.GROWING_1: return '#4caf50';
      case FarmingStage.GROWING_2: return '#388e3c';
      case FarmingStage.READY: return '#81c784';
      default: return '#3d2e22';
    }
  };

  const getActionText = () => {
     switch (stage) {
      case FarmingStage.WEEDS: return "Rake Patch";
      case FarmingStage.EMPTY: return "Plant Seeds";
      case FarmingStage.SEEDS: return "Water Seeds";
      case FarmingStage.READY: return "Harvest";
      default: return "Inspect Crops";
    }
  };

  const handleExamine = async () => {
    addMessage("Examining patch...", 'info');
    const desc = await examineObject("Herb Patch", `Current stage: ${FarmingStage[stage]}.`);
    addMessage(desc, 'examine');
  };

  return (
    <group position={position}
        onPointerOver={(e) => { e.stopPropagation(); setHoverAction(getActionText()) }}
        onPointerOut={() => setHoverAction(null)}
        onClick={(e) => { e.stopPropagation(); handleInteract(); }}
        onContextMenu={(e) => { e.stopPropagation(); e.preventDefault(); handleExamine(); }}
    >
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color={getPatchColor()} />
      </mesh>
      {/* Borders */}
      <mesh position={[0, 0.1, -1.05]}>
         <boxGeometry args={[2.2, 0.2, 0.1]} />
         <meshStandardMaterial color={COLORS.LOG} />
      </mesh>
      <mesh position={[0, 0.1, 1.05]}>
         <boxGeometry args={[2.2, 0.2, 0.1]} />
         <meshStandardMaterial color={COLORS.LOG} />
      </mesh>
      <mesh position={[-1.05, 0.1, 0]} rotation={[0, Math.PI/2, 0]}>
         <boxGeometry args={[2, 0.2, 0.1]} />
         <meshStandardMaterial color={COLORS.LOG} />
      </mesh>
      <mesh position={[1.05, 0.1, 0]} rotation={[0, Math.PI/2, 0]}>
         <boxGeometry args={[2, 0.2, 0.1]} />
         <meshStandardMaterial color={COLORS.LOG} />
      </mesh>
      {/* Crops */}
      {stage >= FarmingStage.GROWING_1 && (
        <group position={[0, 0.2, 0]}>
             <mesh position={[-0.5, 0, -0.5]}>
                 <sphereGeometry args={[stage === FarmingStage.GROWING_1 ? 0.2 : 0.3]} />
                 <meshStandardMaterial color="green" />
             </mesh>
             <mesh position={[0.5, 0, 0.5]}>
                 <sphereGeometry args={[stage === FarmingStage.GROWING_1 ? 0.2 : 0.3]} />
                 <meshStandardMaterial color="green" />
             </mesh>
             <mesh position={[0, 0, 0]}>
                 <sphereGeometry args={[stage === FarmingStage.GROWING_1 ? 0.2 : 0.3]} />
                 <meshStandardMaterial color="green" />
             </mesh>
        </group>
      )}
    </group>
  );
});

// --- Main Scene ---
const GameSceneComponent: React.FC<GameSceneProps> = ({ stats, setStats, addMessage, setHoverAction, playerTarget, setPlayerTarget, enemies, setEnemies }) => {
  // Removed internal isMoving state here to prevent parent re-renders
  const [activeCombatTargetId, setActiveCombatTargetId] = useState<string | null>(null);
  const [isPlayerDying, setIsPlayerDying] = useState(false);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  
  const playerRef = useRef<THREE.Group>(null);
  // PERSISTENT POSITION REF
  const lastPlayerPos = useRef(new THREE.Vector3(0, 0, 0));
  
  const combatTargetRef = useRef<string | null>(null);

  // --- Shake Decay ---
  useEffect(() => {
    if (shakeIntensity > 0) {
        const frame = requestAnimationFrame(() => {
            setShakeIntensity(prev => Math.max(0, prev * 0.9)); // Geometric decay
        });
        return () => cancelAnimationFrame(frame);
    }
  }, [shakeIntensity]);

  // --- Death / Respawn Logic ---
  useEffect(() => {
    if (isPlayerDying) {
        // Trigger initial Shake
        setShakeIntensity(0.5);

        const timer = setTimeout(() => {
            // Respawn
            setIsPlayerDying(false);
            setStats(prev => ({ ...prev, currentHp: prev.maxHp }));
            setPlayerTarget(new THREE.Vector3(0, 0, 0));
            // Reset Ref
            lastPlayerPos.current.set(0, 0, 0);
            if (playerRef.current) {
                playerRef.current.position.set(0, 0, 0);
                playerRef.current.rotation.set(0, 0, 0); // Reset rotation
            }
            addMessage("You have respawned at home.", 'info');
        }, 4000); // 4 second death animation
        return () => clearTimeout(timer);
    }
  }, [isPlayerDying, setStats, setPlayerTarget, addMessage]);

  // --- Combat Loop ---
  useEffect(() => {
      const interval = setInterval(() => {
          if (isPlayerDying) return; // Stop processing combat if dead

          const now = Date.now();
          const targetId = combatTargetRef.current;
          
          // Sync visual state with ref
          if (activeCombatTargetId !== targetId) {
             setActiveCombatTargetId(targetId);
          }

          // 1. Handle Respawning
          setEnemies(prev => prev.map(e => {
             if(e.isDead && e.respawnTime < now && e.respawnTime !== 0) {
                 return { ...e, isDead: false, currentHp: e.maxHp, respawnTime: 0 };
             }
             return e;
          }));

          // 2. Combat Logic
          if (playerRef.current) {
             const enemy = enemies.find(e => e.id === targetId);
             
             // Check validity
             if (!enemy || enemy.isDead) {
                 if(targetId) {
                     combatTargetRef.current = null;
                     setActiveCombatTargetId(null);
                 }
                 // If invalid target, keep moving if target set, otherwise do nothing
             } else {
                 const dist = playerRef.current.position.distanceTo(enemy.position);
                 
                 // Check Range (1.8 tiles roughly)
                 if (dist < 1.8) {
                     // Player handles movement stop internally now based on dist

                     // A. Player Hits Enemy
                     const meleeLvl = LEVEL_FORMULA(stats.meleeXp);
                     const maxHit = MAX_HIT_FORMULA(meleeLvl);
                     const damage = Math.floor(Math.random() * (maxHit + 1));
                     
                     let killed = false;

                     setEnemies(prev => prev.map(e => {
                         if (e.id === targetId) {
                             let newHp = e.currentHp - damage;
                             if (newHp <= 0) {
                                 newHp = 0;
                                 killed = true;
                             }
                             return { ...e, currentHp: newHp };
                         }
                         return e;
                     }));

                     // XP & Message
                     if (damage > 0) {
                        setStats(prev => {
                            const newMeleeXp = prev.meleeXp + (damage * XP_TABLE.COMBAT_HIT);
                            const newHpXp = prev.hitpointsXp + (damage * 1.33); // 1.33 XP per damage for HP
                            // Recalculate Max HP based on new HP XP
                            const newMaxHp = LEVEL_FORMULA(newHpXp);
                            
                            return {
                                ...prev,
                                meleeXp: newMeleeXp,
                                hitpointsXp: newHpXp,
                                maxHp: newMaxHp // Update Max HP immediately
                            };
                        });
                     }
                     
                     if (killed) {
                         setStats(prev => ({ ...prev, meleeXp: prev.meleeXp + XP_TABLE.COMBAT_KILL }));
                         addMessage(`You defeated the ${enemy.name}!`, 'action');
                         setEnemies(prev => prev.map(e => e.id === targetId ? { ...e, isDead: true, respawnTime: Date.now() + 10000 } : e));
                         combatTargetRef.current = null;
                         setActiveCombatTargetId(null);
                     }

                     // B. Enemy Hits Player (if still alive)
                     if (!killed) {
                         const enemyDmg = Math.random() > 0.5 ? 1 : 0; // Simple enemy AI
                         if (enemyDmg > 0) {
                             setStats(prev => {
                                 const newHp = Math.max(0, prev.currentHp - enemyDmg);
                                 if (newHp === 0) {
                                     // TRIGGER DEATH
                                     addMessage("Oh dear, you are dead!", 'danger');
                                     combatTargetRef.current = null;
                                     setActiveCombatTargetId(null);
                                     setIsPlayerDying(true); // Start death sequence
                                     return { ...prev, currentHp: 0 };
                                 }
                                 return { ...prev, currentHp: newHp };
                             });
                         }
                     }
                 }
             }
          }
      }, 600); // 0.6s Tick

      return () => clearInterval(interval);
  }, [enemies, stats.meleeXp, setEnemies, setStats, addMessage, setPlayerTarget, activeCombatTargetId, isPlayerDying]);

  
  const handleGroundClick = useCallback((e: any) => {
    e.stopPropagation();
    if (isPlayerDying) return; // No movement while dying
    const pt = e.point;
    setPlayerTarget(new THREE.Vector3(pt.x, 0, pt.z));
    setHoverAction(null);
    combatTargetRef.current = null; // Cancel combat on move
    setActiveCombatTargetId(null);
  }, [setHoverAction, setPlayerTarget, isPlayerDying]);

  const handleAttackEnemy = useCallback((id: string, pos: THREE.Vector3) => {
      if (isPlayerDying) return;
      // Move within range (simple approach: move slightly towards enemy)
      const offset = new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize().multiplyScalar(1.2);
      const movePos = pos.clone().add(offset); // Move close to enemy
      setPlayerTarget(movePos);
      combatTargetRef.current = id;
      setActiveCombatTargetId(id);
      addMessage("You attack the Goblin!", 'action');
  }, [setPlayerTarget, addMessage, isPlayerDying]);

  // Derive combat target pos for animation
  const activeEnemyPos = useMemo(() => {
     if (!activeCombatTargetId) return null;
     const e = enemies.find(en => en.id === activeCombatTargetId);
     return e ? e.position : null;
  }, [activeCombatTargetId, enemies]);
  
  // Current Player Position (approx for passing to enemies) - in reality we should use a ref for high freq, but prop is okay for this interval
  const currentPlayerPos = playerRef.current ? playerRef.current.position : new THREE.Vector3(0,0,0);

  return (
    <Canvas shadows camera={{ position: [14, 14, 14], fov: 30 }} dpr={[1, 2]}>
      {/* Controls with Shake */}
      <CameraController playerRef={playerRef} shakeIntensity={shakeIntensity} />
      
      <Sky sunPosition={[100, 20, 100]} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 20, 5]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
      >
         <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40]} />
      </directionalLight>

      {/* Scenery */}
      <WorldScenery />

      {/* Massive Ground Base Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow onClick={handleGroundClick} onPointerOver={(e) => { e.stopPropagation(); setHoverAction("Walk here"); }}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#223311" />
      </mesh>
      
      {/* Player */}
      <Player 
        ref={playerRef} 
        targetPosition={playerTarget} 
        hp={stats.currentHp} 
        maxHp={stats.maxHp} 
        combatTargetPos={activeEnemyPos}
        isDying={isPlayerDying}
        lastPositionRef={lastPlayerPos}
      />
      
      {/* Target Marker */}
      {!isPlayerDying && (
          <mesh position={[playerTarget.x, 0.02, playerTarget.z]} rotation={[-Math.PI/2, 0, 0]}>
             <ringGeometry args={[0.2, 0.3, 16]} />
             <meshBasicMaterial color="yellow" opacity={0.5} transparent />
          </mesh>
      )}

      {/* Enemies */}
      {enemies.map(enemy => (
          <EnemyCharacter 
            key={enemy.id} 
            enemy={enemy} 
            setHoverAction={setHoverAction} 
            onAttack={handleAttackEnemy}
            playerPos={currentPlayerPos} 
          />
      ))}

      {/* Farming Area */}
      <group position={[5, 0, 5]}>
        <FarmingPatch 
           position={[0, 0, 0]} 
           setStats={setStats} 
           addMessage={addMessage} 
           playerPos={playerTarget}
           onMoveTo={setPlayerTarget}
           setHoverAction={setHoverAction}
        />
      </group>

      <BakeShadows />
    </Canvas>
  );
};

export const GameScene = memo(GameSceneComponent);