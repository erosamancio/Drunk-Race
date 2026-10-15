export const CAR_MODELS = [
  'race',
  'race-future',
  'sedan-sports',
  'hatchback-sports',
  'suv-luxury',
  'taxi',
  'police',
  'kart-oopi',
] as const;

export const TRACK_MODELS = [
  'roadStraight',
  'roadStraightLong',
  'roadCornerSmall',
  'roadCornerLarge',
  'roadCornerLarger',
  'roadCurved',
  'roadStart',
  'roadStartPositions',
  'barrierWall',
  'barrierRed',
  'flagCheckers',
  'lightPostModern',
  'overheadLights',
] as const;

export const CITY_MODELS = [
  'building-type-a',
  'building-type-c',
  'building-type-e',
  'building-type-h',
  'building-type-k',
  'tree-large',
  'fence',
  'planter',
] as const;

export type CarModel = (typeof CAR_MODELS)[number];
export type TrackModel = (typeof TRACK_MODELS)[number];
export type CityModel = (typeof CITY_MODELS)[number];

export const carModelPath = (name: CarModel): string => `models/cars/${name}.glb`;
export const trackModelPath = (name: TrackModel): string => `models/track/${name}.glb`;
export const cityModelPath = (name: CityModel): string => `models/city/${name}.glb`;

export const ALL_MODEL_PATHS: readonly string[] = [
  ...CAR_MODELS.map(carModelPath),
  ...TRACK_MODELS.map(trackModelPath),
  ...CITY_MODELS.map(cityModelPath),
];
