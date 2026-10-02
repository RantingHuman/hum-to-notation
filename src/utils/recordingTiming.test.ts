import { describe, expect, it } from 'vitest';
import type { RawPitchEvent } from '../types/music';
import { alignFramesToDownbeat, audioTimeToPerformanceMs } from './recordingTiming';
import { quantizeToNotes } from '../services/quantizer';
import { midiToFrequency } from './noteUtils';

describe('audioTimeToPerformanceMs', () => {
  it('maps a future audio time onto the page clock', () => {
    // Click scheduled 0.1 s ahead of the audio clock, heard 20 ms later
    expect(audioTimeToPerformanceMs(10.1, 10, 5000, 0.02)).toBeCloseTo(5120);
  });

  it('defaults to no output latency', () => {
    expect(audioTimeToPerformanceMs(2.5, 2, 1000)).toBeCloseTo(1500);
  });
});

describe('alignFramesToDownbeat', () => {
  const frame = (timestamp: number): RawPitchEvent => ({ frequency: 220, clarity: 0.9, timestamp });

  it('makes the downbeat time zero', () => {
    expect(alignFramesToDownbeat([frame(10_000), frame(10_500)], 10_000).map((f) => f.timestamp))
      .toEqual([0, 500]);
  });

  it('drops count-in frames but keeps a slightly early entry', () => {
    const aligned = alignFramesToDownbeat([frame(9_000), frame(9_900), frame(10_000)], 10_000, 150);
    expect(aligned.map((f) => f.timestamp)).toEqual([-100, 0]);
  });

  it('puts a note hummed on the downbeat at beat 0', () => {
    // 100 bpm: count-in beats every 600 ms, downbeat heard at 12_400 ms on the page clock
    const downbeatMs = 12_400;
    const hummed: RawPitchEvent[] = [];
    for (let t = downbeatMs - 20; t < downbeatMs + 580; t += 16) {
      hummed.push({ frequency: midiToFrequency(60), clarity: 0.95, timestamp: t, rms: 0.2 });
    }

    const notes = quantizeToNotes(alignFramesToDownbeat(hummed, downbeatMs), 100, {
      numerator: 4,
      denominator: 4,
    });
    expect(notes[0]).toEqual(expect.objectContaining({ midiNumber: 60, startBeat: 0, durationBeats: 1 }));
  });
});
