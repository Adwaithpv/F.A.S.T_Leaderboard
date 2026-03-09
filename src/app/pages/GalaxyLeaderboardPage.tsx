import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Sparkles, Telescope, Move, X, MousePointer2 } from 'lucide-react';
import { cn } from '../components/NeonButton';
import { useTournament } from '../context/TournamentContext';
import { GalaxyCanvas } from '../galaxy/GalaxyCanvas';
import { derivePlanetDNA, mapTournamentScoresToGalaxyTeams } from '../galaxy/galaxyMapping';
import { PlanetDNA } from '../galaxy/galaxyTypes';
import { useIsMobile } from '../components/ui/use-mobile';

type QualityMode = 'cinematic' | 'performance';

export function GalaxyLeaderboardPage() {
  const { rounds, getOverallScores } = useTournament();
  const isMobile = useIsMobile();
  const [selectedRound, setSelectedRound] = useState(rounds[0].id);
  const [qualityMode, setQualityMode] = useState<QualityMode>('cinematic');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [resetViewKey, setResetViewKey] = useState(0);
  const [previousLeaderId, setPreviousLeaderId] = useState<string | null>(null);
  const [leaderTransitionValue, setLeaderTransitionValue] = useState(0);
  const [pulseByTeamId, setPulseByTeamId] = useState<Record<string, number>>({});
  
  // NEW: State for Free View Mode
  const [isFreeView, setIsFreeView] = useState(false);

  const previousPointsByTeamRef = useRef<Record<string, number>>({});
  const basePointsByTeamRef = useRef<Record<string, number>>({});
  const dnaByTeamRef = useRef<Record<string, PlanetDNA>>({});
  const leaderRef = useRef<string | null>(null);
  const leaderTransitionRafRef = useRef<number | null>(null);

  const overallScores = useMemo(() => getOverallScores(selectedRound), [getOverallScores, selectedRound]);

  const sourceTeams = useMemo(() => {
    return overallScores.map((score) => {
      const basePoints =
        score.team.basePoints ??
        basePointsByTeamRef.current[score.team.id] ??
        score.total;

      if (!basePointsByTeamRef.current[score.team.id]) {
        basePointsByTeamRef.current[score.team.id] = basePoints;
      }

      if (!dnaByTeamRef.current[score.team.id]) {
        dnaByTeamRef.current[score.team.id] = derivePlanetDNA(score.team.id, basePoints, score.team.colorHint);
      }

      return {
        id: score.team.id,
        name: score.team.name,
        logo: score.team.logo,
        colorHint: score.team.colorHint,
        basePoints,
        currentPoints: score.total,
      };
    });
  }, [overallScores]);

  const galaxyTeams = useMemo(() => {
    return mapTournamentScoresToGalaxyTeams(sourceTeams, {
      previousPointsByTeam: previousPointsByTeamRef.current,
    });
  }, [sourceTeams]);

  useEffect(() => {
    if (!selectedTeamId && galaxyTeams.length > 0) {
      setSelectedTeamId(galaxyTeams[0].id);
    }
  }, [galaxyTeams, selectedTeamId]);

  // Score change feedback
  const pulseDecayRafRef = useRef<number | null>(null);
  useEffect(() => {
    const pulseMap: Record<string, number> = {};
    const leaderPoints = galaxyTeams[0]?.currentPoints ?? 1;
    let hasAny = false;
    galaxyTeams.forEach((team) => {
      if (team.deltaPoints > 0) {
        pulseMap[team.id] = Math.min(1, team.deltaPoints / Math.max(leaderPoints * 0.15, 1));
        hasAny = true;
      }
    });
    setPulseByTeamId(pulseMap);
    if (hasAny) {
      if (pulseDecayRafRef.current !== null) cancelAnimationFrame(pulseDecayRafRef.current);
      const decay = () => {
        setPulseByTeamId((prev) => {
          const next: Record<string, number> = {};
          let stillActive = false;
          for (const [id, val] of Object.entries(prev)) {
            const reduced = val - 0.015;
            if (reduced > 0.01) {
              next[id] = reduced;
              stillActive = true;
            }
          }
          if (!stillActive) {
            pulseDecayRafRef.current = null;
            return {};
          }
          pulseDecayRafRef.current = requestAnimationFrame(decay);
          return next;
        });
      };
      pulseDecayRafRef.current = requestAnimationFrame(decay);
    }
    return () => {
      if (pulseDecayRafRef.current !== null) {
        cancelAnimationFrame(pulseDecayRafRef.current);
        pulseDecayRafRef.current = null;
      }
    };
  }, [galaxyTeams]);

  useEffect(() => {
    const currentLeader = galaxyTeams[0]?.id ?? null;
    const previousLeader = leaderRef.current;
    if (previousLeader && currentLeader && previousLeader !== currentLeader) {
      setPreviousLeaderId(previousLeader);
      setLeaderTransitionValue(1);
      leaderRef.current = currentLeader;
      if (leaderTransitionRafRef.current !== null) {
        cancelAnimationFrame(leaderTransitionRafRef.current);
      }
      let value = 1;
      const step = () => {
        value = Math.max(0, value - 0.02);
        setLeaderTransitionValue(value);
        if (value > 0) {
          leaderTransitionRafRef.current = requestAnimationFrame(step);
        } else {
          leaderTransitionRafRef.current = null;
        }
      };
      leaderTransitionRafRef.current = requestAnimationFrame(step);
      return () => {
        if (leaderTransitionRafRef.current !== null) {
          cancelAnimationFrame(leaderTransitionRafRef.current);
          leaderTransitionRafRef.current = null;
        }
      };
    }

    leaderRef.current = currentLeader;
    return undefined;
  }, [galaxyTeams]);

  useEffect(() => {
    if (!selectedTeamId) return;
    if (!galaxyTeams.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId(galaxyTeams[0]?.id ?? null);
    }
  }, [galaxyTeams, selectedTeamId]);

  useEffect(() => {
    const next: Record<string, number> = {};
    galaxyTeams.forEach((team) => {
      next[team.id] = team.currentPoints;
    });
    previousPointsByTeamRef.current = next;
  }, [galaxyTeams]);

  const selectedTeam = galaxyTeams.find((team) => team.id === selectedTeamId) ?? galaxyTeams[0];
  const topStrip = galaxyTeams;

  useEffect(() => {
    if (isMobile) {
      setQualityMode('performance');
    }
  }, [isMobile]);

  // NEW: Helper function to handle team selection and exit free view
  const handleSelectTeam = (id: string) => {
    setSelectedTeamId(id);
    setIsFreeView(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 overflow-hidden bg-[#05070d]"
    >
      <div className="absolute inset-0">
        <GalaxyCanvas
          teams={galaxyTeams}
          dnaByTeam={dnaByTeamRef.current}
          selectedTeamId={selectedTeamId}
          onSelectTeam={handleSelectTeam}
          qualityMode={qualityMode}
          onResetViewKey={resetViewKey}
          previousLeaderId={previousLeaderId}
          leaderTransitionValue={leaderTransitionValue}
          pulseByTeamId={pulseByTeamId}
          isFreeView={isFreeView} // Passed down to canvas
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,158,255,0.16),transparent_42%),radial-gradient(circle_at_80%_100%,rgba(255,178,110,0.12),transparent_38%)]" />

      {/* --- FREE VIEW CONTROLS OVERLAY --- */}
      <div
        className={cn(
          "absolute bottom-8 left-1/2 z-50 -translate-x-1/2 transition-all duration-500",
          isFreeView ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-10 opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-4 rounded-full border border-white/10 bg-black/60 px-6 py-3 shadow-2xl backdrop-blur-xl">
          <MousePointer2 size={16} className="text-slate-400" />
          <span className="hidden text-xs font-medium tracking-wide text-slate-300 sm:block">
            Left Click: Rotate <span className="mx-2 text-slate-600">|</span> Right Click: Pan <span className="mx-2 text-slate-600">|</span> Scroll: Zoom
          </span>
          <div className="mx-2 hidden h-5 w-px bg-white/20 sm:block"></div>
          <button
            onClick={() => setIsFreeView(false)}
            className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-300 transition-all hover:bg-rose-500/40"
          >
            <X size={14} />
            Exit Mode
          </button>
        </div>
      </div>

      {/* --- STANDARD UI OVERLAY --- */}
      {/* Added dynamic classes to fade this out when Free View is active */}
      <div 
        className={cn(
          "relative z-10 flex h-full w-full flex-col justify-between p-4 pt-[100px] md:p-6 md:pt-[100px] pointer-events-none pb-8 md:pb-8 transition-opacity duration-500",
          isFreeView ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-xl max-w-fit">
          <h2 className="mr-2 text-sm font-display uppercase tracking-widest text-white/80">Galaxy Power Map</h2>
          
          {rounds.map((round) => (
            <button
              key={round.id}
              onClick={() => setSelectedRound(round.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.17em] transition',
                selectedRound === round.id
                  ? 'bg-white/20 text-white shadow-[0_0_6px_rgba(255,255,255,0.06)]'
                  : 'bg-white/[0.04] text-slate-400 hover:bg-white/12 hover:text-white',
              )}
            >
              {round.name}
            </button>
          ))}

          <div className="ml-2 h-4 w-px bg-white/20"></div>

          {/* Enable Free View Button */}
          <button
            onClick={() => setIsFreeView(true)}
            className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-300 transition hover:bg-white/15 hover:text-white"
          >
            <Move size={12} />
            Free View
          </button>
        </div>

        <div className="pointer-events-auto space-y-2">
          {selectedTeam ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 backdrop-blur-xl">
              <h3 className="text-base font-semibold text-white">{selectedTeam.name}</h3>
              <span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-2 py-0.5 text-[10px] text-amber-100">
                #{selectedTeam.rank}
              </span>
              <span className="text-xs text-slate-300">{selectedTeam.currentPoints} pts</span>
              <span className="text-xs text-slate-400">Gap {selectedTeam.scoreGapToLeader}</span>
              <span className="text-xs capitalize text-slate-400">{selectedTeam.momentum}</span>
              <span className={selectedTeam.deltaPoints >= 0 ? 'text-xs text-emerald-400' : 'text-xs text-rose-400'}>
                {selectedTeam.deltaPoints >= 0 ? `+${selectedTeam.deltaPoints}` : selectedTeam.deltaPoints}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={() => setQualityMode(qualityMode === 'cinematic' ? 'performance' : 'cinematic')}
                  className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 transition hover:bg-white/15"
                >
                  {qualityMode === 'cinematic' ? <Sparkles size={10} /> : <Telescope size={10} />}
                  {qualityMode === 'cinematic' ? 'HD' : 'Perf'}
                </button>
                <button
                  onClick={() => setResetViewKey((k) => k + 1)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 transition hover:bg-white/15"
                >
                  <RotateCcw size={10} />
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-black/35 px-2.5 py-2 backdrop-blur-xl">
            {topStrip.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelectTeam(team.id)}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs transition',
                  selectedTeamId === team.id
                    ? 'border-white/40 bg-white/20 text-white shadow-[0_0_8px_rgba(255,255,255,0.08)]'
                    : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white',
                )}
              >
                <span className="mr-1.5 font-mono text-[10px] text-slate-500">#{team.rank}</span>
                {team.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}