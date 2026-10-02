import { LoadingSpinner } from './LoadingSpinner';

interface Props {
  message?: string;
  subMessage?: string;
}

export function ProcessingOverlay({
  message = 'Processing…',
  subMessage = 'This will only take a moment',
}: Props) {
  return (
    <div className="fixed inset-0 bg-ink/30 flex flex-col items-center justify-center z-40">
      <div className="bg-surface rounded-xl px-8 py-6 flex flex-col items-center gap-3 border border-line shadow-2xl">
        <LoadingSpinner size="lg" />
        <p className="text-ink font-medium">{message}</p>
        {subMessage && <p className="text-ink-muted text-sm">{subMessage}</p>}
      </div>
    </div>
  );
}
