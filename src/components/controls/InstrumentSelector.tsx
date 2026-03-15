import type { Instrument } from '../../types/music';

const INSTRUMENT_OPTIONS: { value: Instrument; label: string; icon: string }[] = [
  { value: 'guitar', label: 'Guitar', icon: '🎸' },
  { value: 'bass', label: 'Bass Guitar', icon: '🎵' },
];

interface Props {
  onSelect: (instrument: Instrument) => void;
  onCancel: () => void;
}

export function InstrumentSelector({ onSelect, onCancel }: Props) {
  return (
    <div className="bg-gray-700 rounded-lg p-3 border border-purple-500 space-y-2">
      <p className="text-gray-300 text-xs font-medium">Choose instrument:</p>
      <div className="flex gap-2">
        {INSTRUMENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="flex-1 bg-gray-600 hover:bg-purple-700 text-white py-2 rounded text-sm transition-colors flex flex-col items-center gap-1"
          >
            <span className="text-xl">{opt.icon}</span>
            <span className="text-xs">{opt.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onCancel}
        className="w-full text-gray-400 hover:text-white text-xs py-1 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

export { INSTRUMENT_OPTIONS };
