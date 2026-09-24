import { describe, expect, it } from 'vitest';
import { quantizeToNotes } from './quantizer';
import { midiToFrequency } from '../utils/noteUtils';
import type { RawPitchEvent } from '../types/music';

function event(midiNumber: number, timestamp: number): RawPitchEvent {
  return {
    frequency: midiToFrequency(midiNumber),
    clarity: 0.95,
    timestamp,
  };
}

describe('quantizeToNotes', () => {
  it('keeps a note whose detected frames cover about 100 ms', () => {
    const notes = quantizeToNotes(
      [event(60, 0), event(60, 20), event(60, 40), event(60, 60), event(60, 80)],
      120,
      { numerator: 4, denominator: 4 }
    );

    expect(notes).toEqual([
      expect.objectContaining({ midiNumber: 60, startBeat: 0, durationBeats: 0.5 }),
    ]);
  });

  it('discards an isolated pitch detection blip', () => {
    expect(
      quantizeToNotes([event(60, 0)], 120, { numerator: 4, denominator: 4 })
    ).toEqual([]);
  });

  it('inserts a leading rest and preserves silence between notes', () => {
    const notes = quantizeToNotes(
      [
        event(60, 250), event(60, 350), event(60, 450),
        event(62, 1000), event(62, 1100), event(62, 1200),
      ],
      120,
      { numerator: 4, denominator: 4 }
    );

    expect(notes).toEqual([
      { midiNumber: 0, startBeat: 0, durationBeats: 0.5, isRest: true },
      expect.objectContaining({ midiNumber: 60, startBeat: 0.5, durationBeats: 0.5 }),
      { midiNumber: 0, startBeat: 1, durationBeats: 1, isRest: true },
      expect.objectContaining({ midiNumber: 62, startBeat: 2, durationBeats: 0.5 }),
    ]);
  });

  it('does not let a previous note overlap the next quantized onset', () => {
    const notes = quantizeToNotes(
      [
        event(60, 0), event(60, 100), event(60, 200),
        event(62, 250), event(62, 350), event(62, 450),
      ],
      120,
      { numerator: 4, denominator: 4 }
    );

    const soundingNotes = notes.filter((note) => !note.isRest);
    expect(soundingNotes).toHaveLength(2);
    expect(soundingNotes[0].startBeat + soundingNotes[0].durationBeats)
      .toBeLessThanOrEqual(soundingNotes[1].startBeat);
  });

  it('uses quarter-note beat lengths when quantizing 6/8', () => {
    const notes = quantizeToNotes(
      [
        event(60, 1500), event(60, 1600), event(60, 1700),
        event(62, 2000), event(62, 2100), event(62, 2200),
      ],
      120,
      { numerator: 6, denominator: 8 }
    );

    expect(notes[0]).toEqual({ midiNumber: 0, startBeat: 0, durationBeats: 3, isRest: true });
    expect(notes.find((note) => !note.isRest)).toEqual(
      expect.objectContaining({ midiNumber: 60, startBeat: 3 })
    );
  });
});
