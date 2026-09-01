import * as THREE from 'three';
import type { BouquetId } from './config';

export type FlowerKind = Exclude<BouquetId, 'mixed'>;
export type Tone = 'primary' | 'secondary' | 'accent';
export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export interface InstanceDatum {
  position: Vec3;
  quaternion: Quat;
  scale: Vec3;
  seed: number;
}

export interface FlowerPlacement {
  kind: FlowerKind;
  position: Vec3;
  scale: number;
  seed: number;
}

export interface SceneData {
  petals: Record<FlowerKind, Record<Tone, InstanceDatum[]>>;
  centers: Record<Tone, InstanceDatum[]>;
  stamens: InstanceDatum[];
  stems: InstanceDatum[];
  leavesPrimary: InstanceDatum[];
  leavesSecondary: InstanceDatum[];
  sourcePoints: Vec3[];
  flowerHeads: number;
  flowerInstances: number;
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function random(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function quat(x: number, y: number, z: number): Quat {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  return [q.x, q.y, q.z, q.w];
}

function datum(position: Vec3, rotation: Vec3, scale: Vec3, seed: number): InstanceDatum {
  return { position, quaternion: quat(...rotation), scale, seed };
}

function placementsFor(id: BouquetId): FlowerPlacement[] {
  const count = id === 'lily' ? 11 : id === 'mixed' ? 18 : id === 'peony' ? 19 : id === 'rose' ? 20 : 18;
  const kinds: FlowerKind[] = id === 'mixed' ? ['peony', 'rose', 'lily', 'tulip'] : [id];
  const output: FlowerPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const seed = i + id.length * 19;
    const t = i / (count - 1);
    const angle = i * GOLDEN + random(seed) * 0.42;
    let radius = Math.sqrt(t) * 1.48;
    let x = Math.cos(angle) * radius;
    let y = 1.37 - t * 1.72 + (random(seed + 4) - 0.5) * 0.22;
    let z = Math.sin(angle) * 0.72 + (random(seed + 9) - 0.5) * 0.25;
    let scale = 0.84 + random(seed + 15) * 0.23;
    if (id === 'rose') {
      radius *= 0.92;
      x = Math.cos(angle) * radius;
      z *= 0.78;
      y += Math.cos(angle * 2) * 0.06;
      scale *= 0.9;
    }
    if (id === 'lily') {
      x *= 1.18;
      y += (random(seed + 2) - 0.5) * 0.28;
      z *= 1.1;
      scale *= 1.18;
    }
    if (id === 'tulip') {
      x *= 0.72;
      y = 1.65 - t * 2.05 + (random(seed + 4) - 0.5) * 0.18;
      z *= 0.72;
      scale *= 0.92;
    }
    if (id === 'mixed') {
      x *= 1.05;
      y += (random(seed + 3) - 0.5) * 0.3;
      z *= 1.05;
      scale *= kinds[i % kinds.length] === 'lily' ? 1.03 : 0.9 + random(seed + 18) * 0.18;
    }
    output.push({ kind: kinds[i % kinds.length], position: [x, y, z], scale, seed });
  }
  output.sort((a, b) => a.position[2] - b.position[2]);
  return output;
}

function pushPeony(target: SceneData, flower: FlowerPlacement) {
  const [cx, cy, cz] = flower.position;
  const rings = [
    { count: 10, radius: 0.3, size: 0.31, tone: 'primary' as Tone },
    { count: 8, radius: 0.19, size: 0.27, tone: 'secondary' as Tone },
    { count: 6, radius: 0.08, size: 0.2, tone: 'accent' as Tone },
  ];
  rings.forEach((ring, ringIndex) => {
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + ringIndex * 0.34;
      const jitter = (random(flower.seed * 31 + i + ringIndex * 9) - 0.5) * 0.05;
      target.petals.peony[ring.tone].push(datum(
        [cx + Math.cos(a) * (ring.radius + jitter) * flower.scale, cy + Math.sin(a) * ring.radius * 0.8 * flower.scale, cz + (0.06 + ringIndex * 0.05) * flower.scale],
        [Math.sin(a) * 0.42, Math.cos(a) * 0.34, a - Math.PI / 2],
        [ring.size * 0.72 * flower.scale, ring.size * 1.08 * flower.scale, ring.size * 0.3 * flower.scale],
        flower.seed + i + ringIndex * 20,
      ));
    }
  });
}

function pushRose(target: SceneData, flower: FlowerPlacement) {
  const [cx, cy, cz] = flower.position;
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const a = i * 1.66 + flower.seed * 0.09;
    const radius = 0.035 + t * 0.32;
    const tone: Tone = i < 7 ? 'accent' : i < 16 ? 'secondary' : 'primary';
    target.petals.rose[tone].push(datum(
      [cx + Math.cos(a) * radius * flower.scale, cy + Math.sin(a) * radius * 0.72 * flower.scale, cz + (0.15 - t * 0.11) * flower.scale],
      [Math.sin(a) * (0.18 + t * 0.4), Math.cos(a) * (0.18 + t * 0.36), a],
      [(0.13 + t * 0.12) * flower.scale, (0.2 + t * 0.2) * flower.scale, 0.07 * flower.scale],
      flower.seed + i,
    ));
  }
}

function pushLily(target: SceneData, flower: FlowerPlacement) {
  const [cx, cy, cz] = flower.position;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + flower.seed * 0.04;
    const tone: Tone = i % 3 === 0 ? 'secondary' : 'primary';
    target.petals.lily[tone].push(datum(
      [cx + Math.cos(a) * 0.3 * flower.scale, cy + Math.sin(a) * 0.3 * flower.scale, cz + 0.07],
      [Math.sin(a) * 0.28, Math.cos(a) * 0.3, a - Math.PI / 2],
      [0.2 * flower.scale, 0.57 * flower.scale, 0.065 * flower.scale],
      flower.seed + i,
    ));
    const tip: Vec3 = [cx + Math.cos(a) * 0.18 * flower.scale, cy + Math.sin(a) * 0.18 * flower.scale, cz + 0.32];
    target.stamens.push(datum(tip, [Math.sin(a) * 0.2, 0, -a], [0.024, 0.29 * flower.scale, 0.024], flower.seed + 80 + i));
  }
  target.centers.accent.push(datum([cx, cy, cz + 0.17], [0, 0, 0], [0.14, 0.14, 0.12], flower.seed));
}

function pushTulip(target: SceneData, flower: FlowerPlacement) {
  const [cx, cy, cz] = flower.position;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + flower.seed * 0.04;
    const tone: Tone = i % 2 ? 'secondary' : 'primary';
    target.petals.tulip[tone].push(datum(
      [cx + Math.cos(a) * 0.14 * flower.scale, cy + 0.1 * flower.scale, cz + Math.sin(a) * 0.14 * flower.scale],
      [Math.cos(a) * 0.25, a, Math.sin(a) * 0.12],
      [0.23 * flower.scale, 0.48 * flower.scale, 0.12 * flower.scale],
      flower.seed + i,
    ));
  }
}

export function buildSceneData(id: BouquetId): SceneData {
  const target: SceneData = {
    petals: {
      peony: { primary: [], secondary: [], accent: [] },
      rose: { primary: [], secondary: [], accent: [] },
      lily: { primary: [], secondary: [], accent: [] },
      tulip: { primary: [], secondary: [], accent: [] },
    },
    centers: { primary: [], secondary: [], accent: [] },
    stamens: [], stems: [], leavesPrimary: [], leavesSecondary: [], sourcePoints: [], flowerHeads: 0, flowerInstances: 0,
  };
  const flowers = placementsFor(id);
  for (const flower of flowers) {
    target.sourcePoints.push(flower.position);
    if (flower.kind === 'peony') pushPeony(target, flower);
    if (flower.kind === 'rose') pushRose(target, flower);
    if (flower.kind === 'lily') pushLily(target, flower);
    if (flower.kind === 'tulip') pushTulip(target, flower);
    if (flower.kind !== 'lily') target.centers.accent.push(datum([flower.position[0], flower.position[1], flower.position[2] + 0.12], [0, 0, 0], [0.12, 0.12, 0.1], flower.seed));
    const end = new THREE.Vector3(...flower.position);
    const start = new THREE.Vector3(0, -1.08, -0.06);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    target.stems.push({ position: start.clone().add(end).multiplyScalar(0.5).toArray() as Vec3, quaternion: [q.x, q.y, q.z, q.w], scale: [1, length, 1], seed: flower.seed });
  }
  const leafCount = id === 'mixed' ? 30 : id === 'peony' ? 28 : id === 'rose' ? 25 : id === 'lily' ? 22 : 26;
  for (let i = 0; i < leafCount; i++) {
    const a = i * GOLDEN + 0.4;
    const radius = 0.55 + random(i + id.length * 7) * 1.15;
    const y = -0.8 + random(i + 12) * 1.95;
    const z = -0.62 + random(i + 31) * 0.55;
    const leaf = datum(
      [Math.cos(a) * radius, y, z],
      [Math.sin(a) * 0.35, Math.cos(a) * 0.45, a - Math.PI / 2],
      [0.17 + random(i + 2) * 0.08, 0.48 + random(i + 9) * 0.25, 0.055],
      i + 300,
    );
    (i % 3 ? target.leavesPrimary : target.leavesSecondary).push(leaf);
    target.sourcePoints.push(leaf.position);
  }
  target.flowerHeads = flowers.length;
  target.flowerInstances = Object.values(target.petals).flatMap((tones) => Object.values(tones)).reduce((sum, entries) => sum + entries.length, 0) + target.centers.primary.length + target.centers.secondary.length + target.centers.accent.length + target.stamens.length;
  return target;
}
