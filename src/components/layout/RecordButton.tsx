import { useProjectContext } from '../../context/ProjectContext';
import { useRecordingContext } from '../../context/RecordingContext';
import { MicPermissionGuide } from '../MicPermissionGuide';
import { ProcessingOverlay } from '../common/ProcessingOverlay';

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Full-screen recording feedback: mic help, errors, count-in and processing. */
export function RecordOverlays() {
  const { recordingState, countdownBeat, error, micDenied, dismissMicDenied, dismissError } =
    useRecordingContext();

  return (
    <>
      {micDenied && <MicPermissionGuide onDismiss={dismissMicDenied} />}

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-danger-soft border border-danger text-ink text-sm px-4 py-2.5 rounded-lg shadow-lg max-w-xs text-center">
          {error}
          <button onClick={dismissError} aria-label="Dismiss" className="ml-3 text-danger hover:text-ink">✕</button>
        </div>
      )}

      {recordingState === 'processing' && (
        <ProcessingOverlay message="Processing your melody…" subMessage="This will only take a moment" />
      )}

      {recordingState === 'countdown' && (
        <div className="fixed inset-0 bg-ink/15 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-center bg-surface rounded-3xl px-12 py-6 shadow-xl border border-line">
            <p className="text-ink-muted text-lg mb-1">Get ready…</p>
            <div className="font-display text-8xl font-semibold text-primary animate-pulse">
              {countdownBeat || ''}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * The big record button shown in place of the notation while a layer is empty
 * or a take is in progress.
 */
interface RecordStageProps {
  /** Offered when the layer is empty: open the note editor instead of recording. */
  onTypeNotes?: () => void;
}

export function RecordStage({ onTypeNotes }: RecordStageProps) {
  const { currentProject, selectedLayerId } = useProjectContext();
  const { recordingState, elapsedMs, startRecording, stopRecording } = useRecordingContext();

  const layer = currentProject?.layers.find((l) => l.id === selectedLayerId);
  const isIdle = recordingState === 'idle';
  const isRecording = recordingState === 'recording';
  const hasNotes = Boolean(layer?.notes.some((n) => !n.isRest));
  const instrument = layer?.instrument === 'bass' ? 'bass line' : 'melody';

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      {isIdle ? (
        <button
          onClick={startRecording}
          aria-label="Record"
          title="Start recording"
          className="w-32 h-32 rounded-full bg-danger hover:bg-danger-strong active:scale-95 flex items-center justify-center text-white shadow-[0_0_0_12px_var(--color-blossom-soft),0_10px_30px_rgba(200,70,61,0.35)] transition-all"
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3" />
          </svg>
        </button>
      ) : isRecording ? (
        <button
          onClick={stopRecording}
          aria-label="Stop recording"
          title="Stop recording"
          className="w-32 h-32 rounded-full bg-danger hover:bg-danger-strong active:scale-95 flex items-center justify-center shadow-[0_0_0_12px_var(--color-blossom-soft)] animate-pulse"
        >
          <span className="w-10 h-10 bg-white rounded-lg" />
        </button>
      ) : (
        // Count-in or processing: not clickable
        <div className="w-32 h-32 rounded-full bg-surface-muted border-4 border-line flex items-center justify-center">
          <span className="w-10 h-10 bg-line-strong rounded-full" />
        </div>
      )}

      {isRecording ? (
        <div className="flex flex-col items-center gap-1">
          <p className="font-display text-2xl font-semibold text-ink">Listening…</p>
          <p className="text-ink-muted">
            <span className="font-mono text-ink">{formatTime(elapsedMs)}</span> / 2:00 · tap to stop
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 max-w-xs">
          <p className="font-display text-2xl font-semibold text-ink">
            {hasNotes ? `Record this ${instrument} again` : `Tap and hum your ${instrument}`}
          </p>
          <p className="text-ink-muted">
            You'll hear one bar of clicks first. Start humming on the next beat.
          </p>
          {isIdle && !hasNotes && onTypeNotes && (
            <button
              onClick={onTypeNotes}
              className="mt-3 min-h-10 px-3 text-sm font-semibold text-primary hover:text-primary-strong underline underline-offset-4"
            >
              Or type notes in by hand
            </button>
          )}
        </div>
      )}
    </div>
  );
}
