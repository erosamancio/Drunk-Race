import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  PlaneGeometry,
} from 'three';
import type { Track, TrackSample } from '../track/trackLayout';
import { rightOf } from '../track/trackLayout';
import { NEON } from './palette';

const SAMPLE_STEP = 3;
const ROAD_Y = 0.02;
const WALL_HEIGHT = 1.1;
const WALL_GAP = 0.3;
const DASH_EVERY = 4;

type Strip = { inner: number; outer: number; bottom: number; top: number };

const pointAt = (sample: TrackSample, lateral: number, y: number): [number, number, number] => {
  const [rightX, rightZ] = rightOf(sample.tangentX, sample.tangentZ);
  return [sample.x + rightX * lateral, y, sample.z + rightZ * lateral];
};

// Builds a closed ribbon along the track between two lateral offsets (flat) or two heights (vertical).
const buildStrip = (track: Track, strip: Strip, include: (segment: number) => boolean = () => true): BufferGeometry => {
  const samples = track.samples.filter((_, index) => index % SAMPLE_STEP === 0);
  const positions: number[] = [];
  const indices: number[] = [];
  samples.forEach((sample) => {
    positions.push(...pointAt(sample, strip.inner, strip.bottom), ...pointAt(sample, strip.outer, strip.top));
  });
  const count = samples.length;
  for (let segment = 0; segment < count; segment += 1) {
    if (!include(segment)) continue;
    const a = segment * 2;
    const b = ((segment + 1) % count) * 2;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const glow = (color: number, intensity: number): MeshStandardMaterial =>
  new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, side: DoubleSide });

const createCheckerTexture = (): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 2;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas não disponível');
  for (let x = 0; x < 16; x += 1) {
    for (let y = 0; y < 2; y += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? '#f4f1ff' : '#0b0716';
      context.fillRect(x, y, 1, 1);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  return texture;
};

const createStartLine = (track: Track): Mesh => {
  const start = track.sampleAt(0);
  const line = new Mesh(
    new PlaneGeometry(track.halfWidth * 2, 2),
    new MeshStandardMaterial({ map: createCheckerTexture(), emissive: 0xffffff, emissiveIntensity: 0.15, emissiveMap: createCheckerTexture() }),
  );
  line.rotation.set(-Math.PI / 2, 0, Math.atan2(start.tangentX, start.tangentZ));
  line.position.set(start.x, ROAD_Y + 0.01, start.z);
  return line;
};

export const buildTrackMeshes = (track: Track): Group => {
  const group = new Group();
  const width = track.halfWidth;
  const wallOffset = width + WALL_GAP;

  const road = new Mesh(
    buildStrip(track, { inner: -width - WALL_GAP, outer: width + WALL_GAP, bottom: ROAD_Y, top: ROAD_Y }),
    new MeshStandardMaterial({ color: 0x17132a, roughness: 0.42, metalness: 0.35, side: DoubleSide }),
  );
  road.receiveShadow = true;

  const leftEdge = new Mesh(buildStrip(track, { inner: -width + 0.25, outer: -width + 0.6, bottom: ROAD_Y + 0.005, top: ROAD_Y + 0.005 }), glow(NEON.cyan, 2.5));
  const rightEdge = new Mesh(buildStrip(track, { inner: width - 0.6, outer: width - 0.25, bottom: ROAD_Y + 0.005, top: ROAD_Y + 0.005 }), glow(NEON.magenta, 2.5));
  const centreDashes = new Mesh(
    buildStrip(track, { inner: -0.15, outer: 0.15, bottom: ROAD_Y + 0.005, top: ROAD_Y + 0.005 }, (segment) => Math.floor(segment / DASH_EVERY) % 2 === 0),
    glow(0xd9d4ff, 0.6),
  );

  const wallMaterial = new MeshStandardMaterial({ color: 0x0d0a18, roughness: 0.8, side: DoubleSide });
  const leftWall = new Mesh(buildStrip(track, { inner: -wallOffset, outer: -wallOffset, bottom: 0, top: WALL_HEIGHT }), wallMaterial);
  const rightWall = new Mesh(buildStrip(track, { inner: wallOffset, outer: wallOffset, bottom: 0, top: WALL_HEIGHT }), wallMaterial);
  const leftWallGlow = new Mesh(buildStrip(track, { inner: -wallOffset, outer: -wallOffset, bottom: WALL_HEIGHT - 0.12, top: WALL_HEIGHT }), glow(NEON.cyan, 3));
  const rightWallGlow = new Mesh(buildStrip(track, { inner: wallOffset, outer: wallOffset, bottom: WALL_HEIGHT - 0.12, top: WALL_HEIGHT }), glow(NEON.magenta, 3));

  group.add(road, leftEdge, rightEdge, centreDashes, leftWall, rightWall, leftWallGlow, rightWallGlow, createStartLine(track));
  return group;
};
