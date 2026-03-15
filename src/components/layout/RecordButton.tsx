import { useProjectContext } from '../../context/ProjectContext';
import { useRecording } from '../../hooks/useRecording';
import { MicPermissionGuide } from '../MicPermissionGuide';

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RecordButton() {
  const { currentProject, selectedLayerId } = useProjectContext();
  const {
    recordingState,
    elapsedMs,
    countdownBeat,
    error,
    micDenied,
    startRecording,
    stopRecording,
    dismissMicDenied,
    dismissError,
  } = useRecording();

  // Only render in workspace when a project is open
  if (!currentProject) return null;

  const isIdle = recordingState === 'idle';
  const isCountdown = recordingState === 'countdown';
  const isRecording = recordingState === 'recording';
  const isProcessing = recordingState === 'processing';

  const noLayer = !selectedLayerId;

  return (
    <>
      {/* Mic permission modal */}
      {micDenied && <MicPermissionGuide onDismiss={dismissMicDenied} />}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 bg-red-800 border border-red-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg max-w-xs text-center">
          {error}
          <button onClick={dismissError} className="ml-3 text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Processing overlay (full-width on desktop too) */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-40">
          <div className="bg-gray-800 rounded-xl px-8 py-6 flex flex-col items-center gap-3 border border-gray-600">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-medium">Processing your melody…</p>
            <p className="text-gray-400 text-sm">This will only take a moment</p>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {isCountdown && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-center">
            <p className="text-gray-300 text-lg mb-2">Get ready…</p>
            <div className="text-8xl font-bold text-purple-400 animate-pulse">
              {countdownBeat || ''}
            </div>
          </div>
        </div>
      )}

      {/* Main record button — fixed on mobile, shown inline on desktop in layer area */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
        {/* Recording status bar */}
        {isRecording && (
          <div className="bg-gray-900/90 border border-red-500 rounded-full px-4 py-1.5 flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-mono">{formatTime(elapsedMs)}</span>
            <span className="text-gray-400">/ 2:00</span>
          </div>
        )}

        {isIdle ? (
          <button
            onClick={startRecording}
            disabled={noLayer}
            title={noLayer ? 'Add a layer first' : 'Start recording'}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl border-4 transition-all
              ${noLayer
                ? 'bg-gray-700 border-gray-600 cursor-not-allowed opacity-50'
                : 'bg-red-600 hover:bg-red-700 active:scale-95 border-red-400'
              }`}
            aria-label="Record"
          >
            <span className="w-6 h-6 bg-white rounded-full" />
          </button>
        ) : isRecording ? (
          <button
            onClick={stopRecording}
            className="w-16 h-16 bg-red-600 hover:bg-red-700 active:scale-95 rounded-full flex items-center justify-center shadow-2xl border-4 border-red-400 transition-all animate-pulse"
            aria-label="Stop recording"
          >
            <span className="w-5 h-5 bg-white rounded-sm" />
          </button>
        ) : (
          // Countdown or processing — non-interactive
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center shadow-2xl border-4 border-gray-500 opacity-60">
            <span className="w-6 h-6 bg-gray-400 rounded-full" />
          </div>
        )}
      </div>
    </>
  );
}

