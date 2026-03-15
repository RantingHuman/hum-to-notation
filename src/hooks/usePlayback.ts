import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import { PlaybackEngine } from '../services/playback';

export function usePlayback() {
  const { currentProject } = useProjectContext();
  const engineRef = useRef<PlaybackEngine | null>(null);
  const [playingLayerId, setPlayingLayerId] = useState<string | null>(null);

  // Create engine once on mount, dispose on unmount
  useEffect(() => {
    engineRef.current = new PlaybackEngine();
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setPlayingLayerId(null);
  }, []);

  const playLayer = useCallback(
    async (layerId: string) => {
      if (!currentProject) return;

      const layer = currentProject.layers.find((l) => l.id === layerId);
      if (!layer || layer.notes.length === 0) return;

      // Stop any currently playing layer first
      stop();

      const engine = engineRef.current;
      if (!engine) return;

      engine.onComplete = () => {
        setPlayingLayerId((current) => (current === layerId ? null : current));
      };

      setPlayingLayerId(layerId);

      try {
        await engine.playLayer(
          layer.notes,
          currentProject.tempo,
          layer.octaveShift,
          layer.instrument
        );
      } catch (err) {
        console.error('Playback error:', err);
        setPlayingLayerId(null);
      }
    },
    [currentProject, stop]
  );

  const isPlaying = playingLayerId !== null;

  return { playLayer, stop, isPlaying, playingLayerId };
}
