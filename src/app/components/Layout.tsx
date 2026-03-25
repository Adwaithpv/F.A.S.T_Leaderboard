import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Gamepad2, Settings, Orbit, Menu, X } from 'lucide-react';
import { useTournament } from '../context/TournamentContext';
import { BackgroundAudio } from './BackgroundAudio';

const Particles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-[#76B900] shadow-[0_0_15px_#76B900]"
          style={{
            width: Math.random() * 4 + 2 + 'px',
            height: Math.random() * 4 + 2 + 'px',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
          }}
          animate={{
            y: [0, Math.random() * -200 - 100],
            opacity: [0, Math.random() * 0.8 + 0.2, 0],
            scale: [0, Math.random() + 0.5, 0],
          }}
          transition={{
            duration: Math.random() * 5 + 5,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );
};


export function Layout() {
  const { games } = useTournament();
  const location = useLocation();
  const isGalaxyRoute = location.pathname === '/' || location.pathname.startsWith('/galaxy');
  const isAdminRoute = location.pathname === '/admin';
  const [isNavOpen, setIsNavOpen] = useState(false);

  const links = [
    { to: '/galaxy', label: 'Solar System', icon: Orbit },
    { to: '/overview', label: 'Overview', icon: Trophy },
    ...games.map(g => ({
      to: `/game/${g.id}`,
      label: g.name,
      icon: Gamepad2,
    })),
    { to: '/admin', label: 'Admin Panel', icon: Settings },
  ];

  const sponsorLogos = [
    { src: '/belden-logo.png', alt: 'Belden' },
    { src: '/bmw-header.png', alt: 'BMW' },
    { src: '/ncloud.png', alt: 'NeevCloud' },
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-[#76B900]/30 overflow-x-hidden">
      {/* Dynamic Gaming Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#000000]">
        {/* Removed grid and giant green glows to let authentic space background shine */}
        
        {/* Subtle Scanlines Effect for HUD aesthetic */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-10" />
        
        {/* Edge Vignette Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-60" />
      </div>

      <header className={`fixed z-50 top-0 left-0 w-full transition-all duration-300 ${isGalaxyRoute && !isNavOpen ? 'bg-transparent border-transparent' : 'border-b border-[#333333]/50 bg-[#0A0A0A]/80 backdrop-blur-xl'}`}>
        <div className="w-full p-4 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsNavOpen(!isNavOpen)}
                className="p-2 -ml-2 text-[#A1A1AA] hover:text-white transition-colors rounded-lg hover:bg-[#222222]/50 focus:outline-none focus:ring-2 focus:ring-[#76B900]/50 relative z-50"
                aria-label="Toggle navigation"
              >
                {isNavOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
              
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden p-[1px] bg-gradient-to-br from-[#76B900] to-[#558a00] shadow-[0_0_15px_rgba(118,185,0,0.3)] ml-2">
                <div className="absolute inset-0 bg-[#000000]" />
                <img src="/logo.png" alt="Fastathon Logo" className="relative z-10 w-full h-full object-contain p-1" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-display tracking-widest text-[#FFFFFF] drop-shadow-[0_0_8px_rgba(118,185,0,0.5)]">
                FASTATHON LEADERBOARD
              </h1>
              {!isAdminRoute ? (
                <div className="hidden items-center gap-8 md:flex ml-4">
                  {sponsorLogos.map((logo) => (
                    <img
                      key={logo.alt}
                      src={logo.src}
                      alt={logo.alt}
                      className="h-10 w-auto object-contain"
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <BackgroundAudio />
            </div>
          </div>
        </div>

        {/* Collapsible Animated Navigation Dropdown */}
        <AnimatePresence>
          {isNavOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#333333]/50 absolute top-full left-0 w-full"
            >
              <nav className="py-4 flex flex-col gap-2 px-4 md:px-6">
                {links.map((link, idx) => {
                  const isActive = link.to === '/galaxy' ? isGalaxyRoute : location.pathname === link.to;
                  return (
                    <motion.div
                      key={link.to}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                    >
                      <NavLink
                        to={link.to}
                        onClick={() => setIsNavOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors duration-200 ${
                          isActive 
                            ? 'bg-[#76B900]/10 text-[#76B900] border border-[#76B900]/30 shadow-[0_0_15px_rgba(118,185,0,0.15)]' 
                            : 'text-[#A1A1AA] hover:text-white hover:bg-[#222222]/50 border border-transparent'
                        }`}
                      >
                        <link.icon size={20} className={isActive ? 'text-[#76B900]' : 'text-[#888888]'} />
                        {link.label}
                      </NavLink>
                    </motion.div>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Neon Line */}
        <div className={`h-[2px] w-full bg-gradient-to-r from-transparent via-[#76B900] to-transparent opacity-60 shadow-[0_0_12px_#76B900] relative z-20 ${isGalaxyRoute && !isNavOpen ? 'hidden' : ''}`} />
      </header>

      <main className={`relative z-10 ${isGalaxyRoute ? 'h-screen w-screen p-0 m-0 overflow-hidden' : 'py-8 pt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}`}>
        <Outlet />
      </main>
    </div>
  );
}
