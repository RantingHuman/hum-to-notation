import { describe, expect, it } from 'vitest';
import type { Note } from '../types/music';
import { midiToFrequency } from '../utils/noteUtils';
import { createPlaybackEvents } from './playbackUtils';

const notes: Note[] = [
  { midiNumber: 0, startBeat: 0, durationBeats: 0.5, isRest: true },
  { midiNumber: 60, startBeat: 0.5, durationBeats: 1 },
  { midiNumber: 64, startBeat: 2, durationBeats: 2 },
];

describe('createPlaybackEvents', () => {
  it('converts sounding notes to timed frequency events and skips rests', () => {
    expect(createPlaybackEvents(notes, 120, 0)).toEqual([
      { frequency: midiToFrequency(60), startSec: 0.25, durationSec: 0.5 },
      { frequency: midiToFrequency(64), startSec: 1, durationSec: 1 },
    ]);
  });

  it('applies octave shifts and clamps frequencies to the synth range', () => {
    const events = createPlaybackEvents(
      [{ midiNumber: 60, startBeat: 0, durationBeats: 1 }],
      120,
      1
    );

    expect(events[0].frequency).toBe(midiToFrequency(72));
  });

  it('rejects invalid tempos', () => {
    expect(() => createPlaybackEvents(notes, 0, 0)).toThrow(RangeError);
  });
});
