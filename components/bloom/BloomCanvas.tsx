'use client';

import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { BloomPalette, BouquetId } from '@/lib/bloom/config';
import { generateQRMatrix, isFinder } from '@/lib/bloom/qr';
import { buildSceneData, type InstanceDatum, type Tone, type Vec3 } from '@/lib/bloom/sceneData';

export interface RendererStats {
  renderer: string;
  sceneObjects: number;
  flowerInstances: number;
  flowerHeads: number;
  qrInstances: number;
  fps: number;
}

interface BloomCanvasProps {
  bouquet: BouquetId;
  palette: BloomPalette;
  destinationUrl: string;
  progress: number;
  interactive?: boolean;
  onToggle?: () => void;
  onStats?: (stats: RendererStats) => void;
}

const EMPTY_STATS: RendererStats = { renderer: 'WebGL / Three.js', sceneObjects: 0, flowerInstances: 0, flowerHeads: 0, qrInstances: 0, fps: 0 };

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

type GeometryKind = 'petal' | 'center' | 'stamen' | 'stem' | 'leaf';

function AnimatedInstances({ data, color, progress, geometry }: { data: InstanceDatum[]; color: string; progress: number; geometry: GeometryKind }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const object = useRef(new THREE.Object3D());
  const startPosition = useRef(new THREE.Vector3());
  const endPosition = useRef(new THREE.Vector3());
  const startQuaternion = useRef(new THREE.Quaternion());
  const endQuaternion = useRef(new THREE.Quaternion());
  const startScale = useRef(new THREE.Vector3());

  useEffect(() => {
    if (mesh.current) mesh.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useFrame(() => {
    if (!mesh.current || !data.length) return;
    const animated = object.current;
    const travel = smoothstep(0.12, 0.86, progress);
    const shrink = smoothstep(0.56, 0.96, progress);
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      startPosition.current.set(...item.position);
      const lane = (i * 7 + Math.floor(item.seed)) % 29;
      endPosition.current.set(
        ((lane % 9) - 4) * 0.34 + Math.sin(item.seed * 1.7) * 0.11,
        (3.5 - Math.floor(lane / 9)) * 0.32 - 0.55,
        0.2 + Math.cos(item.seed * 2.1) * 0.12,
      );
      animated.position.copy(startPosition.current).lerp(endPosition.current, travel);
      animated.position.x += Math.sin(Math.PI * travel) * Math.sin(item.seed * 2.37) * 0.52;
      animated.position.y += Math.sin(Math.PI * travel) * (0.28 + (item.seed % 5) * 0.07);
      animated.position.z += Math.sin(Math.PI * travel) * Math.cos(item.seed * 1.11) * 0.65;
      startQuaternion.current.set(...item.quaternion);
      endQuaternion.current.setFromEuler(new THREE.Euler(0, 0, (item.seed % 9) * 0.21));
      animated.quaternion.copy(startQuaternion.current).slerp(endQuaternion.current, travel);
      startScale.current.set(...item.scale);
      animated.scale.copy(startScale.current).multiplyScalar(Math.max(0.008, 1 - shrink * 0.992));
      animated.updateMatrix();
      mesh.current.setMatrixAt(i, animated.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  if (!data.length) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, data.length]} castShadow receiveShadow frustumCulled={false}>
      {geometry === 'petal' && <sphereGeometry args={[1, 12, 8]} />}
      {geometry === 'center' && <dodecahedronGeometry args={[1, 1]} />}
      {geometry === 'stamen' && <cylinderGeometry args={[1, 1, 1, 7]} />}
      {geometry === 'stem' && <cylinderGeometry args={[0.028, 0.036, 1, 7]} />}
      {geometry === 'leaf' && <sphereGeometry args={[1, 9, 6]} />}
      <meshStandardMaterial color={color} roughness={0.57} metalness={0.02} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

interface QRDatum { start: Vec3; target: Vec3; seed: number }

function QRMesh({ data, color, unit, progress, finder = false }: { data: QRDatum[]; color: string; unit: number; progress: number; finder?: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const object = useRef(new THREE.Object3D());
  const start = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());

  useEffect(() => {
    if (mesh.current) mesh.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

  useFrame(() => {
    if (!mesh.current) return;
    const animatedModule = object.current;
    const travel = finder ? smoothstep(0.015, 0.45, progress) : smoothstep(0.08, 0.94, progress);
    const appear = finder ? smoothstep(0.015, 0.22, progress) : smoothstep(0.1, 0.36, progress);
    const arc = Math.sin(Math.PI * travel) * (finder ? 1 - travel : 1);
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      start.current.set(...item.start);
      target.current.set(...item.target);
      animatedModule.position.copy(start.current).lerp(target.current, travel);
      animatedModule.position.x += arc * Math.sin(item.seed * 1.91) * 0.46;
      animatedModule.position.y += arc * (0.38 + (item.seed % 7) * 0.055);
      animatedModule.position.z += arc * (0.42 + Math.cos(item.seed) * 0.3);
      animatedModule.rotation.set(0, (1 - travel) * item.seed * 0.31, (1 - travel) * item.seed * 0.17);
      const s = Math.max(0.002, appear * (0.28 + travel * 0.72));
      animatedModule.scale.set(s, s, s);
      animatedModule.updateMatrix();
      mesh.current.setMatrixAt(i, animatedModule.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (material.current) material.current.opacity = Math.max(0.01, 1 - smoothstep(0.94, 1, progress) * 0.99);
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, data.length]} castShadow receiveShadow frustumCulled={false}>
      <boxGeometry args={[unit * 0.97, unit * 0.97, 0.075]} />
      <meshStandardMaterial ref={material} color={color} roughness={0.38} metalness={0.03} transparent depthWrite={progress < 0.98} />
    </instancedMesh>
  );
}

function QRInstances({ url, palette, progress, sourcePoints }: { url: string; palette: BloomPalette; progress: number; sourcePoints: Vec3[] }) {
  const qr = useMemo(() => generateQRMatrix(url), [url]);
  const { regular, finders, unit } = useMemo(() => {
    const width = 3.62;
    const moduleUnit = width / qr.size;
    const normal: QRDatum[] = [];
    const finder: QRDatum[] = [];
    let index = 0;
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (!qr.data[y * qr.size + x]) continue;
        const source = sourcePoints[index % sourcePoints.length] ?? [0, 0, 0];
        const item: QRDatum = {
          start: [source[0] + Math.sin(index * 2.1) * 0.18, source[1] + Math.cos(index * 1.7) * 0.18, source[2]],
          target: [(x - (qr.size - 1) / 2) * moduleUnit, ((qr.size - 1) / 2 - y) * moduleUnit + 0.05, 0.32],
          seed: index + 1,
        };
        (isFinder(x, y, qr.size) ? finder : normal).push(item);
        index++;
      }
    }
    return { regular: normal, finders: finder, unit: moduleUnit };
  }, [qr, sourcePoints]);
  return <group><QRMesh data={regular} color={palette.qrPrimary} unit={unit} progress={progress} /><QRMesh data={finders} color={palette.qrAccent} unit={unit} progress={progress} finder /></group>;
}

function FlowerMeshes({ data, palette, progress }: { data: ReturnType<typeof buildSceneData>; palette: BloomPalette; progress: number }) {
  const toneColor = (tone: Tone) => tone === 'primary' ? palette.flowerPrimary : tone === 'secondary' ? palette.flowerSecondary : palette.flowerAccent;
  return (
    <>
      {(Object.keys(data.petals) as Array<keyof typeof data.petals>).flatMap((kind) =>
        (Object.keys(data.petals[kind]) as Tone[]).map((tone) => (
          <AnimatedInstances key={`${kind}-${tone}`} data={data.petals[kind][tone]} color={toneColor(tone)} progress={progress} geometry="petal" />
        )),
      )}
      {(Object.keys(data.centers) as Tone[]).map((tone) => <AnimatedInstances key={`center-${tone}`} data={data.centers[tone]} color={toneColor(tone)} progress={progress} geometry="center" />)}
      <AnimatedInstances data={data.stamens} color="#e8b93d" progress={progress} geometry="stamen" />
      <AnimatedInstances data={data.stems} color={palette.foliagePrimary} progress={progress} geometry="stem" />
      <AnimatedInstances data={data.leavesPrimary} color={palette.foliagePrimary} progress={progress} geometry="leaf" />
      <AnimatedInstances data={data.leavesSecondary} color={palette.foliageSecondary} progress={progress} geometry="leaf" />
    </>
  );
}

function Vase({ progress, palette }: { progress: number; palette: BloomPalette }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  useFrame(() => {
    if (!group.current) return;
    const leave = smoothstep(0.04, 0.55, progress);
    group.current.position.y = -1.72 - leave * 1.6;
    group.current.rotation.z = leave * -0.2;
    group.current.scale.setScalar(Math.max(0.01, 1 - leave * 0.98));
    if (material.current) material.current.opacity = 1 - leave;
  });
  return (
    <group ref={group} position={[0, -1.72, -0.08]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.79, 0.57, 1.72, 36, 1, false]} />
        <meshPhysicalMaterial ref={material} color="#b5a5cf" roughness={0.28} metalness={0.02} transmission={0.12} thickness={0.45} transparent />
      </mesh>
      <mesh position={[0, 0.3, 0.76]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.035, 8, 36]} />
        <meshStandardMaterial color={palette.flowerAccent} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.08, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.31, 0.022, 8, 36]} />
        <meshStandardMaterial color={palette.flowerSecondary} roughness={0.5} />
      </mesh>
    </group>
  );
}

function FloatingDetails({ progress, palette }: { progress: number; palette: BloomPalette }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.elapsedTime * 0.06;
    group.current.position.y = Math.sin(clock.elapsedTime * 0.62) * 0.04;
    group.current.scale.setScalar(Math.max(0.01, 1 - smoothstep(0.08, 0.52, progress)));
  });
  return (
    <group ref={group}>
      {[[2.03, 0.92, -0.2], [-2.02, 0.34, -0.35], [1.82, -0.18, 0.15], [-1.72, 1.22, -0.45]].map((position, index) => (
        <mesh key={index} position={position as Vec3} rotation={[index * 0.4, index, 0]} castShadow>
          <octahedronGeometry args={[0.1 + index * 0.012, 0]} />
          <meshStandardMaterial color={index % 2 ? palette.flowerSecondary : palette.flowerPrimary} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function SceneReporter({ bouquet, data, qrInstances, onStats }: { bouquet: BouquetId; data: ReturnType<typeof buildSceneData>; qrInstances: number; onStats?: (stats: RendererStats) => void }) {
  const { gl, scene } = useThree();
  const frames = useRef(0);
  const last = useRef(0);
  const stats = useRef({ ...EMPTY_STATS });
  useEffect(() => {
    const timer = window.setTimeout(() => {
      let objects = 0;
      scene.traverse(() => objects++);
      stats.current = {
        ...stats.current,
        renderer: `${gl.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL'} / Three.js`,
        sceneObjects: objects,
        flowerInstances: data.flowerInstances,
        flowerHeads: data.flowerHeads,
        qrInstances,
      };
      onStats?.(stats.current);
      if (process.env.NODE_ENV !== 'production') {
        console.info(`Renderer: Three.js / ${gl.capabilities.isWebGL2 ? 'WebGL2' : 'WebGL'}`);
        console.info(`Scene objects: ${objects}`);
        console.info(`Flower instances: ${data.flowerInstances}`);
        console.info(`QR instances: ${qrInstances}`);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bouquet, data, gl, onStats, qrInstances, scene]);
  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (!last.current) last.current = now;
    if (now - last.current >= 700) {
      stats.current.fps = Math.round((frames.current * 1000) / (now - last.current));
      frames.current = 0;
      last.current = now;
      onStats?.({ ...stats.current });
    }
  });
  return null;
}

function BloomScene({ bouquet, palette, destinationUrl, progress, interactive, onToggle, onStats }: BloomCanvasProps) {
  const data = useMemo(() => buildSceneData(bouquet), [bouquet]);
  const qrInstances = useMemo(() => generateQRMatrix(destinationUrl).data.filter(Boolean).length, [destinationUrl]);
  const [interacting, setInteracting] = useState(false);
  const { size } = useThree();
  const sceneScale = size.width < 500 ? 0.82 : size.width < 760 ? 0.92 : 1;
  return (
    <>
      <color attach="background" args={['#fffdfd']} />
      <ambientLight intensity={1.35} />
      <hemisphereLight args={['#fff5fb', '#cfd7cd', 1.15]} />
      <directionalLight castShadow position={[4.5, 6, 6]} intensity={2.25} color="#fff6f2" shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-4, 2.5, 5]} intensity={1.1} color="#e8dfff" angle={0.55} penumbra={0.8} />
      <group scale={sceneScale} onClick={(event) => { event.stopPropagation(); if (interactive && onToggle) onToggle(); }}>
        <FlowerMeshes data={data} palette={palette} progress={progress} />
        <Vase progress={progress} palette={palette} />
        <FloatingDetails progress={progress} palette={palette} />
        <QRInstances url={destinationUrl} palette={palette} progress={progress} sourcePoints={data.sourcePoints} />
        <mesh visible={false}><sphereGeometry args={[2.6, 12, 8]} /><meshBasicMaterial /></mesh>
      </group>
      <ContactShadows position={[0, -2.63, 0]} opacity={0.22 * (1 - smoothstep(0.12, 0.7, progress))} scale={7} blur={2.6} far={4.5} resolution={256} color="#6f4b63" />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.075}
        minAzimuthAngle={-Math.PI / 5.5}
        maxAzimuthAngle={Math.PI / 5.5}
        minPolarAngle={Math.PI / 2 - Math.PI / 14}
        maxPolarAngle={Math.PI / 2 + Math.PI / 14}
        autoRotate={!interacting && progress < 0.04}
        autoRotateSpeed={0.32}
        onStart={() => setInteracting(true)}
        onEnd={() => window.setTimeout(() => setInteracting(false), 900)}
      />
      <SceneReporter bouquet={bouquet} data={data} qrInstances={qrInstances} onStats={onStats} />
    </>
  );
}

export default function BloomCanvas(props: BloomCanvasProps) {
  return (
    <Canvas
      className="three-bloom-canvas"
      data-renderer="three"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.05, 7.35], fov: 38, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.domElement.dataset.renderer = 'three';
        gl.domElement.setAttribute('aria-label', 'Interactive Three.js bouquet and QR scene');
      }}
    >
      <BloomScene {...props} />
    </Canvas>
  );
}
