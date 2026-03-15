import type { BrowserSupport } from '../utils/browserCompat';

interface Props {
  support: BrowserSupport;
  onDismiss?: () => void;
}

export function BrowserWarning({ support, onDismiss }: Props) {
  if (support.warnings.length === 0) return null;

  const isBlocking = !support.supported;

  return (
    <div
      className={`border rounded-lg px-4 py-3 mb-4 text-sm flex gap-3 items-start ${
        isBlocking
          ? 'bg-red-900/60 border-red-700 text-red-200'
          : 'bg-yellow-900/40 border-yellow-700 text-yellow-200'
      }`}
    >
      <span className="text-xl shrink-0">{isBlocking ? '🚫' : '⚠️'}</span>
      <div className="flex-1 space-y-1">
        {isBlocking && (
          <p className="font-semibold">
            Your browser doesn't support the features needed to run this app.
          </p>
        )}
        {support.warnings.map((w, i) => (
          <p key={i}>{w}</p>
        ))}
        {!isBlocking && (
          <p className="text-yellow-300 text-xs mt-1">
            For the best experience, use <strong>Chrome</strong> or <strong>Edge</strong> on desktop.
          </p>
        )}
      </div>
      {!isBlocking && onDismiss && (
        <button
          onClick={onDismiss}
          className="text-yellow-400 hover:text-yellow-200 shrink-0 transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
