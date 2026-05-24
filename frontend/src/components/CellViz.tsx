"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Sparkles, Trail, Line } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Performant but cinematic cell visualization.
 *
 * Renders the doxycycline-induced CRISPR / PNPase / mtDNA editing pipeline as
 * an animated 3D scene:
 *   • pulsing nucleus core with rotating DNA double-helix
 *   • 7 mitochondria with cristae rings + 6-subunit PNPase translocons
 *   • CRISPR/peg RNP cargo with glowing trails on curved paths
 *   • ATP burst particles from edited mitochondria
 *   • energy shockwave rings that ripple from each edited mito
 *   • Bloom + chromatic aberration + vignette post-processing for cinematic
 *     "fluorescence microscopy" feel
 *
 * Performance-conscious: ~7 mitos, ~14 cargo, no per-vertex deformation,
 * instanced spheres for sparkles, single post-processing pass.
 */

// ---------------------------------------------------------------------------
// DNA double helix — built once, rotated continuously
// ---------------------------------------------------------------------------
function DnaHelix() {
  const groupRef = useRef<THREE.Group>(null);
  const { strandA, strandB, rungs } = useMemo(() => {
    const turns = 4;
    const segments = 80;
    const radius = 0.35;
    const height = 1.4;
    const a: THREE.Vector3[] = [];
    const b: THREE.Vector3[] = [];
    const rungs: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * height;
      const pa = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const pb = new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);
      a.push(pa);
      b.push(pb);
      if (i % 6 === 0) rungs.push([pa.clone(), pb.clone()]);
    }
    return { strandA: a, strandB: b, rungs };
  }, []);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.6;
  });

  return (
    <group ref={groupRef}>
      <Line points={strandA} color="#a5f3fc" lineWidth={2} />
      <Line points={strandB} color="#f0abfc" lineWidth={2} />
      {rungs.map(([p1, p2], i) => (
        <Line key={i} points={[p1, p2]} color="#fcd34d" lineWidth={1} transparent opacity={0.8} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Nucleus — pulsing inner core + double envelope + DNA helix
// ---------------------------------------------------------------------------
function Nucleus() {
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (coreRef.current) {
      const t = state.clock.elapsedTime;
      const pulse = 1 + Math.sin(t * 1.5) * 0.04;
      coreRef.current.scale.setScalar(pulse);
      (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.5 + Math.sin(t * 1.5) * 0.15;
    }
    if (haloRef.current) {
      haloRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      haloRef.current.rotation.x = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <Float speed={1.2} floatIntensity={0.3} rotationIntensity={0.15}>
      <group>
        {/* Inner core (icosahedron, pulses) */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[1.0, 3]} />
          <meshStandardMaterial
            color="#818cf8"
            emissive="#6366f1"
            emissiveIntensity={0.6}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
        {/* Outer envelope (transparent shell) */}
        <mesh ref={haloRef}>
          <sphereGeometry args={[1.3, 32, 32]} />
          <meshStandardMaterial
            color="#a5b4fc"
            transparent
            opacity={0.12}
            roughness={0.4}
          />
        </mesh>
        {/* Subtle dot field on the envelope (nuclear pores) */}
        <mesh>
          <sphereGeometry args={[1.32, 24, 24]} />
          <pointsMaterial size={0.04} color="#fcd34d" transparent opacity={0.6} />
        </mesh>
        {/* DNA double helix inside */}
        <DnaHelix />
        {/* Strong center light */}
        <pointLight color="#818cf8" intensity={1.8} distance={5} />
      </group>
    </Float>
  );
}

// ---------------------------------------------------------------------------
// PNPase translocon — rotating hexameric ring on the mito surface
// ---------------------------------------------------------------------------
function PnpaseChannel({ edited }: { edited: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ringRef.current) ringRef.current.rotation.z = state.clock.elapsedTime * 1.2;
    if (innerRef.current) innerRef.current.rotation.z = -state.clock.elapsedTime * 2;
  });
  const color = edited > 0.4 ? "#5eead4" : "#fbbf24";
  return (
    <group position={[0.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {/* Main translocon ring */}
      <mesh>
        <torusGeometry args={[0.16, 0.045, 12, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Rotating clamp */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.16, 0.025, 8, 16, Math.PI * 1.2]} />
        <meshStandardMaterial color="#fde047" emissive="#fbbf24" emissiveIntensity={1.5} />
      </mesh>
      {/* 6 subunit beads */}
      <mesh ref={innerRef}>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0]}>
              <sphereGeometry args={[0.035, 10, 10]} />
              <meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={1.4} />
            </mesh>
          );
        })}
      </mesh>
      <pointLight color={color} intensity={0.5} distance={1.2} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Energy shockwave — ripples out from an edited mito periodically
// ---------------------------------------------------------------------------
function Shockwave({ trigger }: { trigger: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const startTime = useRef(Math.random() * 5);
  useFrame((state) => {
    if (!ref.current) return;
    const t = (state.clock.elapsedTime + startTime.current) % 3;
    const scale = 0.5 + t * 0.9;
    const opacity = Math.max(0, 0.6 - t * 0.2) * trigger;
    ref.current.scale.setScalar(scale);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = opacity;
  });
  return (
    <mesh ref={ref}>
      <ringGeometry args={[0.5, 0.55, 32]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Mitochondrion — capsule + cristae + PNPase + ATP sparks
// ---------------------------------------------------------------------------
function Mitochondrion({
  position,
  edited,
  scale = 1,
  seed = 0,
}: {
  position: [number, number, number];
  edited: number;
  scale?: number;
  seed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime + seed;
      groupRef.current.rotation.x = Math.sin(t * 0.4) * 0.1;
      groupRef.current.rotation.z = Math.cos(t * 0.3) * 0.1;
      // Subtle breathing
      const breath = 1 + Math.sin(t * 0.8) * 0.025;
      groupRef.current.scale.setScalar(scale * breath);
    }
  });

  const outerColor = useMemo(
    () => new THREE.Color("#f472b6").lerp(new THREE.Color("#5eead4"), edited),
    [edited],
  );
  const innerColor = useMemo(
    () => new THREE.Color("#fb7185").lerp(new THREE.Color("#22d3ee"), edited),
    [edited],
  );
  const mtdnaColor = useMemo(
    () => new THREE.Color("#fda4af").lerp(new THREE.Color("#86efac"), edited),
    [edited],
  );

  return (
    <group ref={groupRef} position={position}>
      {/* Outer membrane */}
      <mesh>
        <capsuleGeometry args={[0.45, 0.95, 10, 20]} />
        <meshStandardMaterial
          color={outerColor}
          emissive={outerColor}
          emissiveIntensity={0.45}
          roughness={0.4}
          metalness={0.15}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Inner membrane */}
      <mesh>
        <capsuleGeometry args={[0.36, 0.85, 8, 16]} />
        <meshStandardMaterial
          color={innerColor}
          emissive={innerColor}
          emissiveIntensity={0.6}
          roughness={0.35}
        />
      </mesh>
      {/* Cristae folds — 4 angled rings inside */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[0, -0.32 + i * 0.21, 0]}
          rotation={[Math.PI / 2 + (i % 2) * 0.3, 0, 0]}
        >
          <torusGeometry args={[0.22, 0.018, 6, 16]} />
          <meshStandardMaterial color={innerColor} emissive={innerColor} emissiveIntensity={0.8} transparent opacity={0.85} />
        </mesh>
      ))}
      {/* mtDNA nucleoid (small loop) */}
      <mesh position={[0.05, 0.1, 0.05]} rotation={[Math.PI / 3, 0, Math.PI / 4]}>
        <torusGeometry args={[0.1, 0.018, 8, 20]} />
        <meshStandardMaterial color={mtdnaColor} emissive={mtdnaColor} emissiveIntensity={1.3} />
      </mesh>
      {/* PNPase translocon */}
      <PnpaseChannel edited={edited} />
      {/* ATP burst particles when edited */}
      {edited > 0.2 && (
        <Sparkles
          count={Math.round(8 + edited * 20)}
          size={0.6}
          scale={[1.4, 1.8, 1.4]}
          color="#22d3ee"
          speed={1.2}
        />
      )}
      {/* Shockwave for highly-edited mitos */}
      {edited > 0.5 && <Shockwave trigger={edited} />}
      {/* Per-mito glow light */}
      <pointLight color={outerColor} intensity={0.7 + edited * 0.6} distance={2.8} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// CRISPR/peg RNP cargo — compound shape with long trail
// ---------------------------------------------------------------------------
function Cargo({
  target,
  delay,
  speed,
}: {
  target: [number, number, number];
  delay: number;
  speed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const start = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const end = useMemo(() => new THREE.Vector3(...target), [target]);
  const ctrl = useMemo(() => {
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 1.2 + Math.random() * 0.6;
    mid.x += (Math.random() - 0.5) * 0.5;
    return mid;
  }, [start, end]);

  useFrame((state) => {
    if (!ref.current) return;
    const cycle = 4 / speed;
    const t = ((state.clock.elapsedTime + delay) % cycle) / cycle;
    const a = start.clone().lerp(ctrl, t);
    const b = ctrl.clone().lerp(end, t);
    const p = a.lerp(b, t);
    ref.current.position.copy(p);
    const fade = t < 0.05 ? t * 20 : t > 0.95 ? (1 - t) * 20 : 1;
    ref.current.scale.setScalar(fade);
    ref.current.rotation.z = state.clock.elapsedTime * 3;
  });

  return (
    <Trail width={1.2} length={6} color="#5eead4" attenuation={(w) => w * w}>
      <group ref={ref}>
        {/* Cas9 main body */}
        <mesh>
          <sphereGeometry args={[0.13, 14, 14]} />
          <meshStandardMaterial color="#a5f3fc" emissive="#5eead4" emissiveIntensity={1.8} />
        </mesh>
        {/* HNH/RuvC lobe */}
        <mesh position={[0.09, 0.04, 0]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color="#67e8f9" emissive="#06b6d4" emissiveIntensity={1.6} />
        </mesh>
        {/* pegRNA ribbon */}
        <mesh position={[-0.08, -0.02, 0]} rotation={[0, 0, Math.PI / 5]}>
          <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
          <meshStandardMaterial color="#f0abfc" emissive="#e879f9" emissiveIntensity={1.2} />
        </mesh>
        {/* MTS / PNPase tag — bright tip */}
        <mesh position={[0.15, 0.1, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={2.5} />
        </mesh>
      </group>
    </Trail>
  );
}

// ---------------------------------------------------------------------------
// Camera animator — slight cinematic drift
// ---------------------------------------------------------------------------
function CameraDrift() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.y = 1.5 + Math.sin(t * 0.2) * 0.3;
  });
  return null;
}

// ---------------------------------------------------------------------------
// Main scene
// ---------------------------------------------------------------------------
export function CellViz({
  induction = 0.5,
  importRate = 0.5,
  editedFraction = 0,
  mosaicEdits,
}: {
  induction?: number;
  importRate?: number;
  editedFraction?: number;
  mosaicEdits?: number[];
}) {
  const mitoConfigs = useMemo(
    () => [
      { pos: [3.0, 0.4, 0.8] as [number, number, number], scale: 1.0, seed: 1.1 },
      { pos: [-2.8, 0.9, -0.6] as [number, number, number], scale: 1.15, seed: 2.3 },
      { pos: [2.4, -1.3, -1.0] as [number, number, number], scale: 0.95, seed: 3.7 },
      { pos: [-2.6, -1.1, 1.2] as [number, number, number], scale: 1.05, seed: 4.5 },
      { pos: [0.6, 2.4, -1.5] as [number, number, number], scale: 0.9, seed: 5.1 },
      { pos: [0.3, -2.5, 0.9] as [number, number, number], scale: 1.1, seed: 6.7 },
      { pos: [-0.8, 0.3, 2.5] as [number, number, number], scale: 0.85, seed: 7.9 },
    ],
    [],
  );

  const cargoCount = Math.max(3, Math.round(induction * 14));
  const speed = 0.4 + importRate * 1.8;

  return (
    <Canvas
      camera={{ position: [0, 1.5, 7.5], fov: 50 }}
      dpr={[1, 1.8]}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#02030a"]} />
      <fog attach="fog" args={["#02030a", 9, 18]} />

      {/* Lighting rig */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[6, 8, 6]} intensity={0.9} color="#a5b4fc" />
      <directionalLight position={[-6, -4, -6]} intensity={0.35} color="#f472b6" />
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#818cf8" distance={6} />

      {/* Atmosphere — two layers of sparkles in different colors */}
      <Sparkles count={150} size={1.6} scale={[12, 10, 12]} color="#a5f3fc" speed={0.25} />
      <Sparkles count={60} size={0.9} scale={[8, 7, 8]} color="#f0abfc" speed={0.15} />
      <Sparkles count={40} size={0.6} scale={[6, 5, 6]} color="#fcd34d" speed={0.12} />

      {/* Nucleus */}
      <Nucleus />

      {/* Mitochondria */}
      {mitoConfigs.map((m, i) => (
        <Mitochondrion
          key={i}
          position={m.pos}
          scale={m.scale}
          seed={m.seed}
          edited={mosaicEdits?.[i] ?? editedFraction}
        />
      ))}

      {/* CRISPR cargo flux */}
      {Array.from({ length: cargoCount }).map((_, i) => (
        <Cargo
          key={i}
          target={mitoConfigs[i % mitoConfigs.length].pos}
          delay={i * 0.28}
          speed={speed}
        />
      ))}

      {/* Cinematic post-processing */}
      <EffectComposer multisampling={2}>
        <Bloom intensity={0.9} luminanceThreshold={0.3} luminanceSmoothing={0.5} mipmapBlur />
        <ChromaticAberration
          offset={[0.0006, 0.0006]}
          blendFunction={BlendFunction.NORMAL}
          radialModulation={false}
          modulationOffset={0}
        />
        <Vignette eskil={false} offset={0.3} darkness={0.55} />
      </EffectComposer>

      <CameraDrift />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.45} />
    </Canvas>
  );
}
