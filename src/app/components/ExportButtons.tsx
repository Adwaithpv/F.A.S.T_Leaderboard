import { useState } from 'react';
import { Download, FileCode2, FileText } from 'lucide-react';
import { exportToXML, exportToPDF, LeaderboardEntry } from './exportLeaderboard';

interface ExportButtonsProps {
  entries: LeaderboardEntry[];
  roundName: string;
  eventName?: string;
}

export function ExportButtons({
  entries,
  roundName,
  eventName = 'HackClub Hackathon',
}: ExportButtonsProps) {
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingXML, setLoadingXML] = useState(false);

  const handlePDF = () => {
    setLoadingPDF(true);
    // Small delay so state update renders before the blocking canvas work
    setTimeout(() => {
      exportToPDF(entries, roundName, eventName);
      setLoadingPDF(false);
    }, 100);
  };

  const handleXML = () => {
    setLoadingXML(true);
    setTimeout(() => {
      exportToXML(entries, roundName, eventName);
      setLoadingXML(false);
    }, 100);
  };

  return (
    <div className="flex items-center gap-2">
      {/* PDF */}
      <button
        onClick={handlePDF}
        disabled={loadingPDF || entries.length === 0}
        className="
          flex items-center gap-2 px-4 py-2 rounded-lg
          bg-[#FFD700]/10 border border-[#FFD700]/40
          text-[#FFD700] text-sm font-bold uppercase tracking-wider
          hover:bg-[#FFD700]/20 hover:border-[#FFD700]/70
          hover:shadow-[0_0_12px_rgba(255,215,0,0.25)]
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200
        "
      >
        {loadingPDF ? (
          <span className="animate-pulse">Generating…</span>
        ) : (
          <>
            <FileText size={15} />
            <span>PDF</span>
            <Download size={13} className="opacity-70" />
          </>
        )}
      </button>

      {/* XML */}
      <button
        onClick={handleXML}
        disabled={loadingXML || entries.length === 0}
        className="
          flex items-center gap-2 px-4 py-2 rounded-lg
          bg-[#76B900]/10 border border-[#76B900]/40
          text-[#76B900] text-sm font-bold uppercase tracking-wider
          hover:bg-[#76B900]/20 hover:border-[#76B900]/70
          hover:shadow-[0_0_12px_rgba(118,185,0,0.25)]
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200
        "
      >
        {loadingXML ? (
          <span className="animate-pulse">Generating…</span>
        ) : (
          <>
            <FileCode2 size={15} />
            <span>XML</span>
            <Download size={13} className="opacity-70" />
          </>
        )}
      </button>
    </div>
  );
}
