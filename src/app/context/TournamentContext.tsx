import React, { createContext, useContext, useState, useMemo } from 'react';

export type Team = {
  id: string;
  name: string;
  icon: string;
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
  updateScore: (gameId: string, roundId: string, teamId: string, score: number) => void;
  getOverallScores: (roundId: string) => { team: Team; total: number; breakdown: { game: Game; score: number }[] }[];
  getGameScores: (gameId: string, roundId: string) => { team: Team; score: number }[];
}

const defaultTeams: Team[] = [
  { id: 't1', name: 'Team Alpha', icon: 'zap' },
  { id: 't2', name: 'Team Nova', icon: 'star' },
  { id: 't3', name: 'Team Titan', icon: 'shield' },
  { id: 't4', name: 'Team Velocity', icon: 'wind' },
  { id: 't5', name: 'Team Echo', icon: 'radio' },
  { id: 't6', name: 'Team Phantom', icon: 'eye-off' },
  { id: 't7', name: 'Team Omega', icon: 'infinity' },
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
  const [teams] = useState<Team[]>(defaultTeams);
  const [games] = useState<Game[]>(defaultGames);
  const [rounds] = useState<Round[]>(defaultRounds);
  const [scores, setScores] = useState<Scores>(generateInitialScores());

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
    return teams.map(team => {
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
    return teams.map(team => {
      return {
        team,
        score: scores[gameId][roundId][team.id] || 0
      };
    }).sort((a, b) => b.score - a.score);
  };

  const value = {
    teams,
    games,
    rounds,
    scores,
    updateScore,
    getOverallScores,
    getGameScores,
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
