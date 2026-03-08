import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileCode2, ChevronDown } from 'lucide-react';

interface ExportDropdownProps {
  onExportPDF: () => void;
  onExportXML: () => void;
  accentColor?: string;
}

export function ExportDropdown({ onExportPDF, onExportXML, accentColor = '#76B900' }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingXML, setLoadingXML] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePDF = () => {
    setLoadingPDF(true);
    setOpen(false);
    setTimeout(async () => {
      await onExportPDF();
      setLoadingPDF(false);
    }, 100);
  };

  const handleXML = () => {
    setLoadingXML(true);
    setOpen(false);
    setTimeout(() => {
      onExportXML();
      setLoadingXML(false);
    }, 100);
  };

  const isLoading = loadingPDF || loadingXML;

  return (
    <div ref={ref} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        disabled={isLoading}
        style={{
          borderColor: `${accentColor}60`,
          color: accentColor,
          boxShadow: open ? `0 0 14px ${accentColor}40` : 'none',
        }}
        className="
          flex items-center gap-2 px-4 py-2.5 rounded-xl
          bg-black/40 border backdrop-blur-md
          text-sm font-bold uppercase tracking-widest
          hover:bg-black/60 transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed
        "
      >
        {isLoading ? (
          <span className="animate-pulse text-xs">Generating…</span>
        ) : (
          <>
            <Download size={15} />
            <span>Download Results</span>
            <ChevronDown
              size={14}
              className="transition-transform duration-200"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className="
            absolute right-0 mt-2 w-48 rounded-xl overflow-hidden z-50
            border border-[#2a3a5a] bg-[#0d1226]/95 backdrop-blur-md
            shadow-[0_8px_32px_rgba(0,0,0,0.6)]
          "
        >
          {/* PDF Option */}
          <button
            onClick={handlePDF}
            className="
              w-full flex items-center gap-3 px-4 py-3
              text-sm font-bold uppercase tracking-wider
              text-[#FFD700] hover:bg-[#FFD700]/10
              transition-colors duration-150 border-b border-[#1e2845]
            "
          >
            <FileText size={15} className="flex-shrink-0" />
            <span>Export as PDF</span>
          </button>

          {/* XML Option */}
          <button
            onClick={handleXML}
            className="
              w-full flex items-center gap-3 px-4 py-3
              text-sm font-bold uppercase tracking-wider
              text-[#5be8a8] hover:bg-[#5be8a8]/10
              transition-colors duration-150
            "
          >
            <FileCode2 size={15} className="flex-shrink-0" />
            <span>Export as XML</span>
          </button>
        </div>
      )}
    </div>
  );
}
