import {
  AmbientLight,
  Color,
  DirectionalLight,
  FogExp2,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  TorusGeometry,
} from 'three';
import { carModelPath, cityModelPath } from '../assets/manifest';
import { loadModel } from '../assets/loadModel';
import { NEON } from './palette';

export type Showroom = {
  scene: Scene;
  camera: PerspectiveCamera;
  update: (deltaSeconds: number, elapsedSeconds: number) => void;
};

const CAR_SPIN_SPEED = 0.35;
const CAMERA_ORBIT_RADIUS = 6.5;

const createGround = (): Group => {
  const ground = new Group();
  const floor = new Mesh(new PlaneGeometry(200, 200), new MeshStandardMaterial({ color: 0x0b0716, roughness: 0.35, metalness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  const grid = new GridHelper(200, 100, NEON.magenta, NEON.violet);
  grid.position.y = 0.01;
  ground.add(floor, grid);
  return ground;
};

const createNeonRing = (): Mesh => {
  const ring = new Mesh(
    new TorusGeometry(2.6, 0.05, 12, 96),
    new MeshStandardMaterial({ color: NEON.cyan, emissive: NEON.cyan, emissiveIntensity: 4 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  return ring;
};

const addLights = (scene: Scene): void => {
  scene.add(new AmbientLight(0x6a5cff, 0.4));
  const moon = new DirectionalLight(0xb9b4ff, 1.2);
  moon.position.set(5, 10, 4);
  moon.castShadow = true;
  scene.add(moon);
  const magentaGlow = new PointLight(NEON.magenta, 30, 12);
  magentaGlow.position.set(-3, 2, 2);
  const cyanGlow = new PointLight(NEON.cyan, 30, 12);
  cyanGlow.position.set(3, 2, -2);
  scene.add(magentaGlow, cyanGlow);
};

const enableShadows = (model: Group): void => {
  model.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
};

const addSkyline = async (scene: Scene): Promise<void> => {
  const buildings = ['building-type-a', 'building-type-c', 'building-type-e', 'building-type-h', 'building-type-k'] as const;
  const placements = await Promise.all(
    buildings.flatMap((name, index) =>
      [-1, 1].map(async (side) => {
        const building = await loadModel(cityModelPath(name));
        building.scale.setScalar(3);
        building.position.set((index - 2) * 7, 0, side * 18);
        building.rotation.y = side > 0 ? Math.PI : 0;
        return building;
      }),
    ),
  );
  scene.add(...placements);
};

export const createShowroom = async (aspect: number): Promise<Showroom> => {
  const scene = new Scene();
  scene.background = new Color(NEON.night);
  scene.fog = new FogExp2(NEON.fog, 0.045);

  const camera = new PerspectiveCamera(45, aspect, 0.1, 300);
  addLights(scene);
  scene.add(createGround(), createNeonRing());

  const car = await loadModel(carModelPath('race-future'));
  car.scale.setScalar(1.6);
  enableShadows(car);
  scene.add(car);
  await addSkyline(scene);

  const update = (deltaSeconds: number, elapsedSeconds: number): void => {
    car.rotation.y += CAR_SPIN_SPEED * deltaSeconds;
    const orbit = elapsedSeconds * 0.1;
    camera.position.set(Math.sin(orbit) * CAMERA_ORBIT_RADIUS, 2.2, Math.cos(orbit) * CAMERA_ORBIT_RADIUS);
    camera.lookAt(0, 0.6, 0);
  };
  update(0, 0);

  return { scene, camera, update };
};
