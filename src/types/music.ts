export type Instrument = 'guitar' | 'bass';
export type MetronomeMode = 'audio' | 'visual';

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface Note {
  midiNumber: number;
  startBeat: number;
  durationBeats: number;
  detectedFrequency?: number;
  isRest?: boolean;
}

export interface RawPitchEvent {
  frequency: number;
  clarity: number;
  timestamp: number; // ms from recording start
}
