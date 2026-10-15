import { CatmullRomCurve3, Vector3 } from 'three';

export type TrackSample = {
  x: number;
  z: number;
  /** Unit forward direction of the track at this sample. */
  tangentX: number;
  tangentZ: number;
  distance: number;
};

export type TrackProjection = {
  index: number;
  /** Distance along the centre line from the start line, in metres. */
  distance: number;
  /** Signed distance from the centre line; positive is to the right of travel. */
  lateral: number;
  sample: TrackSample;
};

export type Track = {
  samples: readonly TrackSample[];
  length: number;
  halfWidth: number;
  project: (x: number, z: number, hintIndex?: number) => TrackProjection;
  sampleAt: (distance: number) => TrackSample;
};

// A closed loop of about 1.3 km: long start straight, hairpin, an S and a fast sweeper.
export const NEON_CIRCUIT: readonly (readonly [number, number])[] = [
  [0, 0],
  [0, 150],
  [30, 230],
  [110, 260],
  [190, 230],
  [220, 160],
  [180, 100],
  [200, 30],
  [260, -20],
  [260, -120],
  [180, -180],
  [60, -170],
  [10, -100],
];

const SAMPLE_COUNT = 2400;
const LOCAL_SEARCH_WINDOW = 60;

// Right of travel for a forward vector (fx, fz) on the XZ plane with Y up.
export const rightOf = (forwardX: number, forwardZ: number): readonly [number, number] => [-forwardZ, forwardX];

const buildSamples = (points: readonly (readonly [number, number])[]): TrackSample[] => {
  const curve = new CatmullRomCurve3(
    points.map(([x, z]) => new Vector3(x, 0, z)),
    true,
    'centripetal',
  );
  const positions = curve.getSpacedPoints(SAMPLE_COUNT).slice(0, SAMPLE_COUNT);
  const length = curve.getLength();
  return positions.map((point, index) => {
    const tangent = curve.getTangentAt(index / SAMPLE_COUNT);
    return {
      x: point.x,
      z: point.z,
      tangentX: tangent.x,
      tangentZ: tangent.z,
      distance: (index / SAMPLE_COUNT) * length,
    };
  });
};

const squaredDistanceTo = (sample: TrackSample, x: number, z: number): number => (sample.x - x) ** 2 + (sample.z - z) ** 2;

export const createTrack = (points: readonly (readonly [number, number])[], halfWidth: number): Track => {
  const samples = buildSamples(points);
  const count = samples.length;
  const last = samples[count - 1];
  const first = samples[0];
  if (!last || !first) throw new Error('Track needs at least one sample');
  const length = last.distance + Math.hypot(first.x - last.x, first.z - last.z);

  const sampleAtIndex = (index: number): TrackSample => {
    const sample = samples[((index % count) + count) % count];
    if (!sample) throw new Error(`Track sample ${index} out of range`);
    return sample;
  };

  const nearestIndex = (x: number, z: number, from: number, to: number): number => {
    let best = from;
    let bestDistance = Infinity;
    for (let i = from; i <= to; i += 1) {
      const candidate = squaredDistanceTo(sampleAtIndex(i), x, z);
      if (candidate < bestDistance) {
        bestDistance = candidate;
        best = i;
      }
    }
    return ((best % count) + count) % count;
  };

  const project = (x: number, z: number, hintIndex?: number): TrackProjection => {
    const index =
      hintIndex === undefined
        ? nearestIndex(x, z, 0, count - 1)
        : nearestIndex(x, z, hintIndex - LOCAL_SEARCH_WINDOW, hintIndex + LOCAL_SEARCH_WINDOW);
    const sample = sampleAtIndex(index);
    const [rightX, rightZ] = rightOf(sample.tangentX, sample.tangentZ);
    const offsetX = x - sample.x;
    const offsetZ = z - sample.z;
    const along = offsetX * sample.tangentX + offsetZ * sample.tangentZ;
    return {
      index,
      distance: (sample.distance + along + length) % length,
      lateral: offsetX * rightX + offsetZ * rightZ,
      sample,
    };
  };

  const sampleAt = (distance: number): TrackSample => {
    const wrapped = ((distance % length) + length) % length;
    return sampleAtIndex(Math.round((wrapped / length) * count));
  };

  return { samples, length, halfWidth, project, sampleAt };
};
