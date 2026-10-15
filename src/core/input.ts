import type { CarInput } from '../vehicle/carPhysics';

export type PlayerInput = {
  read: (dt: number) => CarInput;
  /** True once per press of the reset key or gamepad button. */
  consumeReset: () => boolean;
};

const STEER_RAMP_PER_SECOND = 4.5;
const STEER_RETURN_PER_SECOND = 7;
const STICK_DEAD_ZONE = 0.12;

const THROTTLE_KEYS = ['KeyW', 'ArrowUp'];
const BRAKE_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const HANDBRAKE_KEYS = ['Space'];
const RESET_KEYS = ['KeyR'];
const GAME_KEYS = new Set([...THROTTLE_KEYS, ...BRAKE_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, ...HANDBRAKE_KEYS, ...RESET_KEYS]);

// Standard gamepad mapping: left stick X, A, X, LT, RT.
const GAMEPAD = { steerAxis: 0, handbrake: 0, reset: 3, brake: 6, throttle: 7 } as const;

const approach = (current: number, target: number, maxStep: number): number =>
  current + Math.max(-maxStep, Math.min(maxStep, target - current));

const applyDeadZone = (value: number): number =>
  Math.abs(value) < STICK_DEAD_ZONE ? 0 : Math.sign(value) * ((Math.abs(value) - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE));

const firstGamepad = (): Gamepad | undefined => navigator.getGamepads?.().find((pad): pad is Gamepad => pad !== null);

export const createPlayerInput = (target: Window = window): PlayerInput => {
  const held = new Set<string>();
  let resetRequested = false;
  let gamepadResetHeld = false;
  let keyboardSteer = 0;

  target.addEventListener('keydown', (event) => {
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    if (RESET_KEYS.includes(event.code) && !event.repeat) resetRequested = true;
    held.add(event.code);
  });
  target.addEventListener('keyup', (event) => held.delete(event.code));
  target.addEventListener('blur', () => held.clear());

  const isHeld = (codes: readonly string[]): boolean => codes.some((code) => held.has(code));

  const read = (dt: number): CarInput => {
    const steerTarget = (isHeld(RIGHT_KEYS) ? 1 : 0) - (isHeld(LEFT_KEYS) ? 1 : 0);
    const ramp = steerTarget === 0 || Math.sign(steerTarget) !== Math.sign(keyboardSteer) ? STEER_RETURN_PER_SECOND : STEER_RAMP_PER_SECOND;
    keyboardSteer = approach(keyboardSteer, steerTarget, ramp * dt);

    const pad = firstGamepad();
    const padSteer = applyDeadZone(pad?.axes[GAMEPAD.steerAxis] ?? 0);
    const padResetPressed = pad?.buttons[GAMEPAD.reset]?.pressed ?? false;
    if (padResetPressed && !gamepadResetHeld) resetRequested = true;
    gamepadResetHeld = padResetPressed;

    return {
      throttle: Math.max(isHeld(THROTTLE_KEYS) ? 1 : 0, pad?.buttons[GAMEPAD.throttle]?.value ?? 0),
      brake: Math.max(isHeld(BRAKE_KEYS) ? 1 : 0, pad?.buttons[GAMEPAD.brake]?.value ?? 0),
      steer: Math.abs(padSteer) > Math.abs(keyboardSteer) ? padSteer : keyboardSteer,
      handbrake: isHeld(HANDBRAKE_KEYS) || (pad?.buttons[GAMEPAD.handbrake]?.pressed ?? false),
    };
  };

  const consumeReset = (): boolean => {
    const requested = resetRequested;
    resetRequested = false;
    return requested;
  };

  return { read, consumeReset };
};
