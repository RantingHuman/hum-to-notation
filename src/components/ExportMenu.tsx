import { useEffect, useRef, useState } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import { exportProjectToMidi } from '../services/exportMidi';
import { exportProjectToMusicXml } from '../services/exportMusicXml';
import { exportNotationToPdf } from '../services/exportPdf';
import { downloadBlob, sanitizeFilename } from '../utils/download';

interface Props {
  notationContainerRef: React.RefObject<HTMLElement | null>;
}

export function ExportMenu({ notationContainerRef }: Props) {
  const { currentProject } = useProjectContext();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasNotes =
    !!currentProject && currentProject.layers.some((l) => l.notes.filter((n) => !n.isRest).length > 0);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!currentProject) return null;

  const safeName = sanitizeFilename(currentProject.name || 'project');

  const handleMidi = () => {
    setOpen(false);
    const blob = exportProjectToMidi(currentProject);
    downloadBlob(blob, `${safeName}.mid`);
  };

  const handleMusicXml = () => {
    setOpen(false);
    const blob = exportProjectToMusicXml(currentProject);
    downloadBlob(blob, `${safeName}.musicxml`);
  };

  const handlePdf = async () => {
    setOpen(false);
    if (!notationContainerRef.current) return;
    setBusy(true);
    setExportError(null);
    try {
      await exportNotationToPdf(notationContainerRef.current, currentProject.name);
    } catch (err) {
      console.error('PDF export error:', err);
      setExportError('PDF export failed. Try switching to Sheet Music view first.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors
          ${hasNotes
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        title={hasNotes ? 'Export project' : 'Record notes before exporting'}
      >
        {busy ? (
          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
        ) : (
          '⬇'
        )}
        <span>Export</span>
        <span className="text-xs opacity-60">▾</span>
      </button>

      {exportError && (
        <div className="absolute right-0 top-10 z-50 bg-red-800 border border-red-600 text-white text-xs px-3 py-2 rounded shadow-lg w-56">
          {exportError}
          <button onClick={() => setExportError(null)} className="ml-2 text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {open && hasNotes && (
        <div className="absolute right-0 top-9 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl w-56 py-1 overflow-hidden">
          <button
            onClick={handlePdf}
            className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-gray-700 transition-colors flex flex-col"
          >
            <span className="font-medium">📄 Download PDF</span>
            <span className="text-gray-400 text-xs">For printing and sharing</span>
          </button>
          <button
            onClick={handleMusicXml}
            className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-gray-700 transition-colors flex flex-col"
          >
            <span className="font-medium">🎼 Download MusicXML</span>
            <span className="text-gray-400 text-xs">For MuseScore, GarageBand, Finale</span>
          </button>
          <button
            onClick={handleMidi}
            className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-gray-700 transition-colors flex flex-col"
          >
            <span className="font-medium">🎹 Download MIDI</span>
            <span className="text-gray-400 text-xs">For DAWs and sequencers</span>
          </button>
        </div>
      )}
    </div>
  );
}
