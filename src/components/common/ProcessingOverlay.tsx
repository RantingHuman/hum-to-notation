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
    <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-40">
      <div className="bg-gray-800 rounded-xl px-8 py-6 flex flex-col items-center gap-3 border border-gray-600 shadow-2xl">
        <LoadingSpinner size="lg" />
        <p className="text-white font-medium">{message}</p>
        {subMessage && <p className="text-gray-400 text-sm">{subMessage}</p>}
      </div>
    </div>
  );
}
