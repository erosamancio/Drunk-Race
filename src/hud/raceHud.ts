export type HudState = {
  speedKmh: number;
  lap: number;
  totalLaps: number;
  currentLapSeconds: number;
  bestLapSeconds: number | undefined;
};

const formatLapTime = (seconds: number | undefined): string => {
  if (seconds === undefined) return '--:--.--';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${rest.toFixed(2).padStart(5, '0')}`;
};

const element = <T extends HTMLElement>(selector: string): T => {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`HUD element ${selector} não encontrado`);
  return found;
};

export const createRaceHud = (): { update: (state: HudState) => void } => {
  const speed = element('#hud-speed');
  const lap = element('#hud-lap');
  const lapTime = element('#hud-lap-time');
  const bestLap = element('#hud-best-lap');
  let lastText = '';

  const update = (state: HudState): void => {
    const next = `${Math.round(state.speedKmh)}|${state.lap}|${formatLapTime(state.currentLapSeconds)}|${formatLapTime(state.bestLapSeconds)}`;
    if (next === lastText) return;
    lastText = next;
    speed.textContent = String(Math.round(state.speedKmh));
    lap.textContent = `${Math.min(state.lap, state.totalLaps)}/${state.totalLaps}`;
    lapTime.textContent = formatLapTime(state.currentLapSeconds);
    bestLap.textContent = formatLapTime(state.bestLapSeconds);
  };

  return { update };
};
