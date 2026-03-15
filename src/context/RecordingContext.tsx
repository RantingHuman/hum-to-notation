import React, { createContext, useContext } from 'react';
import { useRecording } from '../hooks/useRecording';
import type { RecordingState } from '../hooks/useRecording';

interface RecordingContextValue {
  recordingState: RecordingState;
  elapsedMs: number;
  countdownBeat: number;
  error: string | null;
  micDenied: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  dismissMicDenied: () => void;
  dismissError: () => void;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const recording = useRecording();
  return (
    <RecordingContext.Provider value={recording}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecordingContext() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error('useRecordingContext must be used inside <RecordingProvider>');
  return ctx;
}
