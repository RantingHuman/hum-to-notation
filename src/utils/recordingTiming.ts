import type { RawPitchEvent } from '../types/music';

// Singers often come in slightly ahead of the downbeat; keep frames from this
// long before it so an early first note isn't clipped. The quantizer snaps them to beat 0.
export const DOWNBEAT_ANTICIPATION_MS = 150;

/**
 * Convert a time on an AudioContext clock (seconds) to the page's
 * performance.now() clock (ms), shifted by the output latency so the result
 * is when the sound actually leaves the speakers.
 */
export function audioTimeToPerformanceMs(
  audioTime: number,
  contextCurrentTime: number,
  nowMs: number,
  outputLatencySec = 0
): number {
  return nowMs + (audioTime - contextCurrentTime + outputLatencySec) * 1000;
}

/**
 * Re-base detector frames (performance.now() timestamps) so the first downbeat
 * after the count-in is 0, dropping count-in frames before the anticipation window.
 */
export function alignFramesToDownbeat(
  events: RawPitchEvent[],
  downbeatMs: number,
  anticipationMs = DOWNBEAT_ANTICIPATION_MS
): RawPitchEvent[] {
  return events
    .filter((event) => event.timestamp >= downbeatMs - anticipationMs)
    .map((event) => ({ ...event, timestamp: event.timestamp - downbeatMs }));
}
