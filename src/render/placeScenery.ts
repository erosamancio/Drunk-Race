import { Box3, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import type { CityModel } from '../assets/manifest';
import { cityModelPath, trackModelPath } from '../assets/manifest';
import { loadModel } from '../assets/loadModel';
import type { Track } from '../track/trackLayout';
import { rightOf } from '../track/trackLayout';
import { NEON } from './palette';

const LIGHT_POST_SPACING = 48;
const LIGHT_POST_HEIGHT = 7.5;
const BUILDING_SPACING = 26;
const MIN_CLEARANCE_FROM_ROAD = 14;
const BUILDINGS: readonly CityModel[] = ['building-type-a', 'building-type-c', 'building-type-e', 'building-type-h', 'building-type-k'];
const LAMP_COLORS = [NEON.cyan, NEON.magenta, NEON.amber] as const;

// Deterministic so the city looks the same every time the page loads.
const createRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T>(items: readonly T[], random: () => number): T => {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('Cannot pick from an empty list');
  return item;
};

const fitToHeight = (model: Group, height: number): Box3 => {
  const box = new Box3().setFromObject(model);
  model.scale.multiplyScalar(height / (box.max.y - box.min.y));
  const fitted = new Box3().setFromObject(model);
  model.position.y -= fitted.min.y;
  return fitted;
};

// Kenney's colormap gives windows and doors a palette; a faint emissive copy makes the city read as lit at night.
const lightUpWindows = (model: Group, intensity: number): void => {
  model.traverse((child) => {
    if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
      const material = child.material.clone();
      material.emissiveMap = material.map;
      material.emissive.set(0xffffff);
      material.emissiveIntensity = intensity;
      child.material = material;
    }
  });
};

const placeLightPosts = async (track: Track, scene: Group): Promise<void> => {
  const template = await loadModel(trackModelPath('lightPostModern'));
  const box = fitToHeight(template, LIGHT_POST_HEIGHT);
  const lampGeometry = new SphereGeometry(0.35, 12, 8);
  const count = Math.floor(track.length / LIGHT_POST_SPACING);
  for (let i = 0; i < count; i += 1) {
    const sample = track.sampleAt(i * LIGHT_POST_SPACING);
    const side = i % 2 === 0 ? 1 : -1;
    const [rightX, rightZ] = rightOf(sample.tangentX, sample.tangentZ);
    const post = template.clone(true);
    const offset = track.halfWidth + 1.6;
    post.position.set(sample.x + rightX * offset * side, 0, sample.z + rightZ * offset * side);
    // The arm points along +Z in the model, so face it toward the road.
    post.rotation.y = Math.atan2(-rightX * side, -rightZ * side);
    const color = pick(LAMP_COLORS, () => (i % 3) / 3);
    const lamp = new Mesh(lampGeometry, new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 6 }));
    const modelScale = template.scale.x;
    lamp.position.set(0, (box.max.y - box.min.y - 0.25) / modelScale, (box.max.z / modelScale) * 0.85);
    lamp.scale.setScalar(1 / modelScale);
    post.add(lamp);
    scene.add(post);
  }
};

const isClearOfRoad = (track: Track, x: number, z: number): boolean =>
  Math.abs(track.project(x, z).lateral) > track.halfWidth + MIN_CLEARANCE_FROM_ROAD;

const placeBuildings = async (track: Track, scene: Group): Promise<void> => {
  const random = createRandom(7);
  const templates = new Map<CityModel, Group>();
  await Promise.all(
    BUILDINGS.map(async (name) => {
      const model = await loadModel(cityModelPath(name));
      lightUpWindows(model, 0.35);
      templates.set(name, model);
    }),
  );
  const count = Math.floor(track.length / BUILDING_SPACING);
  const position = new Vector3();
  for (let i = 0; i < count; i += 1) {
    const sample = track.sampleAt(i * BUILDING_SPACING);
    const [rightX, rightZ] = rightOf(sample.tangentX, sample.tangentZ);
    for (const side of [-1, 1]) {
      const offset = track.halfWidth + MIN_CLEARANCE_FROM_ROAD + 4 + random() * 22;
      position.set(sample.x + rightX * offset * side, 0, sample.z + rightZ * offset * side);
      if (!isClearOfRoad(track, position.x, position.z)) continue;
      const template = templates.get(pick(BUILDINGS, random));
      if (!template) continue;
      const building = template.clone(true);
      fitToHeight(building, 9 + random() * 10);
      building.position.x = position.x;
      building.position.z = position.z;
      building.rotation.y = Math.atan2(-rightX * side, -rightZ * side) + (random() - 0.5) * 0.3;
      scene.add(building);
    }
  }
};

export const placeScenery = async (track: Track): Promise<Group> => {
  const scenery = new Group();
  await Promise.all([placeLightPosts(track, scenery), placeBuildings(track, scenery)]);
  return scenery;
};
