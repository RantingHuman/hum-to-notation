import { useProjectContext } from '../../context/ProjectContext';
import { useTapTempo } from '../../hooks/useTapTempo';
import { TEMPO_PRESETS } from '../../constants/music';

export function TempoControls() {
  const { currentProject, setTempo } = useProjectContext();
  const currentTempo = currentProject?.tempo ?? 100;

  return (
    <div className="space-y-1.5">
      <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Tempo</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-white text-sm font-mono font-semibold w-20 shrink-0">
          ♩ = {currentTempo}
        </span>
        {TEMPO_PRESETS.map((preset) => (
          <button
            key={preset.bpm}
            onClick={() => setTempo(preset.bpm)}
            className={`px-2 py-1 rounded text-xs transition-colors min-h-[32px] ${
              currentTempo === preset.bpm
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
      className="px-3 py-1 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded text-xs font-medium transition-colors min-h-[32px]"
      title="Tap repeatedly to detect tempo"
    >
      👆 Tap {bpm !== null ? `(${bpm} BPM)` : 'Tempo'}
    </button>
  );
}

