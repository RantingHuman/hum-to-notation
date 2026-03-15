import type { TimeSignature } from '../types/music';

export const TEMPO_PRESETS = [
  { label: 'Slow', bpm: 70 },
  { label: 'Walking', bpm: 90 },
  { label: 'Standard', bpm: 100 },
  { label: 'Upbeat', bpm: 120 },
  { label: 'Fast', bpm: 140 },
  { label: 'Very Fast', bpm: 160 },
];

export interface TimeSignatureOption {
  value: TimeSignature;
  label: string;
  display: string;
}

export const TIME_SIGNATURE_OPTIONS: TimeSignatureOption[] = [
  { value: { numerator: 4, denominator: 4 }, display: '4/4', label: 'Standard beat' },
  { value: { numerator: 3, denominator: 4 }, display: '3/4', label: 'Waltz' },
  { value: { numerator: 6, denominator: 8 }, display: '6/8', label: 'Compound' },
];

// Guitar string MIDI values: E4, B3, G3, D3, A2, E2 (string 1–6)
export const GUITAR_OPEN_STRINGS = [64, 59, 55, 50, 45, 40];
// Bass string MIDI values: G2, D2, A1, E1 (string 1–4)
export const BASS_OPEN_STRINGS = [43, 38, 33, 28];

export const CLARITY_THRESHOLD = 0.85;
export const MIN_NOTE_DURATION_MS = 100;
export const SILENCE_GAP_MS = 100;
export const MAX_RECORDING_DURATION_MS = 120_000; // 2 minutes
