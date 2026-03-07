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
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[#76B900]/30 overflow-x-hidden">
      {/* Dynamic Gaming Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#000000]">
        {/* Animated Tech Grid */}
        <div 
          className="absolute inset-[0] w-[200%] h-[200%] left-[-50%] top-[-50%]" 
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(118, 185, 0, 0.25) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(118, 185, 0, 0.25) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            transform: 'perspective(1000px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
            animation: 'grid-pan 3s linear infinite',
            maskImage: 'radial-gradient(ellipse 100% 100% at 50% 50%, black 10%, transparent 60%)',
            WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 50% 50%, black 10%, transparent 60%)'
          }}
        />
        {/* Ambient Glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#76B900] opacity-[0.05] blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#76B900] opacity-[0.05] blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay" />
      </div>

      <header className="relative z-10 border-b border-[#333333]/50 bg-[#0A0A0A]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#76B900] to-[#558a00] p-[1px]">
                <div className="absolute inset-0 blur-md bg-[#76B900]/30" />
                <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-[#000000]">
                  <Trophy size={20} className="text-[#76B900]" />
                </div>
              </div>
              <h1 className="text-2xl font-bold font-display tracking-widest text-[#FFFFFF] drop-shadow-[0_0_8px_rgba(118,185,0,0.5)]">
                FASTATHON LEADERBOARD
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
                      isActive ? 'text-[#76B900]' : 'text-[#A1A1AA] hover:text-white hover:bg-[#222222]/50'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 border-b-2 border-[#76B900] bg-gradient-to-t from-[#76B900]/10 to-transparent rounded-lg"
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
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#76B900] to-transparent opacity-60 shadow-[0_0_12px_#76B900]" />
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
