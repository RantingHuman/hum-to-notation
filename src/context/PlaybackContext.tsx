import React, { createContext, useContext } from 'react';
import { usePlayback } from '../hooks/usePlayback';

interface PlaybackContextValue {
  playLayer: (layerId: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  playingLayerId: string | null;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const playback = usePlayback();
  return (
    <PlaybackContext.Provider value={playback}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlaybackContext() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlaybackContext must be used inside <PlaybackProvider>');
  return ctx;
}
