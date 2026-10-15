import type { Track } from '../track/trackLayout';
import type { CarInput, CarState } from '../vehicle/carPhysics';
import { DEFAULT_TUNING, forwardSpeedOf } from '../vehicle/carPhysics';

export type FollowTrackOptions = {
  /** 0..1 share of the car's top speed the driver is willing to use. */
  pace: number;
  /** Metres to the left (-) or right (+) of the centre line to aim for. */
  laneOffset: number;
};

const LOOK_AHEAD_BASE = 9;
const LOOK_AHEAD_PER_SPEED = 0.45;
const CORNER_SCAN_DISTANCE = 70;
const STEER_GAIN = 2.2;
const CORNER_SPEED_FACTOR = 75;

const wrapAngle = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

const headingOf = (tangentX: number, tangentZ: number): number => Math.atan2(tangentX, tangentZ);

// How much the track turns over the next stretch, in radians.
const upcomingTurn = (track: Track, distance: number): number => {
  const here = track.sampleAt(distance);
  let maxTurn = 0;
  for (let ahead = 10; ahead <= CORNER_SCAN_DISTANCE; ahead += 10) {
    const there = track.sampleAt(distance + ahead);
    const turn = Math.abs(wrapAngle(headingOf(there.tangentX, there.tangentZ) - headingOf(here.tangentX, here.tangentZ)));
    maxTurn = Math.max(maxTurn, turn / (ahead / CORNER_SCAN_DISTANCE));
  }
  return maxTurn;
};

// A simple pure-pursuit driver: aim at a point ahead on the racing line and lift for corners.
export const followTrack = (state: CarState, track: Track, distance: number, options: FollowTrackOptions): CarInput => {
  const forwardSpeed = forwardSpeedOf(state);
  const target = track.sampleAt(distance + LOOK_AHEAD_BASE + Math.max(0, forwardSpeed) * LOOK_AHEAD_PER_SPEED);
  const targetX = target.x + -target.tangentZ * options.laneOffset;
  const targetZ = target.z + target.tangentX * options.laneOffset;
  const desiredHeading = Math.atan2(targetX - state.x, targetZ - state.z);
  const headingError = wrapAngle(desiredHeading - state.heading);

  const topSpeed = DEFAULT_TUNING.maxSpeed * options.pace;
  const cornerSpeed = topSpeed / (1 + upcomingTurn(track, distance) * CORNER_SPEED_FACTOR / DEFAULT_TUNING.maxSpeed);
  const overSpeed = forwardSpeed - cornerSpeed;

  return {
    steer: Math.max(-1, Math.min(1, -headingError * STEER_GAIN)),
    throttle: overSpeed < 0 ? 1 : 0,
    brake: overSpeed > 3 ? Math.min(1, overSpeed / 10) : 0,
    handbrake: false,
  };
};
