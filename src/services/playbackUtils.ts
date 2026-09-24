import type { Note } from '../types/music';
import { midiToFrequency } from '../utils/noteUtils';

export interface PlaybackEvent {
  frequency: number;
  startSec: number;
  durationSec: number;
}

export function createPlaybackEvents(
  notes: Note[],
  tempo: number,
  octaveShift: number
): PlaybackEvent[] {
  if (!Number.isFinite(tempo) || tempo <= 0) {
    throw new RangeError('Tempo must be a positive finite number');
  }

  const beatsPerSecond = tempo / 60;

  return notes
    .filter((note) => !note.isRest)
    .map((note) => {
      const effectiveMidi = Math.max(21, Math.min(108, note.midiNumber + octaveShift * 12));
      return {
        frequency: midiToFrequency(effectiveMidi),
        startSec: note.startBeat / beatsPerSecond,
        durationSec: Math.max(0.08, note.durationBeats / beatsPerSecond),
      };
    });
}
