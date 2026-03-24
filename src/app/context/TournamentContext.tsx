import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db, isFirebaseConfigured } from '../../imports/firebase';

export type Team = {
  id: string;
  name: string;
  icon: string;
  basePoints?: number;
  colorHint?: string;
  logo?: string;
  statusLabel?: string;
};

export type Game = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type Round = {
  id: string;
  name: string;
};

export type RoundVisualizationSettings = {
  visiblePlanetCount: number;
  dwarfPlanetCount: number;
};

export type Scores = {
  [gameId: string]: {
    [roundId: string]: {
      [teamId: string]: number;
    }
  }
};

interface TournamentContextType {
  teams: Team[];
  games: Game[];
  rounds: Round[];
  scores: Scores;
  roundTeams: Record<string, string[]>;
  roundVisualization: Record<string, RoundVisualizationSettings>;
  updateScore: (gameId: string, roundId: string, teamId: string, score: number) => void;
  getOverallScores: (roundId: string) => { team: Team; total: number; breakdown: { game: Game; score: number }[] }[];
  getGameScores: (gameId: string, roundId: string) => { team: Team; score: number }[];
  addTeamToRound: (roundId: string, team: Omit<Team, 'id'>) => void;
  removeTeamFromRound: (roundId: string, teamId: string) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  addGame: (game: Omit<Game, 'id'>) => void;
  updateGame: (gameId: string, updates: Partial<Game>) => void;
  updateRoundVisualization: (roundId: string, updates: Partial<RoundVisualizationSettings>) => void;
}

const defaultTeams: Team[] = [
  { id: 't1', name: 'Team Nova', icon: 'star', basePoints: 120, colorHint: '#7cc7ff' },
  { id: 't2', name: 'Team Helios', icon: 'sun', basePoints: 510, colorHint: '#ffbb6e' },
  { id: 't3', name: 'Team Atlas', icon: 'mountain', basePoints: 280, colorHint: '#8ee2b6' },
  { id: 't4', name: 'Team Eclipse', icon: 'moon', basePoints: 330, colorHint: '#b7a5ff' },
  { id: 't5', name: 'Team Quasar', icon: 'orbit', basePoints: 610, colorHint: '#81a8ff' },
  { id: 't6', name: 'Team Titan', icon: 'shield', basePoints: 210, colorHint: '#d6c08b' },
  { id: 't7', name: 'Team Obsidian', icon: 'hexagon', basePoints: 150, colorHint: '#9f8de2' },
  { id: 't8', name: 'Team Aurora', icon: 'sparkles', basePoints: 540, colorHint: '#6ee8d5' },
  { id: 't9', name: 'Team Zenith', icon: 'rocket', basePoints: 260, colorHint: '#ffc682' },
  { id: 't10', name: 'Team Vortex', icon: 'wind', basePoints: 185, colorHint: '#94b2ff' },
  ...Array.from({ length: 24 }).map((_, i) => ({
    id: `t${i + 11}`,
    name: `Team ${i + 11}`,
    icon: 'shield',
    basePoints: Math.floor(Math.random() * 500) + 50,
    colorHint: '#ffffff'
  }))
];

const defaultGames: Game[] = [
  { id: 'g1', name: 'Cyber Sprint', icon: 'cpu', color: '#00F0FF' },
  { id: 'g2', name: 'Neon Drift', icon: 'car', color: '#FF00FF' },
  { id: 'g3', name: 'Quantum Clash', icon: 'swords', color: '#8A2BE2' },
  { id: 'g4', name: 'Void Walkers', icon: 'rocket', color: '#0055FF' },
];

const defaultRounds: Round[] = [
  { id: 'r1', name: 'Round 1' },
  { id: 'r2', name: 'Round 2' },
  { id: 'r3', name: 'Round 3' },
];

const defaultRoundVisualization: Record<string, RoundVisualizationSettings> = {
  r1: { visiblePlanetCount: 40, dwarfPlanetCount: 12 },
  r2: { visiblePlanetCount: 20, dwarfPlanetCount: 6 },
  r3: { visiblePlanetCount: 20, dwarfPlanetCount: 6 },
};

const buildZeroScores = (games: Game[], rounds: Round[], teams: Team[]) => {
  const scores: Scores = {};
  games.forEach(g => {
    scores[g.id] = {};
    rounds.forEach(r => {
      scores[g.id][r.id] = {};
      teams.forEach(t => {
        scores[g.id][r.id][t.id] = 0;
      });
    });
  });
  return scores;
};

const LEADERBOARD_PATH = 'leaderboard';

function teamsFromFirebase(val: unknown): Team[] {
  if (!val || typeof val !== 'object') return defaultTeams;
  const entries = Array.isArray(val)
    ? val
        .map((item, index) => [String(index), item] as const)
        .filter(([, item]) => item && typeof item === 'object')
    : Object.entries(val as Record<string, unknown>);

  const list = entries.map(([id, v]) => {
    const team = v as Partial<Team>;
    return {
      id: typeof team.id === 'string' && team.id.length > 0 ? team.id : id,
      name: team.name ?? `Team ${id}`,
      icon: team.icon ?? 'shield',
      basePoints: team.basePoints,
      colorHint: team.colorHint,
      logo: team.logo,
      statusLabel: team.statusLabel,
    } as Team;
  });

  return list.length > 0 ? list : defaultTeams;
}

function gamesFromFirebase(val: unknown): Game[] {
  if (!val || typeof val !== 'object') return defaultGames;
  const entries = Array.isArray(val)
    ? val
        .map((item, index) => [String(index), item] as const)
        .filter(([, item]) => item && typeof item === 'object')
    : Object.entries(val as Record<string, unknown>);

  const list = entries.map(([id, v]) => {
    const game = v as Partial<Game>;
    return {
      id: typeof game.id === 'string' && game.id.length > 0 ? game.id : id,
      name: game.name ?? `Game ${id}`,
      icon: game.icon ?? 'gamepad-2',
      color: game.color ?? '#76B900',
    } as Game;
  });

  return list.length > 0 ? list : defaultGames;
}

function roundsFromFirebase(val: unknown): Round[] {
  if (!val || typeof val !== 'object') return defaultRounds;
  const entries = Array.isArray(val)
    ? val
        .map((item, index) => [String(index), item] as const)
        .filter(([, item]) => item && typeof item === 'object')
    : Object.entries(val as Record<string, unknown>);

  const list = entries.map(([id, v]) => {
    const round = v as Partial<Round>;
    return {
      id: typeof round.id === 'string' && round.id.length > 0 ? round.id : id,
      name: round.name ?? `Round ${id}`,
    } as Round;
  });

  return list.length > 0 ? list : defaultRounds;
}

function scoresFromFirebase(
  val: unknown,
  games: Game[],
  rounds: Round[],
  teams: Team[],
): Scores {
  const raw = val && typeof val === 'object' ? (val as Record<string, unknown>) : {};
  const normalized = buildZeroScores(games, rounds, teams);

  games.forEach((game) => {
    const gameScores = raw[game.id];
    if (!gameScores || typeof gameScores !== 'object') return;

    rounds.forEach((round) => {
      const roundScores = (gameScores as Record<string, unknown>)[round.id];
      if (!roundScores || typeof roundScores !== 'object') return;

      teams.forEach((team) => {
        const value = (roundScores as Record<string, unknown>)[team.id];
        const numeric = typeof value === 'number' ? value : Number(value);
        normalized[game.id][round.id][team.id] = Number.isFinite(numeric) ? numeric : 0;
      });
    });
  });

  return normalized;
}

function roundTeamsFromFirebase(
  val: unknown,
  rounds: Round[],
  teams: Team[],
): Record<string, string[]> {
  const fallback: Record<string, string[]> = {};
  rounds.forEach((round) => {
    fallback[round.id] = teams.map((team) => team.id);
  });

  if (!val || typeof val !== 'object') return fallback;

  const source = val as Record<string, unknown>;
  const teamIdSet = new Set(teams.map((team) => team.id));
  const normalized: Record<string, string[]> = {};

  rounds.forEach((round) => {
    const raw = source[round.id];
    if (!Array.isArray(raw)) {
      normalized[round.id] = fallback[round.id];
      return;
    }
    const validIds = raw
      .filter((id): id is string => typeof id === 'string' && teamIdSet.has(id));
    normalized[round.id] = validIds.length > 0 ? validIds : fallback[round.id];
  });

  return normalized;
}

function roundVisualizationFromFirebase(
  val: unknown,
  rounds: Round[],
): Record<string, RoundVisualizationSettings> {
  const source = val && typeof val === 'object' ? (val as Record<string, unknown>) : {};
  const normalized: Record<string, RoundVisualizationSettings> = {};

  rounds.forEach((round, index) => {
    const fallback =
      defaultRoundVisualization[round.id] ??
      (index === 0
        ? { visiblePlanetCount: 40, dwarfPlanetCount: 12 }
        : { visiblePlanetCount: 20, dwarfPlanetCount: 6 });
    const raw = source[round.id];
    const candidate = raw && typeof raw === 'object' ? (raw as Partial<RoundVisualizationSettings>) : {};
    const visiblePlanetCount = Number(candidate.visiblePlanetCount);
    const dwarfPlanetCount = Number(candidate.dwarfPlanetCount);

    normalized[round.id] = {
      visiblePlanetCount: Number.isFinite(visiblePlanetCount) ? Math.max(1, Math.round(visiblePlanetCount)) : fallback.visiblePlanetCount,
      dwarfPlanetCount: Number.isFinite(dwarfPlanetCount) ? Math.max(0, Math.round(dwarfPlanetCount)) : fallback.dwarfPlanetCount,
    };
  });

  return normalized;
}

const TournamentContext = createContext<TournamentContextType | null>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(!isFirebaseConfigured);
  const [teams, setTeams] = useState<Team[]>(defaultTeams);
  const [games, setGames] = useState<Game[]>(defaultGames);
  const [rounds, setRounds] = useState<Round[]>(defaultRounds);
  const [scores, setScores] = useState<Scores>(() =>
    buildZeroScores(defaultGames, defaultRounds, defaultTeams)
  );
  const [roundVisualization, setRoundVisualization] = useState<Record<string, RoundVisualizationSettings>>(
    () => defaultRoundVisualization,
  );
  const [roundTeams, setRoundTeams] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    defaultRounds.forEach(r => { initial[r.id] = defaultTeams.map(t => t.id); });
    return initial;
  });

  useEffect(() => {
    if (!db || !isFirebaseConfigured) {
      console.warn('[Tournament] Firebase not available — using local defaults');
      return;
    }

    console.log('[Tournament] Subscribing to Firebase path:', LEADERBOARD_PATH);
    const leaderboardRef = ref(db, LEADERBOARD_PATH);

    const unsubscribe = onValue(leaderboardRef, (snapshot) => {
      const data = snapshot.val();
      console.log('[Tournament] Firebase snapshot received. Has data:', !!data);

      if (!data) {
        console.log('[Tournament] No data in DB — seeding with zeros');
        const seed = {
          teams: Object.fromEntries(defaultTeams.map(t => [t.id, t])),
          games: Object.fromEntries(defaultGames.map(g => [g.id, g])),
          rounds: Object.fromEntries(defaultRounds.map(r => [r.id, r])),
          scores: buildZeroScores(defaultGames, defaultRounds, defaultTeams),
          roundVisualization: defaultRoundVisualization,
          roundTeams: Object.fromEntries(
            defaultRounds.map(r => [r.id, defaultTeams.map(t => t.id)])
          ),
        };
        update(ref(db, LEADERBOARD_PATH), seed);
        return;
      }

      const nextTeams = teamsFromFirebase(data.teams);
      const nextGames = gamesFromFirebase(data.games);
      const nextRounds = roundsFromFirebase(data.rounds);
      const nextRoundTeams = roundTeamsFromFirebase(data.roundTeams, nextRounds, nextTeams);
      const nextRoundVisualization = roundVisualizationFromFirebase(data.roundVisualization, nextRounds);
      const nextScores = scoresFromFirebase(data.scores, nextGames, nextRounds, nextTeams);

      console.log('[Tournament] Parsed scores sample (first game, first round):', 
        nextGames[0] && nextRounds[0] 
          ? nextScores[nextGames[0].id]?.[nextRounds[0].id] 
          : 'N/A'
      );

      setTeams(nextTeams);
      setGames(nextGames);
      setRounds(nextRounds);
      setRoundTeams(nextRoundTeams);
      setRoundVisualization(nextRoundVisualization);
      setScores(nextScores);
      setLoaded(true);
    }, (error) => {
      console.error('[Tournament] Firebase onValue error:', error);
      setLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const updateScore = useCallback((gameId: string, roundId: string, teamId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        [roundId]: {
          ...prev[gameId]?.[roundId],
          [teamId]: score,
        }
      }
    }));
    if (db) {
      update(ref(db, `${LEADERBOARD_PATH}/scores/${gameId}/${roundId}`), { [teamId]: score });
    }
  }, []);

  const getOverallScores = useCallback((roundId: string) => {
    const activeTeamIds = roundTeams[roundId] || [];
    const activeTeams = teams.filter(t => activeTeamIds.includes(t.id));

    return activeTeams.map(team => {
      let total = 0;
      const breakdown = games.map(game => {
        const score = scores[game.id]?.[roundId]?.[team.id] ?? 0;
        total += score;
        return { game, score };
      });
      return { team, total, breakdown };
    }).sort((a, b) => b.total - a.total);
  }, [teams, games, roundTeams, scores]);

  const getGameScores = useCallback((gameId: string, roundId: string) => {
    const activeTeamIds = roundTeams[roundId] || [];
    const activeTeams = teams.filter(t => activeTeamIds.includes(t.id));

    return activeTeams.map(team => ({
      team,
      score: scores[gameId]?.[roundId]?.[team.id] ?? 0
    })).sort((a, b) => b.score - a.score);
  }, [teams, roundTeams, scores]);

  const addTeamToRound = useCallback((roundId: string, teamData: Omit<Team, 'id'>) => {
    const newTeamId = `t${Date.now()}`;
    const newTeam = { id: newTeamId, ...teamData };

    setTeams(prev => [...prev, newTeam]);
    setScores(prev => {
      const next = { ...prev };
      Object.keys(next).forEach((gameId) => {
        next[gameId] = { ...next[gameId] };
        Object.keys(next[gameId] ?? {}).forEach((existingRoundId) => {
          next[gameId][existingRoundId] = {
            ...next[gameId][existingRoundId],
            [newTeamId]: 0,
          };
        });
      });
      if (db) {
        update(ref(db, `${LEADERBOARD_PATH}/scores`), next);
      }
      return next;
    });
    setRoundTeams(prev => {
      const next = { ...prev, [roundId]: [...(prev[roundId] || []), newTeamId] };
      if (db) {
        update(ref(db, `${LEADERBOARD_PATH}/teams/${newTeamId}`), newTeam);
        update(ref(db, `${LEADERBOARD_PATH}/roundTeams/${roundId}`), next[roundId]);
      }
      return next;
    });
  }, []);

  const removeTeamFromRound = useCallback((roundId: string, teamId: string) => {
    setRoundTeams(prev => {
      const next = { ...prev, [roundId]: (prev[roundId] || []).filter(id => id !== teamId) };
      if (db) {
        update(ref(db, `${LEADERBOARD_PATH}/roundTeams/${roundId}`), next[roundId]);
      }
      return next;
    });
  }, []);

  const updateTeam = useCallback((teamId: string, updates: Partial<Team>) => {
    setTeams(prev => {
      const next = prev.map(t => t.id === teamId ? { ...t, ...updates } : t);
      const team = next.find(t => t.id === teamId);
      if (db && team) {
        update(ref(db, `${LEADERBOARD_PATH}/teams/${teamId}`), updates);
      }
      return next;
    });
  }, []);

  const addGame = useCallback((gameData: Omit<Game, 'id'>) => {
    const newGameId = `g${Date.now()}`;
    const newGame = { id: newGameId, ...gameData };

    setGames((prev) => [...prev, newGame]);
    setScores((prev) => {
      const nextGameScores: Scores[string] = {};
      rounds.forEach((round) => {
        nextGameScores[round.id] = {};
        teams.forEach((team) => {
          nextGameScores[round.id][team.id] = 0;
        });
      });
      const next = {
        ...prev,
        [newGameId]: nextGameScores,
      };
      if (db) {
        update(ref(db, `${LEADERBOARD_PATH}/games/${newGameId}`), newGame);
        update(ref(db, `${LEADERBOARD_PATH}/scores/${newGameId}`), nextGameScores);
      }
      return next;
    });
  }, [rounds, teams]);

  const updateGame = useCallback((gameId: string, updates: Partial<Game>) => {
    setGames((prev) => {
      const next = prev.map((game) => (game.id === gameId ? { ...game, ...updates } : game));
      if (db) {
        update(ref(db, `${LEADERBOARD_PATH}/games/${gameId}`), updates);
      }
      return next;
    });
  }, []);

  const updateRoundVisualization = useCallback((roundId: string, updates: Partial<RoundVisualizationSettings>) => {
    setRoundVisualization((prev) => {
      const current = prev[roundId] ?? defaultRoundVisualization[roundId] ?? { visiblePlanetCount: 20, dwarfPlanetCount: 6 };
      const next = {
        ...prev,
        [roundId]: {
          visiblePlanetCount: Math.max(1, Math.round(updates.visiblePlanetCount ?? current.visiblePlanetCount)),
          dwarfPlanetCount: Math.max(0, Math.round(updates.dwarfPlanetCount ?? current.dwarfPlanetCount)),
        },
      };
      if (db) {
        update(ref(db, `${LEADERBOARD_PATH}/roundVisualization/${roundId}`), next[roundId]);
      }
      return next;
    });
  }, []);

  const value = {
    teams,
    games,
    rounds,
    scores,
    roundTeams,
    roundVisualization,
    updateScore,
    getOverallScores,
    getGameScores,
    addTeamToRound,
    removeTeamFromRound,
    updateTeam,
    addGame,
    updateGame,
    updateRoundVisualization,
  };

  if (!loaded) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#05070d', color: '#76B900',
        fontFamily: 'monospace', fontSize: 14,
      }}>
        Connecting to database…
      </div>
    );
  }

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
