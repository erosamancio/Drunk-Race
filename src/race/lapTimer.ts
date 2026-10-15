export type LapTimer = {
  /** Feed the car's distance along the track each step. */
  update: (distance: number, elapsedSeconds: number) => void;
  readonly completedLaps: number;
  readonly currentLapSeconds: number;
  readonly lastLapSeconds: number | undefined;
  readonly bestLapSeconds: number | undefined;
};

// A lap only counts after passing the far side of the track, so reversing over the line does nothing.
export const createLapTimer = (trackLength: number): LapTimer => {
  let completedLaps = 0;
  let lapStartedAt = 0;
  let now = 0;
  let passedHalfway = false;
  let previousDistance: number | undefined;
  let lastLapSeconds: number | undefined;
  let bestLapSeconds: number | undefined;

  const update = (distance: number, elapsedSeconds: number): void => {
    now = elapsedSeconds;
    const half = trackLength / 2;
    if (Math.abs(distance - half) < trackLength * 0.1) passedHalfway = true;
    const crossedLine = previousDistance !== undefined && previousDistance > trackLength * 0.9 && distance < trackLength * 0.1;
    if (crossedLine && passedHalfway) {
      const lapSeconds = elapsedSeconds - lapStartedAt;
      completedLaps += 1;
      lastLapSeconds = lapSeconds;
      bestLapSeconds = bestLapSeconds === undefined ? lapSeconds : Math.min(bestLapSeconds, lapSeconds);
      lapStartedAt = elapsedSeconds;
      passedHalfway = false;
    }
    previousDistance = distance;
  };

  return {
    update,
    get completedLaps() {
      return completedLaps;
    },
    get currentLapSeconds() {
      return now - lapStartedAt;
    },
    get lastLapSeconds() {
      return lastLapSeconds;
    },
    get bestLapSeconds() {
      return bestLapSeconds;
    },
  };
};
