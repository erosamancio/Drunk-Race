import { describe, expect, it } from 'vitest';
import type { CarInput, CarState } from '../src/vehicle/carPhysics';
import { DEFAULT_TUNING, forwardSpeedOf, speedOf, stepCar } from '../src/vehicle/carPhysics';

const DT = 1 / 120;
const IDLE: CarInput = { throttle: 0, brake: 0, steer: 0, handbrake: false };
const STOPPED: CarState = { x: 0, z: 0, heading: 0, velocityX: 0, velocityZ: 0, yawRate: 0 };

const drive = (state: CarState, input: CarInput, seconds: number): CarState => {
  let current = state;
  for (let t = 0; t < seconds; t += DT) current = stepCar(current, input, DT);
  return current;
};

describe('stepCar', () => {
  it('accelerates forward along +Z when facing heading 0', () => {
    const after = drive(STOPPED, { ...IDLE, throttle: 1 }, 2);
    expect(after.z).toBeGreaterThan(5);
    expect(Math.abs(after.x)).toBeLessThan(1e-6);
  });

  it('never exceeds the top speed', () => {
    const after = drive(STOPPED, { ...IDLE, throttle: 1 }, 60);
    expect(speedOf(after)).toBeLessThanOrEqual(DEFAULT_TUNING.maxSpeed);
    expect(speedOf(after)).toBeGreaterThan(DEFAULT_TUNING.maxSpeed * 0.7);
  });

  it('brakes to a stop and then reverses', () => {
    const moving = drive(STOPPED, { ...IDLE, throttle: 1 }, 3);
    const stopped = drive(moving, { ...IDLE, brake: 1 }, 1.5);
    expect(forwardSpeedOf(stopped)).toBeLessThan(0.7);
    const reversing = drive(stopped, { ...IDLE, brake: 1 }, 2);
    expect(forwardSpeedOf(reversing)).toBeLessThan(-3);
  });

  it('coasts to a stop on its own', () => {
    const moving = drive(STOPPED, { ...IDLE, throttle: 1 }, 2);
    expect(speedOf(drive(moving, IDLE, 60))).toBe(0);
  });

  it('turns right toward -X when steering right', () => {
    const moving = drive(STOPPED, { ...IDLE, throttle: 1 }, 2);
    const turned = drive(moving, { ...IDLE, throttle: 1, steer: 1 }, 1);
    expect(turned.heading).toBeLessThan(moving.heading);
    expect(turned.x).toBeLessThan(moving.x);
  });

  it('does not turn while standing still', () => {
    expect(drive(STOPPED, { ...IDLE, steer: 1 }, 1).heading).toBe(0);
  });

  it('slides more with the handbrake on', () => {
    const moving = drive(STOPPED, { ...IDLE, throttle: 1 }, 4);
    const sideSlip = (state: CarState): number => Math.abs(Math.cos(state.heading) * state.velocityX - Math.sin(state.heading) * state.velocityZ);
    const gripped = drive(moving, { ...IDLE, steer: 1 }, 0.5);
    const drifting = drive(moving, { ...IDLE, steer: 1, handbrake: true }, 0.5);
    expect(sideSlip(drifting)).toBeGreaterThan(sideSlip(gripped));
  });
});
