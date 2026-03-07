import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTournament } from '../context/TournamentContext';
import { NeonButton } from '../components/NeonButton';
import { cn } from '../components/NeonButton';
import * as LucideIcons from 'lucide-react';
import { Save, RefreshCw } from 'lucide-react';

export function AdminPanel() {
  const { games, rounds, teams, scores, updateScore } = useTournament();
  
  const [selectedRound, setSelectedRound] = useState(rounds[0].id);
  const [selectedGame, setSelectedGame] = useState(games[0].id);
  const [isSaving, setIsSaving] = useState(false);
  
  const [localScores, setLocalScores] = useState<Record<string, number>>({});

  // Initialize local scores when round/game changes
  React.useEffect(() => {
    const initialLocal: Record<string, number> = {};
    teams.forEach(t => {
      initialLocal[t.id] = scores[selectedGame][selectedRound][t.id] || 0;
    });
    setLocalScores(initialLocal);
  }, [selectedGame, selectedRound, scores, teams]);

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
          <h2 className="text-4xl font-display font-bold text-white tracking-widest uppercase text-shadow-[0_0_15px_rgba(255,0,255,0.6)] text-[#FF00FF]">
            Control Center
          </h2>
          <p className="text-[#9CA3AF] mt-2 font-mono text-sm">SECURE SCORE ENTRY PORTAL</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Round Selection */}
        <div className="bg-[#141A29] border border-[#1F2937] p-6 rounded-xl space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <h3 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
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
                    ? "bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/50 shadow-[0_0_10px_rgba(0,240,255,0.4)]" 
                    : "bg-[#0B0F1A] text-[#9CA3AF] border-[#2D3748] hover:border-[#9CA3AF]"
                )}
              >
                {round.name}
              </button>
            ))}
          </div>
        </div>

        {/* Game Selection */}
        <div className="bg-[#141A29] border border-[#1F2937] p-6 rounded-xl space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <h3 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF00FF] animate-pulse" />
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
                      : "bg-[#0B0F1A] text-[#9CA3AF] border-[#2D3748] hover:border-[#9CA3AF]"
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

      {/* Score Entry Table */}
      <motion.div 
        key={`${selectedRound}-${selectedGame}`}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-[#141A29] border border-[#1F2937] rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]"
      >
        <div className="p-4 border-b border-[#1F2937] bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GameIcon size={24} color={activeGame.color} className="animate-pulse" />
            <h3 className="text-xl font-display font-bold uppercase tracking-widest" style={{ color: activeGame.color }}>
              {activeGame.name} - {rounds.find(r => r.id === selectedRound)?.name}
            </h3>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team, index) => {
              const TeamIcon = (LucideIcons as any)[team.icon.charAt(0).toUpperCase() + team.icon.slice(1).replace(/-./g, x=>x[1].toUpperCase())] || LucideIcons.Shield;
              return (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={team.id} 
                  className="flex items-center justify-between bg-[#0B0F1A] border border-[#2D3748] p-3 rounded-lg focus-within:border-[#00F0FF] focus-within:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1F2937] text-white">
                      <TeamIcon size={20} />
                    </div>
                    <span className="font-bold text-white uppercase tracking-wider">{team.name}</span>
                  </div>
                  
                  <div className="relative w-32">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={localScores[team.id] ?? 0}
                      onChange={(e) => handleScoreChange(team.id, e.target.value)}
                      className="w-full bg-transparent border-none text-right text-2xl font-display font-bold tabular-nums text-[#00F0FF] focus:outline-none focus:ring-0"
                    />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00F0FF]/50 to-transparent opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="p-6 border-t border-[#1F2937] bg-black/40 flex justify-end gap-4">
          <NeonButton variant="secondary" onClick={() => setLocalScores(localScores)}>
            <RefreshCw size={18} className="mr-2 inline" />
            Reset
          </NeonButton>
          <NeonButton variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <RefreshCw size={18} className="mr-2 inline animate-spin" />
            ) : (
              <Save size={18} className="mr-2 inline" />
            )}
            {isSaving ? 'Updating...' : 'Save Scores'}
          </NeonButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
