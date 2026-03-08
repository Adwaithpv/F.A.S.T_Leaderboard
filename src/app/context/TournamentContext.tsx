import React, { createContext, useContext, useState, useMemo } from 'react';

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
  updateScore: (gameId: string, roundId: string, teamId: string, score: number) => void;
  getOverallScores: (roundId: string) => { team: Team; total: number; breakdown: { game: Game; score: number }[] }[];
  getGameScores: (gameId: string, roundId: string) => { team: Team; score: number }[];
  addTeamToRound: (roundId: string, team: Omit<Team, 'id'>) => void;
  removeTeamFromRound: (roundId: string, teamId: string) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
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

const generateInitialScores = () => {
  const scores: Scores = {};
  defaultGames.forEach(g => {
    scores[g.id] = {};
    defaultRounds.forEach(r => {
      scores[g.id][r.id] = {};
      defaultTeams.forEach(t => {
        // Generate random initial scores between 100 and 1000
        scores[g.id][r.id][t.id] = Math.floor(Math.random() * 900) + 100;
      });
    });
  });
  return scores;
};

const TournamentContext = createContext<TournamentContextType | null>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(defaultTeams);
  const [games] = useState<Game[]>(defaultGames);
  const [rounds] = useState<Round[]>(defaultRounds);
  const [scores, setScores] = useState<Scores>(generateInitialScores());

  // Default to all default teams being in all rounds
  const [roundTeams, setRoundTeams] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    defaultRounds.forEach(r => {
      initial[r.id] = defaultTeams.map(t => t.id);
    });
    return initial;
  });

  const updateScore = (gameId: string, roundId: string, teamId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [gameId]: {
        ...prev[gameId],
        [roundId]: {
          ...prev[gameId][roundId],
          [teamId]: score,
        }
      }
    }));
  };

  const getOverallScores = (roundId: string) => {
    const activeTeamIds = roundTeams[roundId] || [];
    const activeTeams = teams.filter(t => activeTeamIds.includes(t.id));

    return activeTeams.map(team => {
      let total = 0;
      const breakdown = games.map(game => {
        const score = scores[game.id][roundId][team.id] || 0;
        total += score;
        return { game, score };
      });
      return { team, total, breakdown };
    }).sort((a, b) => b.total - a.total);
  };

  const getGameScores = (gameId: string, roundId: string) => {
    const activeTeamIds = roundTeams[roundId] || [];
    const activeTeams = teams.filter(t => activeTeamIds.includes(t.id));

    return activeTeams.map(team => {
      return {
        team,
        score: scores[gameId][roundId][team.id] || 0
      };
    }).sort((a, b) => b.score - a.score);
  };

  const addTeamToRound = (roundId: string, teamData: Omit<Team, 'id'>) => {
    const newTeamId = `t${Date.now()}`;
    const newTeam = { id: newTeamId, ...teamData };

    setTeams(prev => [...prev, newTeam]);
    setRoundTeams(prev => ({
      ...prev,
      [roundId]: [...(prev[roundId] || []), newTeamId]
    }));
  };

  const removeTeamFromRound = (roundId: string, teamId: string) => {
    setRoundTeams(prev => ({
      ...prev,
      [roundId]: (prev[roundId] || []).filter(id => id !== teamId)
    }));
  };

  const updateTeam = (teamId: string, updates: Partial<Team>) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, ...updates } : t));
  };

  const value = {
    teams,
    games,
    rounds,
    scores,
    roundTeams,
    updateScore,
    getOverallScores,
    getGameScores,
    addTeamToRound,
    removeTeamFromRound,
    updateTeam,
  };

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
