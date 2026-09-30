import type { Note } from '../types/music';

/**
 * Shared fallback for "no layer selected". Components that use a layer's notes
 * as an effect dependency need a stable reference; a fresh `[]` each render
 * re-runs the effect every render.
 */
export const EMPTY_NOTES: Note[] = [];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}
