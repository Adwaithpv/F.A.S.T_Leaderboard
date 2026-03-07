import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { cn } from './NeonButton';

export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/20 border border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.6)] text-[#FFD700]">
        <Trophy size={24} />
      </div>
    );
  }
  
  if (rank === 2) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#C0C0C0]/20 to-[#E0E0E0]/20 border border-[#C0C0C0] shadow-[0_0_10px_rgba(192,192,192,0.4)] text-[#C0C0C0]">
        <Medal size={24} />
      </div>
    );
  }
  
  if (rank === 3) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#CD7F32]/20 to-[#A0522D]/20 border border-[#CD7F32] shadow-[0_0_10px_rgba(205,127,50,0.4)] text-[#CD7F32]">
        <Award size={24} />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1F2937] border border-[#2D3748] text-[#9CA3AF] text-xl font-bold font-display shadow-inner">
      #{rank}
    </div>
  );
}
