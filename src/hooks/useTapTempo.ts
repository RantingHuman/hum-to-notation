import { useCallback, useRef, useState } from 'react';

export function useTapTempo() {
  const taps = useRef<number[]>([]);
  const [bpm, setBpm] = useState<number | null>(null);

  const tap = useCallback(() => {
    const now = Date.now();
    // Discard taps older than 3 seconds
    const recent = taps.current.filter((t) => now - t < 3000);
    recent.push(now);
    taps.current = recent;

    if (recent.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < recent.length; i++) {
        intervals.push(recent[i] - recent[i - 1]);
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculated = Math.round(60_000 / avg);
      setBpm(Math.max(40, Math.min(220, calculated)));
    }
  }, []);

  return { bpm, tap };
}
