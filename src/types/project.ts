import type { Instrument, MetronomeMode, Note, TimeSignature } from './music';

export interface Layer {
  id: string;
  instrument: Instrument;
  octaveShift: number;
  notes: Note[];
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
