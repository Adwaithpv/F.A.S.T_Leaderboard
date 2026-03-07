import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Trophy, Gamepad2, Settings } from 'lucide-react';
import { useTournament } from '../context/TournamentContext';

export function Layout() {
  const { games } = useTournament();
  const location = useLocation();

  const links = [
    { to: '/', label: 'Overview', icon: Trophy },
    ...games.map(g => ({
      to: `/game/${g.id}`,
      label: g.name,
      icon: Gamepad2,
    })),
    { to: '/admin', label: 'Admin Panel', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white selection:bg-[#00F0FF]/30 overflow-x-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#00F0FF] opacity-10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#8A2BE2] opacity-10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
      </div>

      <header className="relative z-10 border-b border-[#1F2937]/50 bg-[#0B0F1A]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00F0FF] to-[#8A2BE2] p-[1px]">
                <div className="absolute inset-0 blur-md bg-[#00F0FF]/50" />
                <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-[#0B0F1A]">
                  <Trophy size={20} className="text-[#00F0FF]" />
                </div>
              </div>
              <h1 className="text-2xl font-bold font-display tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#FF00FF]">
                CYBER LEADERBOARD
              </h1>
            </div>

            <nav className="hidden md:flex space-x-1">
              {links.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={`relative px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors duration-200 ${
                      isActive ? 'text-[#00F0FF]' : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]/50'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-[#00F0FF]/10 rounded-lg shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <link.icon size={16} />
                      {link.label}
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
        {/* Bottom Neon Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-50 shadow-[0_0_10px_#00F0FF]" />
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
