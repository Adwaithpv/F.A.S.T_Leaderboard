export type PlanetClass =
  | 'rocky'
  | 'desert'
  | 'oceanic'
  | 'ice'
  | 'lush'
  | 'gas_giant'
  | 'ringed_giant'
  | 'aurora_exotic'
  | 'obsidian'
  | 'storm_electric';

export type MomentumState = 'surging' | 'rising' | 'steady' | 'cooling';

export type PlanetDNA = {
  seed: number;
  planetClass: PlanetClass;
  palette: {
    base: string;
    secondary: string;
    atmosphere: string;
    emissive: string;
    cloud: string;
  };
  terrainStyle: 'cratered' | 'mineral' | 'banded' | 'liquid' | 'icy' | 'lush';
  atmosphereDensityBase: number;
  roughnessBase: number;
  ringProbability: number;
  moonRange: [number, number];
  cloudStrength: number;
  emissiveSignature: number;
  axialTilt: number;
  rotationSpeedBase: number;
};

export type GalaxyTeam = {
  id: string;
  name: string;
  logo?: string;
  colorHint?: string;
  basePoints: number;
  currentPoints: number;
  rank: number;
  scoreGapToLeader: number;
  scoreGapToPrev: number;
  normalizedInfluence: number;
  normalizedGap: number;
  momentum: MomentumState;
  deltaPoints: number;
  orbitBand: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitInclination: number;
  orbitEccentricity: number;
  orbitPhase: number;
};

export type BaseTeamInput = {
  id: string;
  name: string;
  logo?: string;
  colorHint?: string;
  basePoints: number;
  currentPoints: number;
};
