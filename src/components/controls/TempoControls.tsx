import { useProjectContext } from '../../context/ProjectContext';
import { useTapTempo } from '../../hooks/useTapTempo';
import { TEMPO_PRESETS } from '../../constants/music';

export function TempoControls() {
  const { currentProject, setTempo } = useProjectContext();
  const currentTempo = currentProject?.tempo ?? 100;

  return (
    <div className="space-y-1.5">
      <p className="text-ink-muted text-xs uppercase tracking-wide font-medium">Tempo</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-ink text-sm font-mono font-semibold w-20 shrink-0">
          ♩ = {currentTempo}
        </span>
        {TEMPO_PRESETS.map((preset) => (
          <button
            key={preset.bpm}
            onClick={() => setTempo(preset.bpm)}
            className={`px-2 py-1 rounded text-xs transition-colors min-h-[32px] ${
              currentTempo === preset.bpm
                ? 'bg-primary text-white'
                : 'bg-surface-muted text-ink hover:bg-surface-strong'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <TapTempoButton onBpm={setTempo} />
      </div>
    </div>
  );
}

function TapTempoButton({ onBpm }: { onBpm: (bpm: number) => void }) {
  const { bpm, tap } = useTapTempo();

  const handleTap = () => {
    const calculatedBpm = tap();
    if (calculatedBpm !== null) onBpm(calculatedBpm);
  };

  return (
    <button
      onClick={handleTap}
      onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
      className="px-3 py-1 bg-amber hover:bg-amber-strong active:bg-amber-strong text-ink rounded text-xs font-medium transition-colors min-h-[32px]"
      title="Tap repeatedly to detect tempo"
    >
      👆 Tap {bpm !== null ? `(${bpm} BPM)` : 'Tempo'}
    </button>
  );
}

