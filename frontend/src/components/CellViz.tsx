"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Sparkles, Trail } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Animated cell schematic:
 *   nucleus (center) → emits "cargo" (CRISPR RNP) particles → travel along
 *   curved paths to one of several mitochondria → enter through PNPase channel.
 *
 * The intensity of cargo emission scales with `induction` (dox-driven), and the
 * import rate scales with `import_rate`. Both are derived live from the
 * simulator output so the cell visibly responds to the user's dosing schedule.
 */
function Nucleus() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.15;
  });
  return (
    <Float speed={1.2} floatIntensity={0.4} rotationIntensity={0.2}>
      <mesh ref={ref} position={[0, 0, 0]}>
        <icosahedronGeometry args={[1.1, 3]} />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#4f46e5"
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.2}
          wireframe={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.3, 32, 32]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.08} />
      </mesh>
    </Float>
  );
}

function Mitochondrion({
  position,
  edited,
}: {
  position: [number, number, number];
  edited: number; // 0..1
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.1;
      ref.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });
  const color = useMemo(() => {
    const c = new THREE.Color("#f472b6").lerp(new THREE.Color("#5eead4"), edited);
    return c;
  }, [edited]);
  return (
    <group ref={ref} position={position}>
      <mesh>
        <capsuleGeometry args={[0.45, 0.9, 8, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.4}
        />
      </mesh>
      {/* PNPase channel — a small ring on the membrane */}
      <mesh position={[0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.12, 0.04, 8, 24]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>
      <pointLight color={color} intensity={0.6} distance={3} />
    </group>
  );
}

function Cargo({
  target,
  delay,
  speed,
}: {
  target: [number, number, number];
  delay: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const start = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const end = useMemo(() => new THREE.Vector3(...target), [target]);
  const ctrl = useMemo(() => {
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 1.2 + Math.random() * 0.4;
    return mid;
  }, [start, end]);

  useFrame((state) => {
    if (!ref.current) return;
    const cycle = 4 / speed;
    const t = (((state.clock.elapsedTime + delay) % cycle) / cycle);
    const a = start.clone().lerp(ctrl, t);
    const b = ctrl.clone().lerp(end, t);
    const p = a.lerp(b, t);
    ref.current.position.copy(p);
    const scale = t < 0.05 ? t * 20 : t > 0.95 ? (1 - t) * 20 : 1;
    ref.current.scale.setScalar(0.12 * scale);
  });

  return (
    <Trail width={0.5} length={4} color="#5eead4" attenuation={(w) => w * w}>
      <mesh ref={ref}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial color="#a5f3fc" emissive="#5eead4" emissiveIntensity={1.5} />
      </mesh>
    </Trail>
  );
}

export function CellViz({
  induction = 0.5,
  importRate = 0.5,
  editedFraction = 0,
}: {
  induction?: number;
  importRate?: number;
  editedFraction?: number;
}) {
  const mitoPositions: [number, number, number][] = useMemo(
    () => [
      [3.0, 0.4, 0.8],
      [-2.8, 0.9, -0.6],
      [2.4, -1.3, -1.0],
      [-2.6, -1.1, 1.2],
      [0.6, 2.4, -1.5],
    ],
    []
  );

  const cargoCount = Math.max(2, Math.round(induction * 12));
  const speed = 0.4 + importRate * 1.6;

  return (
    <Canvas
      camera={{ position: [0, 1.5, 7.5], fov: 50 }}
      dpr={[1, 2]}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#02030a"]} />
      <fog attach="fog" args={["#02030a", 8, 16]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#a5b4fc" />
      <pointLight position={[0, 0, 0]} intensity={1.2} color="#818cf8" />

      <Sparkles count={120} size={1.2} scale={[10, 8, 10]} color="#a5f3fc" speed={0.3} />
      <Nucleus />

      {mitoPositions.map((p, i) => (
        <Mitochondrion key={i} position={p} edited={editedFraction} />
      ))}

      {Array.from({ length: cargoCount }).map((_, i) => {
        const target = mitoPositions[i % mitoPositions.length];
        return (
          <Cargo
            key={i}
            target={target}
            delay={i * 0.3}
            speed={speed}
          />
        );
      })}

      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  );
}
