import { Group, Mesh, Object3D } from 'three';
import type { CarModel } from '../assets/manifest';
import { carModelPath } from '../assets/manifest';
import { loadModel } from '../assets/loadModel';

export type CarPose = { x: number; z: number; heading: number; forwardSpeed: number; steer: number; lateralAcceleration: number };

const MODEL_SCALE = 1.6;
const WHEEL_RADIUS = 0.3 * MODEL_SCALE;
const MAX_WHEEL_TURN = 0.45;
const BODY_ROLL_PER_ACCELERATION = 0.006;
const ROLL_SMOOTHING = 8;

export type CarView = { root: Group; update: (pose: CarPose, dt: number) => void };

// Wraps each wheel in a pivot so steering (Y) and rolling (X) don't fight each other.
const pivotWheel = (wheel: Object3D): Group => {
  const pivot = new Group();
  pivot.position.copy(wheel.position);
  wheel.parent?.add(pivot);
  wheel.position.set(0, 0, 0);
  pivot.add(wheel);
  return pivot;
};

export const createCarView = async (model: CarModel): Promise<CarView> => {
  const root = new Group();
  const car = await loadModel(carModelPath(model));
  car.scale.setScalar(MODEL_SCALE);
  car.traverse((child) => {
    if (child instanceof Mesh) child.castShadow = true;
  });
  root.add(car);

  const wheels = ['wheel-front-left', 'wheel-front-right', 'wheel-back-left', 'wheel-back-right']
    .map((name) => car.getObjectByName(name))
    .filter((wheel): wheel is Object3D => wheel !== undefined);
  const pivots = wheels.map(pivotWheel);
  const frontPivots = pivots.slice(0, 2);
  const body = car.getObjectByName('body');
  let roll = 0;

  const update = (pose: CarPose, dt: number): void => {
    root.position.set(pose.x, 0, pose.z);
    root.rotation.y = pose.heading;
    const spin = (pose.forwardSpeed / WHEEL_RADIUS) * dt;
    wheels.forEach((wheel) => (wheel.rotation.x += spin));
    frontPivots.forEach((pivot) => (pivot.rotation.y = -pose.steer * MAX_WHEEL_TURN));
    roll += (pose.lateralAcceleration * BODY_ROLL_PER_ACCELERATION - roll) * (1 - Math.exp(-ROLL_SMOOTHING * dt));
    if (body) body.rotation.z = roll;
  };

  return { root, update };
};
