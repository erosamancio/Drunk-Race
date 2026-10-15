import { followTrack } from './ai/followTrack';
import { createPlayerInput } from './core/input';
import { startLoop } from './core/startLoop';
import { createRaceHud } from './hud/raceHud';
import { TOTAL_LAPS, createRaceSession } from './race/createRaceSession';
import { createCarView } from './render/carView';
import { createChaseCamera } from './render/chaseCamera';
import { createPostProcessing } from './render/createPostProcessing';
import { createRaceScene } from './render/createRaceScene';
import { createRenderer } from './render/createRenderer';
import { NEON_CIRCUIT, createTrack } from './track/trackLayout';
import type { CarInput } from './vehicle/carPhysics';

declare global {
  interface Window {
    drunkRace?: { ready: boolean; snapshot: () => { speedKmh: number; lapsCompleted: number; distance: number } };
  }
}

const TRACK_HALF_WIDTH = 8;
const HELP_VISIBLE_SECONDS = 8;
const MS_TO_KMH = 3.6;

const findCanvas = (): HTMLCanvasElement => {
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas) throw new Error('Canvas #game não encontrado');
  return canvas;
};

const setStatus = (text: string): void => {
  const status = document.querySelector('#status');
  if (status) status.textContent = text;
};

const boot = async (): Promise<void> => {
  const track = createTrack(NEON_CIRCUIT, TRACK_HALF_WIDTH);
  const renderer = createRenderer(findCanvas());
  const [raceScene, carView] = await Promise.all([createRaceScene(track), createCarView('race-future')]);
  raceScene.scene.add(carView.root);

  const chase = createChaseCamera(window.innerWidth / window.innerHeight);
  const composer = createPostProcessing(renderer, raceScene.scene, chase.camera);
  const session = createRaceSession(track);
  const hud = createRaceHud();
  const playerInput = createPlayerInput();
  const autopilot = new URLSearchParams(window.location.search).has('autopilot');

  const readInput = (dt: number): CarInput => {
    const player = session.player();
    return autopilot ? followTrack(player.state, track, player.distance, { pace: 0.95, laneOffset: 0 }) : playerInput.read(dt);
  };

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    composer.setSize(window.innerWidth, window.innerHeight);
    chase.camera.aspect = window.innerWidth / window.innerHeight;
    chase.camera.updateProjectionMatrix();
  });

  const chaseTarget = () => {
    const { state, forwardSpeed } = session.player();
    return { x: state.x, z: state.z, heading: state.heading, speed: forwardSpeed };
  };
  chase.snap(chaseTarget());

  startLoop((delta) => {
    if (playerInput.consumeReset()) session.resetToTrack();
    session.advance(delta, readInput);
    const player = session.player();
    carView.update(
      { x: player.state.x, z: player.state.z, heading: player.state.heading, forwardSpeed: player.forwardSpeed, steer: player.input.steer, lateralAcceleration: player.lateralAcceleration },
      delta,
    );
    chase.update(chaseTarget(), delta);
    raceScene.followWithShadows(player.state.x, player.state.z);
    hud.update({
      speedKmh: Math.abs(player.forwardSpeed) * MS_TO_KMH,
      lap: session.laps.completedLaps + 1,
      totalLaps: TOTAL_LAPS,
      currentLapSeconds: session.laps.currentLapSeconds,
      bestLapSeconds: session.laps.bestLapSeconds,
    });
    composer.render(delta);
  });

  setStatus('');
  window.setTimeout(() => document.querySelector('#hud-help')?.classList.add('is-hidden'), HELP_VISIBLE_SECONDS * 1000);
  window.drunkRace = {
    ready: true,
    snapshot: () => ({ speedKmh: Math.abs(session.player().forwardSpeed) * MS_TO_KMH, lapsCompleted: session.laps.completedLaps, distance: session.player().distance }),
  };
};

boot().catch((error: unknown) => {
  console.error(error);
  setStatus('erro ao carregar');
});
