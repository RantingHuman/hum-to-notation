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

const FRAME_MS = 16;
const FOUR_FOUR = { numerator: 4, denominator: 4 };

/** Continuous frames at one pitch from startMs up to (not including) endMs. */
function held(midiNumber: number, startMs: number, endMs: number, rms?: number): RawPitchEvent[] {
  const frames: RawPitchEvent[] = [];
  for (let timestamp = startMs; timestamp < endMs; timestamp += FRAME_MS) {
    frames.push({ ...event(midiNumber, timestamp), ...(rms === undefined ? {} : { rms }) });
  }
  return frames;
}

function sounding(events: RawPitchEvent[], tempo = 120) {
  return quantizeToNotes(events, tempo, FOUR_FOUR)
    .filter((note) => !note.isRest)
    .map(({ midiNumber, startBeat, durationBeats }) => ({ midiNumber, startBeat, durationBeats }));
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

  it('splits a legato half-step move into two notes', () => {
    expect(sounding([...held(64, 0, 500), ...held(65, 500, 1000)])).toEqual([
      { midiNumber: 64, startBeat: 0, durationBeats: 1 },
      { midiNumber: 65, startBeat: 1, durationBeats: 1 },
    ]);
  });

  it('keeps every note of a chromatic run', () => {
    const run = [60, 61, 62, 63].flatMap((midi, index) => held(midi, index * 500, index * 500 + 500));
    expect(sounding(run).map((note) => note.midiNumber)).toEqual([60, 61, 62, 63]);
  });

  it('ignores a single off-pitch frame inside a held note', () => {
    const frames = held(60, 0, 1000);
    frames[20] = event(62, frames[20].timestamp);
    expect(sounding(frames)).toEqual([{ midiNumber: 60, startBeat: 0, durationBeats: 2 }]);
  });

  it('does not split a note on vibrato narrower than a semitone', () => {
    const frames = held(69, 0, 1000).map((frame, index) => ({
      ...frame,
      frequency: frame.frequency * Math.pow(2, (40 * Math.sin(index / 2)) / 1200),
    }));
    expect(sounding(frames)).toEqual([{ midiNumber: 69, startBeat: 0, durationBeats: 2 }]);
  });

  it('splits repeated notes on the same pitch at a loudness dip', () => {
    const frames = [
      ...held(60, 0, 450, 0.2),
      // consonant: quieter and unclear, but shorter than the silence gap
      { frequency: 0, clarity: 0.3, timestamp: 450, rms: 0.03 },
      { frequency: 0, clarity: 0.3, timestamp: 466, rms: 0.03 },
      ...held(60, 482, 1000, 0.2),
    ];
    expect(sounding(frames)).toEqual([
      { midiNumber: 60, startBeat: 0, durationBeats: 1 },
      { midiNumber: 60, startBeat: 1, durationBeats: 1 },
    ]);
  });

  it('keeps a steady note whole when loudness only wavers slightly', () => {
    const frames = held(60, 0, 1000).map((frame, index) => ({
      ...frame,
      rms: 0.2 + 0.05 * Math.sin(index),
    }));
    expect(sounding(frames)).toEqual([{ midiNumber: 60, startBeat: 0, durationBeats: 2 }]);
  });

  it('ignores unclear and out-of-range frames', () => {
    const frames = [
      ...held(60, 0, 500),
      { frequency: 3000, clarity: 0.99, timestamp: 510 },
      { frequency: 440, clarity: 0.2, timestamp: 526 },
    ];
    expect(sounding(frames)).toEqual([{ midiNumber: 60, startBeat: 0, durationBeats: 1 }]);
  });

  it('keeps the full length of a note held across a barline', () => {
    // Starts on beat 3 (1500 ms at 120 bpm) and holds for 3 beats
    expect(sounding(held(60, 1500, 3000))).toEqual([
      { midiNumber: 60, startBeat: 3, durationBeats: 3 },
    ]);
  });

  it('keeps notes longer than a whole note', () => {
    expect(sounding(held(60, 0, 3000))).toEqual([
      { midiNumber: 60, startBeat: 0, durationBeats: 6 },
    ]);
  });
});
