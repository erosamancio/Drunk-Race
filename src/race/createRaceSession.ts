import type { Track } from '../track/trackLayout';
import type { CarInput, CarState } from '../vehicle/carPhysics';
import { forwardSpeedOf, stepCar } from '../vehicle/carPhysics';
import { constrainToTrack } from '../vehicle/trackBounds';
import type { LapTimer } from './lapTimer';
import { createLapTimer } from './lapTimer';

export const TOTAL_LAPS = 3;
const PHYSICS_STEP = 1 / 120;
const START_DISTANCE = 6;

export type CarSnapshot = {
  state: CarState;
  input: CarInput;
  distance: number;
  forwardSpeed: number;
  /** Sideways acceleration felt by the driver, m/s². */
  lateralAcceleration: number;
};

export type RaceSession = {
  /** Advances the simulation by real elapsed time using fixed physics steps. */
  advance: (dt: number, readInput: (dt: number) => CarInput) => void;
  resetToTrack: () => void;
  player: () => CarSnapshot;
  laps: LapTimer;
  elapsedSeconds: () => number;
};

const IDLE: CarInput = { throttle: 0, brake: 0, steer: 0, handbrake: false };

const carAt = (track: Track, distance: number): CarState => {
  const sample = track.sampleAt(distance);
  return { x: sample.x, z: sample.z, heading: Math.atan2(sample.tangentX, sample.tangentZ), velocityX: 0, velocityZ: 0, yawRate: 0 };
};

export const createRaceSession = (track: Track): RaceSession => {
  let state = carAt(track, START_DISTANCE);
  let input = IDLE;
  let trackIndex: number | undefined;
  let distance = START_DISTANCE;
  let lateralAcceleration = 0;
  let accumulator = 0;
  let elapsed = 0;
  const laps = createLapTimer(track.length);

  const step = (stepInput: CarInput): void => {
    const next = stepCar(state, stepInput, PHYSICS_STEP);
    lateralAcceleration = forwardSpeedOf(next) * next.yawRate;
    const bounded = constrainToTrack(next, track, trackIndex);
    state = bounded.state;
    trackIndex = bounded.trackIndex;
    distance = bounded.distance;
    elapsed += PHYSICS_STEP;
    laps.update(distance, elapsed);
  };

  const advance = (dt: number, readInput: (dt: number) => CarInput): void => {
    accumulator += dt;
    while (accumulator >= PHYSICS_STEP) {
      input = readInput(PHYSICS_STEP);
      step(input);
      accumulator -= PHYSICS_STEP;
    }
  };

  const resetToTrack = (): void => {
    const projection = track.project(state.x, state.z, trackIndex);
    state = carAt(track, projection.distance);
    trackIndex = projection.index;
  };

  const player = (): CarSnapshot => ({ state, input, distance, forwardSpeed: forwardSpeedOf(state), lateralAcceleration });

  return { advance, resetToTrack, player, laps, elapsedSeconds: () => elapsed };
};
