import type { Instrument, MetronomeMode, Note, RawPitchEvent, TimeSignature } from './music';

export interface Layer {
  id: string;
  instrument: Instrument;
  octaveShift: number;
  notes: Note[];
  /** Detector frames from the last recording, kept so the layer can be re-transcribed. */
  rawPitchEvents?: RawPitchEvent[];
}

export interface Project {
  id: string;
  name: string;
  tempo: number;
  timeSignature: TimeSignature;
  metronomeMode: MetronomeMode;
  createdAt: string;
  updatedAt: string;
  layers: Layer[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}
