import { useCallback, useRef, useState } from 'react';

export function calculateTapTempoBpm(timestamps: readonly number[]): number | null {
  if (timestamps.length < 2) return null;

  const intervals: number[] = [];
  const recentTimestamps = timestamps.slice(-6);
  for (let index = 1; index < recentTimestamps.length; index++) {
    const interval = recentTimestamps[index] - recentTimestamps[index - 1];
    if (interval > 0) intervals.push(interval);
  }
  if (intervals.length === 0) return null;

  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const middle = Math.floor(sortedIntervals.length / 2);
  const medianInterval = sortedIntervals.length % 2 === 0
    ? (sortedIntervals[middle - 1] + sortedIntervals[middle]) / 2
    : sortedIntervals[middle];
  const calculated = Math.round(60_000 / medianInterval);

  return Math.max(40, Math.min(220, calculated));
}

export function useTapTempo() {
  const taps = useRef<number[]>([]);
  const [bpm, setBpm] = useState<number | null>(null);

  const tap = useCallback((): number | null => {
    const now = Date.now();
    // Discard taps older than 3 seconds
    const recent = taps.current.filter((t) => now - t < 3000);
    recent.push(now);
    taps.current = recent;

    const calculated = calculateTapTempoBpm(recent);
    setBpm(calculated);
    return calculated;
  }, []);

  return { bpm, tap };
}
