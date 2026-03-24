import { BaseTeamInput, GalaxyTeam, MomentumState, PlanetClass, PlanetDNA } from './galaxyTypes';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed: number) => {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1000000) / 1000000;
  };
};

const PLANET_PALETTES: Record<PlanetClass, string[][]> = {
  rocky: [['#6f6558', '#3a3530', '#a39888', '#ff9e7a', '#8a8376']],
  desert: [['#c18f5f', '#8f5c34', '#e4be89', '#ffbf7a', '#d6a46f']],
  oceanic: [['#2c5a89', '#173550', '#5f9fca', '#8ec6ff', '#9bc8de']],
  ice: [['#99bfd2', '#5a7b92', '#cfe8f7', '#b2e2ff', '#d9f2ff']],
  lush: [['#4e8052', '#27462f', '#8bc174', '#9ef38f', '#7dcf9b']],
  gas_giant: [['#ad7c5d', '#6d4a35', '#d6b193', '#ffc996', '#d9b08f']],
  ringed_giant: [['#9a8da7', '#5f5669', '#c8bed0', '#d8b3ff', '#c6b5da']],
  aurora_exotic: [['#36507b', '#1d2f5f', '#7ca9ff', '#92ffd8', '#5ec7ff']],
  obsidian: [['#312a35', '#120f16', '#5f4f68', '#9b82c3', '#3f3a49']],
  storm_electric: [['#44516f', '#1d2740', '#7f98c9', '#98c6ff', '#74b9ff']],
};

const pickPlanetClass = (random: () => number): PlanetClass => {
  const roll = random();
  if (roll < 0.2) {
    return random() > 0.45 ? 'rocky' : 'obsidian';
  }
  if (roll < 0.6) {
    const subRoll = random();
    if (subRoll < 0.26) return 'desert';
    if (subRoll < 0.52) return 'oceanic';
    if (subRoll < 0.76) return 'ice';
    return 'lush';
  }
  if (roll < 0.85) {
    return random() > 0.35 ? 'gas_giant' : 'ringed_giant';
  }
  return random() > 0.55 ? 'aurora_exotic' : 'storm_electric';
};

export const derivePlanetDNA = (teamId: string, basePoints: number, colorHint?: string): PlanetDNA => {
  const seed = hashString(teamId);
  const random = createSeededRandom(seed);
  const planetClass = pickPlanetClass(random);
  const paletteSet = PLANET_PALETTES[planetClass][0];

  const primary = colorHint ?? paletteSet[0];
  const secondary = paletteSet[1];
  const atmosphere = colorHint ?? paletteSet[2];
  const emissive = paletteSet[3];
  const cloud = paletteSet[4];

  const ringProbabilityByClass: Record<PlanetClass, number> = {
    rocky: 0.1,
    desert: 0.15,
    oceanic: 0.18,
    ice: 0.25,
    lush: 0.2,
    gas_giant: 0.5,
    ringed_giant: 0.82,
    aurora_exotic: 0.68,
    obsidian: 0.25,
    storm_electric: 0.4,
  };

  const moonRangeByClass: Record<PlanetClass, [number, number]> = {
    rocky: [0, 1],
    desert: [0, 2],
    oceanic: [1, 3],
    ice: [1, 3],
    lush: [1, 2],
    gas_giant: [2, 6],
    ringed_giant: [2, 8],
    aurora_exotic: [3, 7],
    obsidian: [0, 2],
    storm_electric: [2, 5],
  };

  const terrainByClass: Record<PlanetClass, PlanetDNA['terrainStyle']> = {
    rocky: 'cratered',
    desert: 'mineral',
    oceanic: 'liquid',
    ice: 'icy',
    lush: 'lush',
    gas_giant: 'banded',
    ringed_giant: 'banded',
    aurora_exotic: 'liquid',
    obsidian: 'cratered',
    storm_electric: 'banded',
  };

  return {
    seed,
    planetClass,
    palette: {
      base: primary,
      secondary,
      atmosphere,
      emissive,
      cloud,
    },
    terrainStyle: terrainByClass[planetClass],
    atmosphereDensityBase: lerp(0.12, 0.52, random()),
    roughnessBase: lerp(0.25, 0.85, random()),
    ringProbability: ringProbabilityByClass[planetClass],
    moonRange: moonRangeByClass[planetClass],
    cloudStrength: lerp(0.1, 0.9, random()),
    emissiveSignature: lerp(0.05, 0.6, random()),
    axialTilt: lerp(-0.45, 0.45, random()),
    rotationSpeedBase: lerp(0.05, 0.22, random()),
  };
};

const momentumFromDelta = (delta: number, maxPoints: number): MomentumState => {
  const normalizedDelta = maxPoints > 0 ? delta / maxPoints : 0;
  if (normalizedDelta > 0.1) return 'surging';
  if (normalizedDelta > 0.02) return 'rising';
  if (normalizedDelta < -0.02) return 'cooling';
  return 'steady';
};

type MapOptions = {
  previousPointsByTeam?: Record<string, number>;
  dwarfPlanetCount?: number;
};

// Mapping logic used by the 3D scene:
// - rank defines orbital order
// - score gap controls exact distance tension
// - current points scale influence, size, and motion profile
export const mapTournamentScoresToGalaxyTeams = (
  input: BaseTeamInput[],
  options: MapOptions = {},
): GalaxyTeam[] => {
  const sorted = [...input].sort((a, b) => b.currentPoints - a.currentPoints);
  const leaderPoints = sorted[0]?.currentPoints ?? 0;
  const tailPoints = sorted[sorted.length - 1]?.currentPoints ?? 0;
  const spread = Math.max(leaderPoints - tailPoints, 1);
  const dwarfPlanetCount = Math.max(0, Math.min(options.dwarfPlanetCount ?? 0, Math.max(sorted.length - 1, 0)));

  return sorted.map((item, index) => {
    const prevPoints = options.previousPointsByTeam?.[item.id] ?? item.currentPoints;
    const deltaPoints = item.currentPoints - prevPoints;
    const scoreGapToLeader = Math.max(0, leaderPoints - item.currentPoints);
    const scoreGapToPrev = index === 0 ? 0 : Math.max(0, sorted[index - 1].currentPoints - item.currentPoints);
    const normalizedInfluence = clamp01((item.currentPoints - tailPoints) / spread);
    const normalizedGap = clamp01(scoreGapToLeader / spread);
    const relativeRank = index / Math.max(sorted.length - 1, 1);
    const isDwarfPlanet = index > 0 && index >= sorted.length - dwarfPlanetCount;

    const baseRadius = 7.5 + index * 2.15;
    const spiralStretch = index === 0 ? 0 : Math.pow(index, 1.02) * 0.55;
    const gapStretch = normalizedGap * 3.2;
    const orbitRadius = index === 0 ? 0 : baseRadius + spiralStretch + gapStretch;

    const rankPull = 1 - relativeRank;
    const orbitSpeed = index === 0 ? 0 : lerp(0.016, 0.042, rankPull) * lerp(0.88, 1.05, 1 - normalizedGap);

    const phaseSeed = createSeededRandom(hashString(`phase-${item.id}`));
    const spiralOffset = index === 0 ? 0 : index * 0.52 + lerp(-0.08, 0.08, phaseSeed());
    const orbitHeight = index === 0 ? 0 : lerp(-0.12, 0.12, phaseSeed());
    const sizeScale = 0.88 / Math.pow(1.03, index);

    return {
      ...item,
      rank: index + 1,
      scoreGapToLeader,
      scoreGapToPrev,
      normalizedInfluence,
      normalizedGap,
      momentum: momentumFromDelta(deltaPoints, Math.max(leaderPoints, 1)),
      deltaPoints,
      orbitBand: index,
      orbitRadius,
      orbitSpeed,
      orbitInclination: lerp(-0.03, 0.03, phaseSeed()),
      orbitEccentricity: lerp(0.005, 0.03, phaseSeed()),
      orbitPhase: lerp(0, Math.PI * 2, phaseSeed()),
      spiralOffset,
      orbitHeight,
      sizeScale,
      isDwarfPlanet,
    };
  });
};
