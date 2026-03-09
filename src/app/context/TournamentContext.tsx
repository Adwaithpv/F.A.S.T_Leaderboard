import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, set, onValue, get } from 'firebase/database';
import { db } from '../../imports/firebase';

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
  roundTeams: Record<string, string[]>;
  loading: boolean;
  updateScore: (gameId: string, roundId: string, teamId: string, score: number) => void;
  getOverallScores: (roundId: string) => { team: Team; total: number; breakdown: { game: Game; score: number }[] }[];
  getGameScores: (gameId: string, roundId: string) => { team: Team; score: number }[];
  addTeamToRound: (roundId: string, team: Omit<Team, 'id'>) => void;
  removeTeamFromRound: (roundId: string, teamId: string) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
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

const generateInitialScores = (): Scores => {
  const scores: Scores = {};
  defaultGames.forEach(g => {
    scores[g.id] = {};
    defaultRounds.forEach(r => {
      scores[g.id][r.id] = {};
      defaultTeams.forEach(t => {
        scores[g.id][r.id][t.id] = 0;
      });
    });
  });
  return scores;
};

const generateInitialRoundTeams = (): Record<string, string[]> => {
  const rt: Record<string, string[]> = {};
  defaultRounds.forEach(r => {
    rt[r.id] = defaultTeams.map(t => t.id);
  });
  return rt;
};

const TournamentContext = createContext<TournamentContextType | null>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(defaultTeams);
  const [games] = useState<Game[]>(defaultGames);
  const [rounds] = useState<Round[]>(defaultRounds);
  const [scores, setScores] = useState<Scores>(generateInitialScores());
  const [roundTeams, setRoundTeams] = useState<Record<string, string[]>>(generateInitialRoundTeams());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const scoresRef = ref(db, 'scores');
    const teamsRef = ref(db, 'teams');
    const roundTeamsRef = ref(db, 'roundTeams');

    // Initialize Firebase with default data if empty
    get(scoresRef).then(snapshot => {
      if (!snapshot.exists()) {
        set(scoresRef, generateInitialScores());
        set(teamsRef, defaultTeams);
        set(roundTeamsRef, generateInitialRoundTeams());
      }
    });

    // Real-time listeners
    const unsubscribeScores = onValue(scoresRef, (snapshot) => {
      if (snapshot.exists()) setScores(snapshot.val());
      setLoading(false);
    });

    const unsubscribeTeams = onValue(teamsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTeams(Array.isArray(data) ? data : Object.values(data));
      }
    });

    const unsubscribeRoundTeams = onValue(roundTeamsRef, (snapshot) => {
      if (snapshot.exists()) setRoundTeams(snapshot.val());
    });

    return () => {
      unsubscribeScores();
      unsubscribeTeams();
      unsubscribeRoundTeams();
    };
  }, []);

  const updateScore = (gameId: string, roundId: string, teamId: string, score: number) => {
    set(ref(db, `scores/${gameId}/${roundId}/${teamId}`), score);
  };

  const getOverallScores = (roundId: string) => {
    const activeTeamIds = roundTeams[roundId] || [];
    const activeTeams = teams.filter(t => activeTeamIds.includes(t.id));
    return activeTeams.map(team => {
      let total = 0;
      const breakdown = games.map(game => {
        const score = scores[game.id]?.[roundId]?.[team.id] || 0;
        total += score;
        return { game, score };
      });
      return { team, total, breakdown };
    }).sort((a, b) => b.total - a.total);
  };

  const getGameScores = (gameId: string, roundId: string) => {
    const activeTeamIds = roundTeams[roundId] || [];
    const activeTeams = teams.filter(t => activeTeamIds.includes(t.id));
    return activeTeams.map(team => ({
      team,
      score: scores[gameId]?.[roundId]?.[team.id] || 0
    })).sort((a, b) => b.score - a.score);
  };

  const addTeamToRound = (roundId: string, teamData: Omit<Team, 'id'>) => {
    const newTeamId = `t${Date.now()}`;
    const newTeam = { id: newTeamId, ...teamData };
    const updatedTeams = [...teams, newTeam];
    const updatedRoundTeams = {
      ...roundTeams,
      [roundId]: [...(roundTeams[roundId] || []), newTeamId]
    };
    set(ref(db, 'teams'), updatedTeams);
    set(ref(db, 'roundTeams'), updatedRoundTeams);
  };

  const removeTeamFromRound = (roundId: string, teamId: string) => {
    const updatedRoundTeams = {
      ...roundTeams,
      [roundId]: (roundTeams[roundId] || []).filter(id => id !== teamId)
    };
    set(ref(db, 'roundTeams'), updatedRoundTeams);
  };

  const updateTeam = (teamId: string, updates: Partial<Team>) => {
    const updatedTeams = teams.map(t => t.id === teamId ? { ...t, ...updates } : t);
    set(ref(db, 'teams'), updatedTeams);
  };

  return (
    <TournamentContext.Provider value={{
      teams, games, rounds, scores, roundTeams, loading,
      updateScore, getOverallScores, getGameScores,
      addTeamToRound, removeTeamFromRound, updateTeam
    }}>
      {loading ? (
        <div style={{
          minHeight: '100vh',
          background: '#080c1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#76B900',
          fontFamily: 'monospace',
          fontSize: '18px',
          letterSpacing: '3px'
        }}>
          LOADING FASTATHON...
        </div>
      ) : children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) throw new Error('useTournament must be used within a TournamentProvider');
  return context;
}
