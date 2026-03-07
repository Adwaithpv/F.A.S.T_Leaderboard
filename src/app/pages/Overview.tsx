import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTournament } from '../context/TournamentContext';
import { LeaderboardCard } from '../components/LeaderboardCard';
import { cn } from '../components/NeonButton';

export function Overview() {
  const { rounds, getOverallScores } = useTournament();
  const [selectedRound, setSelectedRound] = useState(rounds[0].id);

  const overallScores = getOverallScores(selectedRound);
  const maxScore = Math.max(...overallScores.map(s => s.total), 4000); // 4 games * 1000

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-display font-bold text-white tracking-widest uppercase">
            Global Rankings
          </h2>
          <p className="text-[#9CA3AF] mt-2 font-mono text-sm">CUMULATIVE SCORE ACROSS ALL GAMES</p>
        </div>

        {/* Round Selector */}
        <div className="flex bg-[#141A29]/80 p-1.5 rounded-xl border border-[#1F2937] backdrop-blur-md">
          {rounds.map(round => (
            <button
              key={round.id}
              onClick={() => setSelectedRound(round.id)}
              className={cn(
                "relative px-6 py-2.5 text-sm font-bold uppercase tracking-widest rounded-lg transition-all duration-300",
                selectedRound === round.id 
                  ? "text-[#00F0FF] text-shadow-[0_0_10px_rgba(0,240,255,0.8)]" 
                  : "text-[#9CA3AF] hover:text-white"
              )}
            >
              {selectedRound === round.id && (
                <motion.div
                  layoutId="roundTab"
                  className="absolute inset-0 bg-[#00F0FF]/15 border border-[#00F0FF]/50 rounded-lg shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{round.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {overallScores.map((item, index) => (
            <motion.div
              key={`${item.team.id}-${selectedRound}`}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <LeaderboardCard
                rank={index + 1}
                team={item.team}
                score={item.total}
                breakdown={item.breakdown}
                maxScore={maxScore}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
