import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { RankBadge } from './RankBadge';
import { cn } from './NeonButton';
import { Team, Game } from '../context/TournamentContext';
import * as LucideIcons from 'lucide-react';

interface LeaderboardCardProps {
  rank: number;
  team: Team;
  score: number;
  breakdown?: { game: Game; score: number }[];
  maxScore?: number;
}

export function LeaderboardCard({ rank, team, score, breakdown, maxScore = 4000 }: LeaderboardCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const TeamIcon = (LucideIcons as any)[team.icon.charAt(0).toUpperCase() + team.icon.slice(1).replace(/-./g, x=>x[1].toUpperCase())] || LucideIcons.Shield;

  const cardColors = {
    1: 'from-[#FFD700]/10 to-transparent border-[#FFD700]/50 shadow-[0_0_20px_rgba(255,215,0,0.15)]',
    2: 'from-[#C0C0C0]/10 to-transparent border-[#C0C0C0]/50 shadow-[0_0_15px_rgba(192,192,192,0.1)]',
    3: 'from-[#CD7F32]/10 to-transparent border-[#CD7F32]/50 shadow-[0_0_15px_rgba(205,127,50,0.1)]',
    default: 'bg-[#141A29]/80 border-[#1F2937] hover:border-[#00F0FF]/30 hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]'
  };

  const currentColors = cardColors[rank as keyof typeof cardColors] || cardColors.default;

  return (
    <div
      className={cn(
        "relative flex flex-col w-full rounded-xl border backdrop-blur-md overflow-hidden transition-colors duration-300",
        rank <= 3 ? `bg-gradient-to-r ${currentColors}` : currentColors
      )}
    >
      <div 
        className="flex items-center p-4 cursor-pointer gap-4"
        onClick={() => breakdown && setIsExpanded(!isExpanded)}
      >
        <div className="flex-shrink-0">
          <RankBadge rank={rank} />
        </div>
        
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0B0F1A] border border-[#2D3748] text-[#00F0FF]">
          <TeamIcon size={24} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={cn("text-xl truncate font-bold uppercase tracking-wider", rank === 1 ? "text-[#FFD700]" : rank === 2 ? "text-[#C0C0C0]" : rank === 3 ? "text-[#CD7F32]" : "text-white")}>
            {team.name}
          </h3>
          <div className="w-full max-w-[200px] h-1.5 mt-2 bg-[#0B0F1A] rounded-full overflow-hidden border border-[#2D3748]">
            <motion.div 
              className={cn("h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]", 
                rank === 1 ? "bg-[#FFD700]" : rank === 2 ? "bg-[#C0C0C0]" : rank === 3 ? "bg-[#CD7F32]" : "bg-[#00F0FF]"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((score / maxScore) * 100, 100)}%` }}
              transition={{ duration: 1, delay: 0.2 }}
            />
          </div>
        </div>
        
        <div className="text-right px-4">
          <div className="text-sm text-[#9CA3AF] uppercase font-bold tracking-widest mb-1">Score</div>
          <div className="text-3xl font-display font-bold text-white tabular-nums tracking-wider leading-none">
            <motion.span>
              {score.toLocaleString()}
            </motion.span>
          </div>
        </div>

        {breakdown && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="text-[#9CA3AF] ml-2"
          >
            <ChevronDown size={24} />
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && breakdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#1F2937] bg-[#0B0F1A]/50"
          >
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {breakdown.map((item, i) => {
                const GameIcon = (LucideIcons as any)[item.game.icon.charAt(0).toUpperCase() + item.game.icon.slice(1).replace(/-./g, x=>x[1].toUpperCase())] || LucideIcons.Gamepad2;
                return (
                  <motion.div
                    key={item.game.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col rounded-lg bg-[#141A29] p-3 border border-[#2D3748]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <GameIcon size={16} color={item.game.color} />
                      <span className="text-sm font-bold text-[#9CA3AF] uppercase truncate">{item.game.name}</span>
                    </div>
                    <div className="text-xl font-display font-bold tabular-nums" style={{ color: item.game.color }}>
                      {item.score.toLocaleString()}
                    </div>
                    <div className="w-full h-1 mt-2 bg-[#0B0F1A] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.game.color, boxShadow: `0 0 5px ${item.game.color}` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((item.score / (maxScore/4)) * 100, 100)}%` }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
