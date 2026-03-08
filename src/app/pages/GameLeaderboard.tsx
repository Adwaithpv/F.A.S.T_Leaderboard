import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useTournament } from '../context/TournamentContext';
import { LeaderboardCard } from '../components/LeaderboardCard';
import { cn } from '../components/NeonButton';
import { ExportDropdown } from '../components/ExportDropdown';
import { exportGamePDF, exportGameXML, GameAllRoundsEntry } from '../components/exportLeaderboard';
import * as LucideIcons from 'lucide-react';

export function GameLeaderboard() {
  const { gameId } = useParams();
  const { games, rounds, getGameScores } = useTournament();
  const [selectedRound, setSelectedRound] = useState(rounds[0].id);

  const game = games.find(g => g.id === gameId) || games[0];
  const gameScores = getGameScores(game.id, selectedRound);
  const maxScore = 1000;

  const GameIcon = (LucideIcons as any)[
    game.icon.charAt(0).toUpperCase() + game.icon.slice(1).replace(/-./g, (x: string) => x[1].toUpperCase())
  ] || LucideIcons.Gamepad2;

  useEffect(() => {
    setSelectedRound(rounds[0].id);
  }, [gameId, rounds]);

  // Build all-rounds entries for export
  const allRoundsEntries: GameAllRoundsEntry[] = (() => {
    const baseScores = getGameScores(game.id, rounds[0].id);
    return baseScores.map(({ team }) => {
      const roundScores = rounds.map(r => {
        const scores = getGameScores(game.id, r.id);
        const found = scores.find(s => s.team.id === team.id);
        return { roundName: r.name, score: found?.score ?? 0 };
      });
      const total = roundScores.reduce((sum, r) => sum + r.score, 0);
      return { team, roundScores, total };
    });
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
      key={game.id}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-current shadow-[0_0_20px_currentColor] bg-black/20"
            style={{ color: game.color }}
          >
            <GameIcon size={32} />
          </div>
          <div>
            <h2
              className="text-4xl font-display font-bold tracking-widest uppercase"
              style={{ color: game.color, textShadow: `0 0 15px ${game.color}80` }}
            >
              {game.name}
            </h2>
            <p className="text-[#9CA3AF] mt-2 font-mono text-sm">INDIVIDUAL EVENT RANKINGS</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Download Results Dropdown */}
          <ExportDropdown
            accentColor={game.color}
            onExportPDF={() => exportGamePDF(allRoundsEntries, game, 'FASTATHON')}
            onExportXML={() => exportGameXML(allRoundsEntries, game, 'FASTATHON')}
          />

          {/* Round Selector */}
          <div className="flex bg-[#111111]/80 p-1.5 rounded-xl border border-[#333333] backdrop-blur-md">
            {rounds.map(round => (
              <button
                key={round.id}
                onClick={() => setSelectedRound(round.id)}
                className={cn(
                  "relative px-6 py-2.5 text-sm font-bold uppercase tracking-widest rounded-lg transition-all duration-300",
                  selectedRound === round.id
                    ? "text-white text-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    : "text-[#9CA3AF] hover:text-white"
                )}
              >
                {selectedRound === round.id && (
                  <motion.div
                    layoutId="roundTab"
                    className="absolute inset-0 bg-white/10 border border-white/50 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{ borderColor: game.color, boxShadow: `0 0 15px ${game.color}80` }}
                  />
                )}
                <span className="relative z-10">{round.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {gameScores.map((item, index) => (
            <motion.div
              key={`${item.team.id}-${selectedRound}-${game.id}`}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <LeaderboardCard
                rank={index + 1}
                team={item.team}
                score={item.score}
                maxScore={maxScore}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
