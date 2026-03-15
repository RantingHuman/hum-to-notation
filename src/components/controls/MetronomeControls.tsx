import { useProjectContext } from '../../context/ProjectContext';
import { useMetronome } from '../../hooks/useMetronome';

export function MetronomeControls() {
  const { currentProject, setMetronomeMode } = useProjectContext();
  const mode = currentProject?.metronomeMode ?? 'visual';
  const tempo = currentProject?.tempo ?? 100;
  const timeSig = currentProject?.timeSignature ?? { numerator: 4, denominator: 4 };

  const { isPlaying, currentBeat, start, stop } = useMetronome(tempo, timeSig, mode);

  const beats = Array.from({ length: timeSig.numerator }, (_, i) => i + 1);

  return (
    <div className="space-y-1.5">
      <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Metronome</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setMetronomeMode('visual')}
          className={`px-2 py-1 rounded text-xs transition-colors min-h-[32px] ${
            mode === 'visual'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          👁 Visual
        </button>
        <button
          onClick={() => setMetronomeMode('audio')}
          className={`px-2 py-1 rounded text-xs transition-colors min-h-[32px] ${
            mode === 'audio'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🎧 Audio
        </button>

        <button
          onClick={isPlaying ? stop : start}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors min-h-[32px] ${
            isPlaying
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-700 hover:bg-green-600 text-white'
          }`}
        >
          {isPlaying ? '■ Stop' : '▶ Test'}
        </button>

        {/* Beat indicator dots */}
        <div className="flex gap-1 items-center ml-1">
          {beats.map((beat) => {
            const isActive = isPlaying && currentBeat === beat;
            const isDown = beat === 1;
            return (
              <div
                key={beat}
                className={`rounded-full transition-all duration-75 ${
                  isActive
                    ? isDown
                      ? 'w-4 h-4 bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]'
                      : 'w-3.5 h-3.5 bg-green-400'
                    : 'w-3 h-3 bg-gray-600'
                }`}
              />
            );
          })}
        </div>
      </div>

      {mode === 'audio' && (
        <p className="text-yellow-400 text-xs flex items-center gap-1">
          🎧 Use headphones to prevent mic feedback during recording
        </p>
      )}
    </div>
  );
}
