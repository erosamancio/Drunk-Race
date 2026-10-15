import type { Camera, Scene, WebGLRenderer } from 'three';
import { HalfFloatType } from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, VignetteEffect } from 'postprocessing';

export const createPostProcessing = (renderer: WebGLRenderer, scene: Scene, camera: Camera): EffectComposer => {
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new EffectPass(
      camera,
      new BloomEffect({ intensity: 1.6, luminanceThreshold: 0.35, luminanceSmoothing: 0.2, mipmapBlur: true }),
      new VignetteEffect({ offset: 0.3, darkness: 0.65 }),
      new SMAAEffect(),
    ),
  );
  return composer;
};
