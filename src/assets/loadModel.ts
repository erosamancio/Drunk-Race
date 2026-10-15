import { Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map<string, Promise<Group>>();

const resolveAssetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

// Each caller gets its own clone so it can be positioned and recolored independently.
export const loadModel = async (path: string): Promise<Group> => {
  let pending = cache.get(path);
  if (!pending) {
    pending = loader.loadAsync(resolveAssetUrl(path)).then((gltf) => gltf.scene);
    cache.set(path, pending);
  }
  const original = await pending;
  return original.clone(true);
};
