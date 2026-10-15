import { describe, expect, it } from 'vitest';
import { followTrack } from '../src/ai/followTrack';
import { createLapTimer } from '../src/race/lapTimer';
import { NEON_CIRCUIT, createTrack } from '../src/track/trackLayout';
import type { CarState } from '../src/vehicle/carPhysics';
import { stepCar } from '../src/vehicle/carPhysics';
import { constrainToTrack } from '../src/vehicle/trackBounds';

const track = createTrack(NEON_CIRCUIT, 8);
const DT = 1 / 120;

describe('track', () => {
  it('is a closed loop of a sensible length', () => {
    expect(track.length).toBeGreaterThan(1000);
    expect(track.length).toBeLessThan(1800);
  });

  it('projects a point beside the start onto the start with a lateral offset', () => {
    const start = track.sampleAt(0);
    const projection = track.project(start.x - start.tangentZ * 3, start.z + start.tangentX * 3);
    expect(projection.lateral).toBeCloseTo(3, 1);
    expect(Math.min(projection.distance, track.length - projection.distance)).toBeLessThan(1);
  });

  it('pushes a car back inside the walls', () => {
    const start = track.sampleAt(100);
    const outside: CarState = { x: start.x - start.tangentZ * 20, z: start.z + start.tangentX * 20, heading: 0, velocityX: 0, velocityZ: 0, yawRate: 0 };
    const result = constrainToTrack(outside, track);
    expect(Math.abs(track.project(result.state.x, result.state.z).lateral)).toBeLessThanOrEqual(track.halfWidth);
  });
});

describe('autopilot on the neon circuit', () => {
  it('completes two laps without leaving the track', () => {
    const start = track.sampleAt(5);
    let state: CarState = { x: start.x, z: start.z, heading: Math.atan2(start.tangentX, start.tangentZ), velocityX: 0, velocityZ: 0, yawRate: 0 };
    let hint = 0;
    let distance = 5;
    let hardestImpact = 0;
    const timer = createLapTimer(track.length);
    for (let t = 0; t < 240 && timer.completedLaps < 2; t += DT) {
      state = stepCar(state, followTrack(state, track, distance, { pace: 0.95, laneOffset: 0 }), DT);
      const bounded = constrainToTrack(state, track, hint);
      state = bounded.state;
      hint = bounded.trackIndex;
      distance = bounded.distance;
      hardestImpact = Math.max(hardestImpact, bounded.impactSpeed);
      timer.update(distance, t);
    }
    expect(timer.completedLaps).toBe(2);
    expect(timer.bestLapSeconds).toBeLessThan(80);
    expect(hardestImpact).toBeLessThan(6);
  });
});
