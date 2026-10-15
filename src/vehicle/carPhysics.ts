export type CarInput = {
  /** 0..1 */
  throttle: number;
  /** 0..1, brakes while moving forward and reverses when stopped. */
  brake: number;
  /** -1 (left) .. 1 (right) */
  steer: number;
  handbrake: boolean;
};

export type CarState = {
  x: number;
  z: number;
  /** Radians; 0 faces +Z. */
  heading: number;
  velocityX: number;
  velocityZ: number;
  yawRate: number;
};

export type CarTuning = {
  maxSpeed: number;
  engineAcceleration: number;
  brakeDeceleration: number;
  reverseAcceleration: number;
  maxReverseSpeed: number;
  rollingResistance: number;
  aerodynamicDrag: number;
  /** How fast sideways velocity is killed, per second. Lower means more drift. */
  grip: number;
  handbrakeGrip: number;
  maxYawRate: number;
  /** Speed at which steering reaches full authority. */
  fullSteerSpeed: number;
  /** Fraction of steering lost at top speed, so the car is calm on straights. */
  highSpeedSteerLoss: number;
};

export const DEFAULT_TUNING: CarTuning = {
  maxSpeed: 52,
  engineAcceleration: 16,
  brakeDeceleration: 30,
  reverseAcceleration: 9,
  maxReverseSpeed: 12,
  rollingResistance: 0.6,
  aerodynamicDrag: 0.001,
  grip: 7.5,
  handbrakeGrip: 1.4,
  maxYawRate: 2.1,
  fullSteerSpeed: 9,
  highSpeedSteerLoss: 0.5,
};

const STOPPED_SPEED = 0.6;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const forwardOf = (heading: number): readonly [number, number] => [Math.sin(heading), Math.cos(heading)];

export const speedOf = (state: CarState): number => Math.hypot(state.velocityX, state.velocityZ);

export const forwardSpeedOf = (state: CarState): number => {
  const [forwardX, forwardZ] = forwardOf(state.heading);
  return state.velocityX * forwardX + state.velocityZ * forwardZ;
};

const applyLongitudinal = (forwardSpeed: number, input: CarInput, tuning: CarTuning, dt: number): number => {
  let speed = forwardSpeed;
  if (input.throttle > 0 && speed >= -STOPPED_SPEED) {
    speed += tuning.engineAcceleration * input.throttle * Math.max(0, 1 - speed / tuning.maxSpeed) * dt;
  }
  if (input.brake > 0) {
    if (speed > STOPPED_SPEED) {
      speed = Math.max(0, speed - tuning.brakeDeceleration * input.brake * dt);
    } else {
      speed = Math.max(-tuning.maxReverseSpeed, speed - tuning.reverseAcceleration * input.brake * dt);
    }
  }
  if (input.throttle > 0 && speed < -STOPPED_SPEED) {
    speed = Math.min(0, speed + tuning.brakeDeceleration * input.throttle * dt);
  }
  const resistance = (tuning.rollingResistance + tuning.aerodynamicDrag * speed * speed) * dt;
  return Math.abs(speed) <= resistance ? 0 : speed - Math.sign(speed) * resistance;
};

const steeringAuthority = (forwardSpeed: number, tuning: CarTuning): number => {
  const absolute = Math.abs(forwardSpeed);
  const lowSpeed = clamp(absolute / tuning.fullSteerSpeed, 0, 1);
  const highSpeed = 1 - tuning.highSpeedSteerLoss * clamp(absolute / tuning.maxSpeed, 0, 1);
  return lowSpeed * highSpeed * Math.sign(forwardSpeed);
};

export const stepCar = (state: CarState, input: CarInput, dt: number, tuning: CarTuning = DEFAULT_TUNING): CarState => {
  const [forwardX, forwardZ] = forwardOf(state.heading);
  const rightX = -forwardZ;
  const rightZ = forwardX;
  const forwardSpeed = state.velocityX * forwardX + state.velocityZ * forwardZ;
  const sideSpeed = state.velocityX * rightX + state.velocityZ * rightZ;

  const nextForwardSpeed = applyLongitudinal(forwardSpeed, input, tuning, dt);
  const grip = input.handbrake ? tuning.handbrakeGrip : tuning.grip;
  const nextSideSpeed = sideSpeed * Math.exp(-grip * dt);

  // Steering right (+1) turns the nose toward the right vector, which is a negative heading change.
  const yawRate = -clamp(input.steer, -1, 1) * tuning.maxYawRate * steeringAuthority(nextForwardSpeed, tuning);
  const heading = state.heading + yawRate * dt;

  const velocityX = forwardX * nextForwardSpeed + rightX * nextSideSpeed;
  const velocityZ = forwardZ * nextForwardSpeed + rightZ * nextSideSpeed;
  return {
    x: state.x + velocityX * dt,
    z: state.z + velocityZ * dt,
    heading,
    velocityX,
    velocityZ,
    yawRate,
  };
};
