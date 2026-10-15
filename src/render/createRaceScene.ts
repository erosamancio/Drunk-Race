import { AmbientLight, Color, DirectionalLight, FogExp2, GridHelper, HemisphereLight, Mesh, MeshStandardMaterial, PlaneGeometry, Scene } from 'three';
import type { Track } from '../track/trackLayout';
import { buildTrackMeshes } from './buildTrackMeshes';
import { NEON } from './palette';
import { placeScenery } from './placeScenery';

const SHADOW_EXTENT = 40;

export type RaceScene = {
  scene: Scene;
  /** Keeps the shadow-casting moon light centred on the player so shadows stay sharp. */
  followWithShadows: (x: number, z: number) => void;
};

const createGround = (): Mesh => {
  const ground = new Mesh(new PlaneGeometry(2400, 2400), new MeshStandardMaterial({ color: 0x0a0614, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
};

const createGrid = (): GridHelper => {
  const grid = new GridHelper(2400, 240, NEON.violet, NEON.violet);
  grid.position.y = 0.005;
  const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
  materials.forEach((material) => {
    material.transparent = true;
    material.opacity = 0.35;
  });
  return grid;
};

const createMoon = (): DirectionalLight => {
  const moon = new DirectionalLight(0xc9c2ff, 1.4);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -SHADOW_EXTENT, right: SHADOW_EXTENT, top: SHADOW_EXTENT, bottom: -SHADOW_EXTENT, near: 1, far: 200 });
  moon.shadow.bias = -0.0005;
  return moon;
};

export const createRaceScene = async (track: Track): Promise<RaceScene> => {
  const scene = new Scene();
  scene.background = new Color(NEON.night);
  scene.fog = new FogExp2(NEON.fog, 0.0075);

  scene.add(new AmbientLight(0x5a4cff, 0.35));
  scene.add(new HemisphereLight(0x6f5bff, 0x12081f, 0.5));
  const moon = createMoon();
  scene.add(moon, moon.target);

  scene.add(createGround(), createGrid(), buildTrackMeshes(track), await placeScenery(track));

  const followWithShadows = (x: number, z: number): void => {
    moon.position.set(x + 30, 60, z + 20);
    moon.target.position.set(x, 0, z);
  };
  return { scene, followWithShadows };
};
