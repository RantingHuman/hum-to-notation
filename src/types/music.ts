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

/**
 * One analysis frame from the pitch detector. Every frame is kept, including
 * unclear ones, so the quantizer can see amplitude dips between notes and a
 * layer can be re-transcribed later with different settings.
 */
export interface RawPitchEvent {
  frequency: number;
  clarity: number;
  timestamp: number; // ms from recording start
  rms?: number; // frame loudness; absent on events recorded before it was captured
}
