import { describe, expect, it } from 'vitest';
import type { RawPitchEvent } from '../types/music';
import { explainEmptyRecording, getRecordingStats } from './recordingDiagnostics';

function frames(count: number, frame: Partial<RawPitchEvent>): RawPitchEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    frequency: 0,
    clarity: 0,
    timestamp: index * 16,
    rms: 0,
    ...frame,
  }));
}

describe('explainEmptyRecording', () => {
  it('reports when no frames were analysed', () => {
    expect(explainEmptyRecording([])).toMatch(/No audio was analysed/);
  });

  it('reports a quiet microphone', () => {
    expect(explainEmptyRecording(frames(100, { rms: 0.0005 }))).toMatch(/only silence/);
  });

  it('reports exact digital silence as no signal, naming the device', () => {
    expect(explainEmptyRecording(frames(100, { rms: 0 }), { label: 'MacBook Pro Microphone' }))
      .toMatch(/no signal at all from "MacBook Pro Microphone"/);
  });

  it('reports a track the browser muted', () => {
    expect(explainEmptyRecording(frames(100, { rms: 0 }), { label: 'USB Mic', muted: true }))
      .toMatch(/muted "USB Mic"/);
  });

  it('reports sound without a clear pitch', () => {
    expect(explainEmptyRecording(frames(100, { rms: 0.1, frequency: 220, clarity: 0.4 })))
      .toMatch(/no clear pitch/);
  });

  it('reports pitch that was too brief', () => {
    const events = [
      ...frames(50, { rms: 0.1 }),
      ...frames(2, { rms: 0.1, frequency: 220, clarity: 0.95 }),
    ];
    expect(explainEmptyRecording(events)).toMatch(/only briefly/);
  });

  it('skips the silence check for frames recorded without loudness', () => {
    const events = frames(10, { frequency: 220, clarity: 0.4, rms: undefined });
    expect(getRecordingStats(events).maxRms).toBeNull();
    expect(explainEmptyRecording(events)).toMatch(/no clear pitch/);
  });
});
