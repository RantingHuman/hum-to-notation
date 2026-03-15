import { useCallback, useEffect, useRef, useState } from 'react';
import { Metronome } from '../services/metronome';
import type { MetronomeMode, TimeSignature } from '../types/music';

export function useMetronome(bpm: number, timeSignature: TimeSignature, mode: MetronomeMode) {
  const metronomeRef = useRef<Metronome | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  // Keep metronome in sync with latest settings even while playing
  useEffect(() => {
    metronomeRef.current?.setTempo(bpm);
  }, [bpm]);

  useEffect(() => {
    metronomeRef.current?.setTimeSignature(timeSignature);
  }, [timeSignature]);

  useEffect(() => {
    metronomeRef.current?.setMode(mode);
  }, [mode]);

  const start = useCallback(async () => {
    // Always recreate to pick up latest time signature (sequence length may change)
    metronomeRef.current?.stop();
    const m = new Metronome(bpm, timeSignature, mode);
    m.onBeat((beat) => setCurrentBeat(beat));
    metronomeRef.current = m;
    await m.start();
    setIsPlaying(true);
  }, [bpm, timeSignature, mode]);

  const stop = useCallback(() => {
    metronomeRef.current?.stop();
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      metronomeRef.current?.stop();
    };
  }, []);

  return { isPlaying, currentBeat, start, stop };
}
