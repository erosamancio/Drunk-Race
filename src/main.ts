import { startLoop } from './core/startLoop';
import { createPostProcessing } from './render/createPostProcessing';
import { createRenderer } from './render/createRenderer';
import { createShowroom } from './render/createShowroom';

declare global {
  interface Window {
    drunkRaceReady?: boolean;
  }
}

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
  const renderer = createRenderer(findCanvas());
  const showroom = await createShowroom(window.innerWidth / window.innerHeight);
  const composer = createPostProcessing(renderer, showroom.scene, showroom.camera);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    composer.setSize(window.innerWidth, window.innerHeight);
    showroom.camera.aspect = window.innerWidth / window.innerHeight;
    showroom.camera.updateProjectionMatrix();
  });

  startLoop((delta, elapsed) => {
    showroom.update(delta, elapsed);
    composer.render(delta);
  });
  setStatus('em construção');
  window.drunkRaceReady = true;
};

boot().catch((error: unknown) => {
  console.error(error);
  setStatus('erro ao carregar');
});
