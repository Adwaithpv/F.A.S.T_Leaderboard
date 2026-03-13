import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTournament } from '../context/TournamentContext';
import { NeonButton } from '../components/NeonButton';
import { cn } from '../components/NeonButton';
import * as LucideIcons from 'lucide-react';
import { Save, RefreshCw, Settings, UserPlus, X, Edit2 } from 'lucide-react';

export function AdminPanel() {
  const { games, rounds, teams, scores, updateScore, roundTeams, addTeamToRound, removeTeamFromRound, updateTeam } = useTournament();
  
  const [selectedRound, setSelectedRound] = useState(rounds[0].id);
  const [selectedGame, setSelectedGame] = useState(games[0].id);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  
  const [localScores, setLocalScores] = useState<Record<string, number>>({});
  
  // Team Management State
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamIcon, setNewTeamIcon] = useState("shield");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");

  // Initialize local scores when round/game changes
  React.useEffect(() => {
    const initialLocal: Record<string, number> = {};
    const activeTeamIds = roundTeams[selectedRound] || [];
    const activeTeams = teams.filter(t => activeTeamIds.includes(t.id));
    
    activeTeams.forEach(t => {
      initialLocal[t.id] = scores[selectedGame]?.[selectedRound]?.[t.id] ?? 0;
    });
    setLocalScores(initialLocal);
  }, [selectedGame, selectedRound, scores, teams, roundTeams]);

  const handleScoreChange = (teamId: string, value: string) => {
    const num = parseInt(value, 10);
    setLocalScores(prev => ({
      ...prev,
      [teamId]: isNaN(num) ? 0 : num
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      Object.entries(localScores).forEach(([teamId, score]) => {
        updateScore(selectedGame, selectedRound, teamId, score);
      });
      setIsSaving(false);
      // Simulate toast
      alert('Scores updated successfully');
    }, 800);
  };

  const activeGame = games.find(g => g.id === selectedGame)!;
  const GameIcon = (LucideIcons as any)[activeGame.icon.charAt(0).toUpperCase() + activeGame.icon.slice(1).replace(/-./g, x=>x[1].toUpperCase())] || LucideIcons.Gamepad2;

  const activeTeamIds = roundTeams[selectedRound] || [];
  const activeTeams = teams.filter(t => activeTeamIds.includes(t.id));

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    addTeamToRound(selectedRound, { name: newTeamName, icon: newTeamIcon });
    setNewTeamName("");
  };

  const startEditingTeam = (team: any) => {
    setEditingTeamId(team.id);
    setEditingTeamName(team.name);
  };

  const saveEditingTeam = (teamId: string) => {
    if (editingTeamName.trim()) {
      updateTeam(teamId, { name: editingTeamName });
    }
    setEditingTeamId(null);
  };

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-md mx-auto mt-20 p-8 bg-[#111111] border border-[#333333] rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6 text-center text-white"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#222222] border border-[#333333] shadow-[0_0_15px_rgba(118,185,0,0.2)] text-[#76B900]">
          <Settings size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold uppercase tracking-widest text-[#76B900]">Admin Access</h2>
          <p className="text-[#A1A1AA] mt-2 font-mono text-xs">RESTRICTED AREA</p>
        </div>
        <form 
          className="w-full flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (passwordInput === "admin123") {
              setIsAuthenticated(true);
            } else {
              alert("Access Denied");
              setPasswordInput("");
            }
          }}
        >
          <input 
            type="password" 
            placeholder="Enter authorization code"
            className="w-full bg-[#000000] border border-[#333333] rounded-lg p-3 text-center text-white tracking-widest focus:outline-none focus:border-[#76B900] transition-colors"
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-display font-bold text-white tracking-widest uppercase drop-shadow-[0_0_8px_rgba(118,185,0,0.6)] text-[#76B900]">
            Control Center
          </h2>
          <p className="text-[#A1A1AA] mt-2 font-mono text-sm">SECURE SCORE ENTRY PORTAL</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Round Selection */}
        <div className="bg-[#111111] border border-[#333333] p-6 rounded-xl space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <h3 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#76B900] animate-pulse" />
            Select Round
          </h3>
          <div className="flex flex-wrap gap-2">
            {rounds.map(round => (
              <button
                key={round.id}
                onClick={() => setSelectedRound(round.id)}
                className={cn(
                  "px-4 py-2 text-sm font-display uppercase tracking-widest rounded-lg transition-all duration-300 border",
                  selectedRound === round.id 
                    ? "bg-[#76B900]/10 text-[#76B900] border-[#76B900]/50 shadow-[0_0_10px_rgba(118,185,0,0.4)]" 
                    : "bg-[#000000] text-[#A1A1AA] border-[#333333] hover:border-[#A1A1AA]"
                )}
              >
                {round.name}
              </button>
            ))}
          </div>
        </div>

        {/* Game Selection */}
        <div className="bg-[#111111] border border-[#333333] p-6 rounded-xl space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <h3 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#76B900] animate-pulse" />
            Select Game
          </h3>
          <div className="flex flex-wrap gap-2">
            {games.map(game => {
              const Icon = (LucideIcons as any)[game.icon.charAt(0).toUpperCase() + game.icon.slice(1).replace(/-./g, x=>x[1].toUpperCase())] || LucideIcons.Gamepad2;
              const isSelected = selectedGame === game.id;
              return (
                <button
                  key={game.id}
                  onClick={() => setSelectedGame(game.id)}
                  className={cn(
                    "px-4 py-2 text-sm font-display uppercase tracking-widest rounded-lg transition-all duration-300 border flex items-center gap-2",
                    isSelected
                      ? `bg-[${game.color}]/10 text-[${game.color}] border-[${game.color}]/50 shadow-[0_0_10px_${game.color}80]`
                      : "bg-[#000000] text-[#A1A1AA] border-[#333333] hover:border-[#A1A1AA]"
                  )}
                  style={isSelected ? { color: game.color, borderColor: game.color, boxShadow: `0 0 10px ${game.color}80`, backgroundColor: `${game.color}20` } : {}}
                >
                  <Icon size={14} />
                  {game.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Score Entry Table */}
        <motion.div 
          key={`score-${selectedRound}-${selectedGame}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-[#111111] border border-[#333333] rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col"
        >
          <div className="p-4 border-b border-[#333333] bg-black/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GameIcon size={24} color={activeGame.color} className="animate-pulse" />
              <h3 className="text-xl font-display font-bold uppercase tracking-widest" style={{ color: activeGame.color }}>
                {activeGame.name} Scores
              </h3>
            </div>
          </div>

          <div className="p-6 space-y-4 flex-grow">
            {activeTeams.length === 0 ? (
              <div className="text-center py-8 text-[#A1A1AA]">No teams in this round yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {activeTeams.map((team, index) => {
                  const TeamIcon = (LucideIcons as any)[team.icon.charAt(0).toUpperCase() + team.icon.slice(1).replace(/-./g, x=>x[1].toUpperCase())] || LucideIcons.Shield;
                  return (
                      <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={team.id} 
                      className="flex items-center justify-between bg-[#000000] border border-[#333333] p-3 rounded-lg focus-within:border-[#76B900] focus-within:shadow-[0_0_15px_rgba(118,185,0,0.3)] transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#222222] text-white">
                          <TeamIcon size={20} />
                        </div>
                        <span className="font-bold text-white uppercase tracking-wider truncate max-w-[150px]">{team.name}</span>
                      </div>
                      
                      <div className="relative w-32">
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          value={localScores[team.id] ?? 0}
                          onChange={(e) => handleScoreChange(team.id, e.target.value)}
                          className="w-full bg-transparent border-none text-right text-2xl font-display font-bold tabular-nums text-[#76B900] focus:outline-none focus:ring-0"
                        />
                        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#76B900]/50 to-transparent opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-[#333333] bg-black/40 flex justify-end gap-4 mt-auto">
            <NeonButton variant="secondary" onClick={() => setLocalScores(localScores)}>
              <RefreshCw size={18} className="mr-2 inline" />
              Reset
            </NeonButton>
            <NeonButton variant="primary" onClick={handleSave} disabled={isSaving || activeTeams.length === 0}>
              {isSaving ? (
                <RefreshCw size={18} className="mr-2 inline animate-spin" />
              ) : (
                <Save size={18} className="mr-2 inline" />
              )}
              {isSaving ? 'Updating...' : 'Save Scores'}
            </NeonButton>
          </div>
        </motion.div>

        {/* Team Management */}
        <motion.div 
          key={`team-${selectedRound}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-[#111111] border border-[#333333] rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col"
        >
          <div className="p-4 border-b border-[#333333] bg-black/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus size={24} className="text-[#00F0FF]" />
              <h3 className="text-xl font-display font-bold uppercase tracking-widest text-[#00F0FF]">
                Manage Teams
              </h3>
            </div>
            <span className="text-xs text-[#A1A1AA] font-mono">{rounds.find(r => r.id === selectedRound)?.name}</span>
          </div>

          <div className="p-6 space-y-4 flex-grow">
            <div className="space-y-3">
              {activeTeams.map((team, index) => {
                const TeamIcon = (LucideIcons as any)[team.icon.charAt(0).toUpperCase() + team.icon.slice(1).replace(/-./g, x=>x[1].toUpperCase())] || LucideIcons.Shield;
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={team.id}
                    className="flex items-center justify-between bg-[#000000] border border-[#333333] p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-grow">
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
                          className="bg-[#222222] text-white px-2 py-1 rounded w-full border border-[#76B900] outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="font-bold text-white uppercase tracking-wider text-sm truncate">{team.name}</span>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button 
                        onClick={() => startEditingTeam(team)}
                        className="p-2 text-[#A1A1AA] hover:text-white bg-[#222222] hover:bg-[#333333] rounded-lg transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => removeTeamFromRound(selectedRound, team.id)}
                        className="p-2 text-[#A1A1AA] hover:text-red-500 bg-[#222222] hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div className="p-6 border-t border-[#333333] bg-black/40">
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="New team name..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
                className="flex-grow bg-[#000000] border border-[#333333] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#00F0FF] transition-colors"
              />
              <NeonButton variant="primary" onClick={handleAddTeam} className="border-[#00F0FF] text-[#00F0FF] hover:bg-[#00F0FF]/10 shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)]">
                Add
              </NeonButton>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
