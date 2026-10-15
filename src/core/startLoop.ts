import { Clock } from 'three';

export type FrameCallback = (deltaSeconds: number, elapsedSeconds: number) => void;

// Clamping the delta keeps physics stable after the tab was in the background.
const MAX_DELTA_SECONDS = 1 / 20;

export const startLoop = (onFrame: FrameCallback): void => {
  const clock = new Clock();
  const tick = (): void => {
    const delta = Math.min(clock.getDelta(), MAX_DELTA_SECONDS);
    onFrame(delta, clock.elapsedTime);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
