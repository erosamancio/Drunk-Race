import type { Track } from '../track/trackLayout';
import { rightOf } from '../track/trackLayout';
import type { CarState } from './carPhysics';

export type BoundsResult = {
  state: CarState;
  trackIndex: number;
  distance: number;
  lateral: number;
  /** Speed lost against the wall this step, in m/s. Zero when the car is clear. */
  impactSpeed: number;
};

export const CAR_HALF_WIDTH = 1.0;
const WALL_RESTITUTION = 0.25;
const WALL_SCRAPE_FRICTION = 0.985;

// Keeps the car inside the walls that run along both edges of the track.
export const constrainToTrack = (state: CarState, track: Track, hintIndex?: number): BoundsResult => {
  const projection = track.project(state.x, state.z, hintIndex);
  const limit = track.halfWidth - CAR_HALF_WIDTH;
  const overlap = Math.abs(projection.lateral) - limit;
  const base = { trackIndex: projection.index, distance: projection.distance, lateral: projection.lateral };
  if (overlap <= 0) return { ...base, state, impactSpeed: 0 };

  const side = Math.sign(projection.lateral);
  const [rightX, rightZ] = rightOf(projection.sample.tangentX, projection.sample.tangentZ);
  const normalX = rightX * side;
  const normalZ = rightZ * side;
  const intoWall = state.velocityX * normalX + state.velocityZ * normalZ;
  const bounce = intoWall > 0 ? (1 + WALL_RESTITUTION) * intoWall : 0;

  return {
    trackIndex: projection.index,
    distance: projection.distance,
    lateral: side * limit,
    impactSpeed: Math.max(0, intoWall),
    state: {
      ...state,
      x: state.x - normalX * overlap,
      z: state.z - normalZ * overlap,
      velocityX: (state.velocityX - normalX * bounce) * WALL_SCRAPE_FRICTION,
      velocityZ: (state.velocityZ - normalZ * bounce) * WALL_SCRAPE_FRICTION,
    },
  };
};
