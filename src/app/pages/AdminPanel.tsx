import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useTournament } from '../context/TournamentContext';
import { NeonButton, cn } from '../components/NeonButton';
import * as LucideIcons from 'lucide-react';
import { Save, RefreshCw, Settings, UserPlus, X, Edit2, Orbit, Gamepad2, Plus } from 'lucide-react';

const getIconComponent = (iconName: string, fallback: any) =>
  (LucideIcons as any)[
    iconName.charAt(0).toUpperCase() + iconName.slice(1).replace(/-./g, (x) => x[1].toUpperCase())
  ] ?? fallback;

export function AdminPanel() {
  const {
    games,
    rounds,
    teams,
    scores,
    updateScore,
    roundTeams,
    addTeamToRound,
    removeTeamFromRound,
    updateTeam,
    addGame,
    updateGame,
    roundVisualization,
    updateRoundVisualization,
  } = useTournament();

  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id ?? '');
  const [selectedGame, setSelectedGame] = useState(games[0]?.id ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [localScores, setLocalScores] = useState<Record<string, number>>({});
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamIcon, setNewTeamIcon] = useState('shield');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [newGameName, setNewGameName] = useState('');
  const [newGameColor, setNewGameColor] = useState('#6ca8ff');
  const [newGameIcon, setNewGameIcon] = useState('gamepad-2');
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [editingGameName, setEditingGameName] = useState('');

  useEffect(() => {
    if (!selectedRound && rounds[0]) {
      setSelectedRound(rounds[0].id);
    }
    if (!selectedGame && games[0]) {
      setSelectedGame(games[0].id);
    }
  }, [games, rounds, selectedGame, selectedRound]);

  const activeTeamIds = roundTeams[selectedRound] || [];
  const activeTeams = useMemo(() => teams.filter((team) => activeTeamIds.includes(team.id)), [activeTeamIds, teams]);
  const activeGame = games.find((game) => game.id === selectedGame) ?? games[0];
  const roundSceneSettings = roundVisualization[selectedRound] ?? { visiblePlanetCount: activeTeams.length || 1, dwarfPlanetCount: 0 };

  useEffect(() => {
    const initialLocal: Record<string, number> = {};
    activeTeams.forEach((team) => {
      initialLocal[team.id] = activeGame ? scores[activeGame.id]?.[selectedRound]?.[team.id] ?? 0 : 0;
    });
    setLocalScores(initialLocal);
  }, [activeGame, activeTeams, scores, selectedRound]);

  const handleScoreChange = (teamId: string, value: string) => {
    const num = parseInt(value, 10);
    setLocalScores((prev) => ({
      ...prev,
      [teamId]: Number.isNaN(num) ? 0 : num,
    }));
  };

  const resetLocalScores = () => {
    const reset: Record<string, number> = {};
    activeTeams.forEach((team) => {
      reset[team.id] = 0; // Set all input scores to 0
    });
    setLocalScores(reset);
  };

  const handleSave = () => {
    if (!activeGame) return;
    setIsSaving(true);
    setTimeout(() => {
      Object.entries(localScores).forEach(([teamId, score]) => {
        updateScore(activeGame.id, selectedRound, teamId, score);
      });
      setIsSaving(false);
      alert('Scores updated successfully');
    }, 300);
  };

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    addTeamToRound(selectedRound, { name: newTeamName.trim(), icon: newTeamIcon });
    setNewTeamName('');
  };

  const startEditingTeam = (teamId: string, name: string) => {
    setEditingTeamId(teamId);
    setEditingTeamName(name);
  };

  const saveEditingTeam = (teamId: string) => {
    if (editingTeamName.trim()) {
      updateTeam(teamId, { name: editingTeamName.trim() });
    }
    setEditingTeamId(null);
    setEditingTeamName('');
  };

  const handleAddGame = () => {
    if (!newGameName.trim()) return;
    addGame({
      name: newGameName.trim(),
      color: newGameColor,
      icon: newGameIcon,
    });
    setNewGameName('');
    setNewGameColor('#6ca8ff');
    setNewGameIcon('gamepad-2');
  };

  const startEditingGame = (gameId: string, name: string) => {
    setEditingGameId(gameId);
    setEditingGameName(name);
  };

  const saveEditingGame = (gameId: string) => {
    if (editingGameName.trim()) {
      updateGame(gameId, { name: editingGameName.trim() });
    }
    setEditingGameId(null);
    setEditingGameName('');
  };

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="mx-auto mt-20 flex max-w-md flex-col items-center gap-6 rounded-xl border border-[#333333] bg-[#111111] p-8 text-center text-white shadow-[0_0_30px_rgba(0,0,0,0.5)]"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#333333] bg-[#222222] text-[#76B900] shadow-[0_0_15px_rgba(118,185,0,0.2)]">
          <Settings size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold uppercase tracking-widest text-[#76B900]">Admin Access</h2>
          <p className="mt-2 font-mono text-xs text-[#A1A1AA]">RESTRICTED AREA</p>
        </div>
        <form
          className="flex w-full flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (passwordInput === 'fastathon1.02026') {
              setIsAuthenticated(true);
            } else {
              alert('Access Denied');
              setPasswordInput('');
            }
          }}
        >
          <input
            type="password"
            placeholder="Enter authorization code"
            className="w-full rounded-lg border border-[#333333] bg-[#000000] p-3 text-center tracking-widest text-white transition-colors focus:border-[#76B900] focus:outline-none"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <NeonButton variant="primary" type="submit" className="w-full justify-center">
            Authenticate
          </NeonButton>
        </form>
      </motion.div>
    );
  }

  const ActiveGameIcon = activeGame ? getIconComponent(activeGame.icon, Gamepad2) : Gamepad2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-6xl space-y-8"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-4xl font-display font-bold uppercase tracking-widest text-[#76B900] drop-shadow-[0_0_8px_rgba(118,185,0,0.6)]">
            Solar System Admin
          </h2>
          <p className="mt-2 font-mono text-sm text-[#A1A1AA]">Scores, planet counts, dwarf planets, and game catalog</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-[#333333] bg-[#111111] p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#A1A1AA]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#76B900]" />
                Select Round
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {rounds.map((round) => (
                  <button
                    key={round.id}
                    onClick={() => setSelectedRound(round.id)}
                    className={cn(
                      'rounded-lg border px-4 py-2 text-sm font-display uppercase tracking-widest transition-all duration-300',
                      selectedRound === round.id
                        ? 'border-[#76B900]/50 bg-[#76B900]/10 text-[#76B900] shadow-[0_0_10px_rgba(118,185,0,0.4)]'
                        : 'border-[#333333] bg-[#000000] text-[#A1A1AA] hover:border-[#A1A1AA]',
                    )}
                  >
                    {round.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#333333] bg-[#111111] p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#A1A1AA]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#76B900]" />
                Select Game
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {games.map((game) => {
                  const Icon = getIconComponent(game.icon, Gamepad2);
                  const isSelected = selectedGame === game.id;
                  return (
                    <button
                      key={game.id}
                      onClick={() => setSelectedGame(game.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-display uppercase tracking-widest transition-all duration-300',
                        isSelected ? 'text-white' : 'border-[#333333] bg-[#000000] text-[#A1A1AA] hover:border-[#A1A1AA]',
                      )}
                      style={isSelected ? { color: game.color, borderColor: game.color, boxShadow: `0 0 10px ${game.color}66`, backgroundColor: `${game.color}1a` } : {}}
                    >
                      <Icon size={14} />
                      {game.name}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-[#333333] bg-[#111111] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-[#333333] bg-black/40 p-4">
              <div className="flex items-center gap-3">
                <ActiveGameIcon size={24} color={activeGame?.color} />
                <h3 className="text-xl font-display font-bold uppercase tracking-widest" style={{ color: activeGame?.color }}>
                  {activeGame?.name ?? 'Game'} Scores
                </h3>
              </div>
            </div>

            <div className="space-y-4 p-6">
              {activeTeams.length === 0 ? (
                <div className="py-8 text-center text-[#A1A1AA]">No teams in this round yet.</div>
              ) : (
                activeTeams.map((team, index) => {
                  const TeamIcon = getIconComponent(team.icon, UserPlus);
                  return (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center justify-between rounded-lg border border-[#333333] bg-[#000000] p-3 transition-all duration-300 focus-within:border-[#76B900] focus-within:shadow-[0_0_15px_rgba(118,185,0,0.3)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#222222] text-white">
                          <TeamIcon size={18} />
                        </div>
                        <span className="max-w-[170px] truncate font-bold uppercase tracking-wider text-white">{team.name}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={localScores[team.id] ?? 0}
                        onChange={(e) => handleScoreChange(team.id, e.target.value)}
                        className="w-32 bg-transparent text-right font-display text-2xl font-bold text-[#76B900] outline-none"
                      />
                    </motion.div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-4 border-t border-[#333333] bg-black/40 p-6">
              <NeonButton variant="secondary" onClick={resetLocalScores}>
                <RefreshCw size={18} className="mr-2 inline" />
                Reset
              </NeonButton>
              <NeonButton variant="primary" onClick={handleSave} disabled={isSaving || activeTeams.length === 0 || !activeGame}>
                {isSaving ? <RefreshCw size={18} className="mr-2 inline animate-spin" /> : <Save size={18} className="mr-2 inline" />}
                {isSaving ? 'Updating...' : 'Save Scores'}
              </NeonButton>
            </div>
          </section>

          <section className="rounded-xl border border-[#333333] bg-[#111111] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3 border-b border-[#333333] bg-black/40 p-4">
              <Orbit size={24} className="text-[#9cc7ff]" />
              <h3 className="text-xl font-display font-bold uppercase tracking-widest text-[#9cc7ff]">
                Solar System Controls
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs tracking-[0.2em] text-[#A1A1AA]">Visible Planets</label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(activeTeams.length, 1)}
                  value={roundSceneSettings.visiblePlanetCount}
                  onChange={(e) =>
                    updateRoundVisualization(selectedRound, {
                      visiblePlanetCount: Math.min(Math.max(parseInt(e.target.value || '1', 10), 1), Math.max(activeTeams.length, 1)),
                    })
                  }
                  className="w-full rounded-lg border border-[#333333] bg-[#000000] px-4 py-3 text-white outline-none transition-colors focus:border-[#9cc7ff]"
                />
                <p className="text-xs text-[#A1A1AA]">Top-ranked teams shown as planets for this round.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs tracking-[0.2em] text-[#A1A1AA]">Dwarf Planets</label>
                <input
                  type="number"
                  min="0"
                  max={Math.max(roundSceneSettings.visiblePlanetCount - 1, 0)}
                  value={roundSceneSettings.dwarfPlanetCount}
                  onChange={(e) =>
                    updateRoundVisualization(selectedRound, {
                      dwarfPlanetCount: Math.min(
                        Math.max(parseInt(e.target.value || '0', 10), 0),
                        Math.max(roundSceneSettings.visiblePlanetCount - 1, 0),
                      ),
                    })
                  }
                  className="w-full rounded-lg border border-[#333333] bg-[#000000] px-4 py-3 text-white outline-none transition-colors focus:border-[#9cc7ff]"
                />
                <p className="text-xs text-[#A1A1AA]">Smallest trailing bodies rendered as dwarf planets.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-[#333333] bg-[#111111] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3 border-b border-[#333333] bg-black/40 p-4">
              <UserPlus size={24} className="text-[#00F0FF]" />
              <h3 className="text-xl font-display font-bold uppercase tracking-widest text-[#00F0FF]">Manage Teams</h3>
            </div>
            <div className="space-y-3 p-6">
              {activeTeams.map((team) => {
                const TeamIcon = getIconComponent(team.icon, UserPlus);
                return (
                  <div key={team.id} className="flex items-center justify-between rounded-lg border border-[#333333] bg-[#000000] p-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#222222] text-[#A1A1AA]">
                        <TeamIcon size={16} />
                      </div>
                      {editingTeamId === team.id ? (
                        <input
                          type="text"
                          value={editingTeamName}
                          onChange={(e) => setEditingTeamName(e.target.value)}
                          onBlur={() => saveEditingTeam(team.id)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditingTeam(team.id)}
                          className="w-full rounded border border-[#76B900] bg-[#222222] px-2 py-1 text-white outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="truncate text-sm font-bold uppercase tracking-wider text-white">{team.name}</span>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => startEditingTeam(team.id, team.name)}
                        className="rounded-lg bg-[#222222] p-2 text-[#A1A1AA] transition-colors hover:bg-[#333333] hover:text-white"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => removeTeamFromRound(selectedRound, team.id)}
                        className="rounded-lg bg-[#222222] p-2 text-[#A1A1AA] transition-colors hover:bg-red-500/20 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 border-t border-[#333333] bg-black/40 p-6">
              <input
                type="text"
                placeholder="New team name..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
                className="flex-grow rounded-lg border border-[#333333] bg-[#000000] px-4 py-2 text-white transition-colors focus:border-[#00F0FF] focus:outline-none"
              />
              <NeonButton variant="primary" onClick={handleAddTeam} className="border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/10 shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)]">
                Add
              </NeonButton>
            </div>
          </section>

          <section className="rounded-xl border border-[#333333] bg-[#111111] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3 border-b border-[#333333] bg-black/40 p-4">
              <Gamepad2 size={24} className="text-[#ffcb7a]" />
              <h3 className="text-xl font-display font-bold uppercase tracking-widest text-[#ffcb7a]">Manage Games</h3>
            </div>
            <div className="space-y-3 p-6">
              {games.map((game) => {
                const Icon = getIconComponent(game.icon, Gamepad2);
                return (
                  <div key={game.id} className="rounded-lg border border-[#333333] bg-[#000000] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: `${game.color}22`, color: game.color }}>
                          <Icon size={16} />
                        </div>
                        {editingGameId === game.id ? (
                          <input
                            type="text"
                            value={editingGameName}
                            onChange={(e) => setEditingGameName(e.target.value)}
                            onBlur={() => saveEditingGame(game.id)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditingGame(game.id)}
                            className="w-full rounded border border-[#ffcb7a] bg-[#222222] px-2 py-1 text-white outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="truncate text-sm font-bold uppercase tracking-wider text-white">{game.name}</span>
                        )}
                      </div>
                      <button
                        onClick={() => startEditingGame(game.id, game.name)}
                        className="rounded-lg bg-[#222222] p-2 text-[#A1A1AA] transition-colors hover:bg-[#333333] hover:text-white"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="color"
                        value={game.color}
                        onChange={(e) => updateGame(game.id, { color: e.target.value })}
                        className="h-10 w-14 rounded border border-[#333333] bg-transparent"
                      />
                      <input
                        type="text"
                        value={game.icon}
                        onChange={(e) => updateGame(game.id, { icon: e.target.value })}
                        className="min-w-0 flex-1 rounded-lg border border-[#333333] bg-[#111111] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#ffcb7a]"
                        placeholder="lucide icon"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-3 border-t border-[#333333] bg-black/40 p-6">
              <input
                type="text"
                placeholder="New game name..."
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                className="w-full rounded-lg border border-[#333333] bg-[#000000] px-4 py-2 text-white transition-colors focus:border-[#ffcb7a] focus:outline-none"
              />
              <div className="flex gap-3">
                <input
                  type="color"
                  value={newGameColor}
                  onChange={(e) => setNewGameColor(e.target.value)}
                  className="h-11 w-16 rounded border border-[#333333] bg-transparent"
                />
                <input
                  type="text"
                  value={newGameIcon}
                  onChange={(e) => setNewGameIcon(e.target.value)}
                  className="flex-1 rounded-lg border border-[#333333] bg-[#000000] px-4 py-2 text-white transition-colors focus:border-[#ffcb7a] focus:outline-none"
                  placeholder="lucide icon"
                />
                <NeonButton variant="primary" onClick={handleAddGame} className="justify-center border-[#ffcb7a] text-[#ffcb7a] hover:bg-[#ffcb7a]/10">
                  <Plus size={16} className="mr-1 inline" />
                  Add
                </NeonButton>
              </div>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
