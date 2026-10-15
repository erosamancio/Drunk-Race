import { PerspectiveCamera, Vector3 } from 'three';

export type ChaseTarget = { x: number; z: number; heading: number; speed: number };

const DISTANCE_BEHIND = 7.5;
const EXTRA_DISTANCE_AT_SPEED = 2.5;
const HEIGHT = 3;
const LOOK_AHEAD = 5;
const BASE_FOV = 62;
const EXTRA_FOV_AT_SPEED = 12;
const SPEED_FOR_FULL_EFFECT = 45;
const POSITION_STIFFNESS = 6;

export const createChaseCamera = (aspect: number): { camera: PerspectiveCamera; update: (target: ChaseTarget, dt: number) => void; snap: (target: ChaseTarget) => void } => {
  const camera = new PerspectiveCamera(BASE_FOV, aspect, 0.1, 900);
  const desired = new Vector3();
  const lookAt = new Vector3();

  const computeDesired = (target: ChaseTarget): number => {
    const speedRatio = Math.min(1, Math.abs(target.speed) / SPEED_FOR_FULL_EFFECT);
    const behind = DISTANCE_BEHIND + EXTRA_DISTANCE_AT_SPEED * speedRatio;
    const forwardX = Math.sin(target.heading);
    const forwardZ = Math.cos(target.heading);
    desired.set(target.x - forwardX * behind, HEIGHT, target.z - forwardZ * behind);
    lookAt.set(target.x + forwardX * LOOK_AHEAD, 1, target.z + forwardZ * LOOK_AHEAD);
    return speedRatio;
  };

  const update = (target: ChaseTarget, dt: number): void => {
    const speedRatio = computeDesired(target);
    camera.position.lerp(desired, 1 - Math.exp(-POSITION_STIFFNESS * dt));
    camera.lookAt(lookAt);
    camera.fov = BASE_FOV + EXTRA_FOV_AT_SPEED * speedRatio;
    camera.updateProjectionMatrix();
  };

  const snap = (target: ChaseTarget): void => {
    computeDesired(target);
    camera.position.copy(desired);
    camera.lookAt(lookAt);
  };

  return { camera, update, snap };
};
