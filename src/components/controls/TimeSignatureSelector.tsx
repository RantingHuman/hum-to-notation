import type { TimeSignature } from '../../types/music';
import { useProjectContext } from '../../context/ProjectContext';
import { TIME_SIGNATURE_OPTIONS } from '../../constants/music';

function timeSigEqual(a: TimeSignature, b: TimeSignature) {
  return a.numerator === b.numerator && a.denominator === b.denominator;
}

export function TimeSignatureSelector() {
  const { currentProject, setTimeSignature } = useProjectContext();
  const current = currentProject?.timeSignature ?? { numerator: 4, denominator: 4 };

  return (
    <div className="space-y-1.5">
      <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Time Signature</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {TIME_SIGNATURE_OPTIONS.map((opt) => (
          <button
            key={opt.display}
            onClick={() => setTimeSignature(opt.value)}
            title={opt.label}
            className={`px-3 py-1 rounded text-xs transition-colors min-h-[32px] ${
              timeSigEqual(current, opt.value)
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span className="font-semibold">{opt.display}</span>{' '}
            <span className="opacity-70">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
