import type { Note } from '../types/music';
import type { TimeSignature } from '../types/music';

export function getMeasureLengthBeats(timeSignature: TimeSignature): number {
  if (
    !Number.isFinite(timeSignature.numerator) ||
    !Number.isFinite(timeSignature.denominator) ||
    timeSignature.numerator <= 0 ||
    timeSignature.denominator <= 0
  ) {
    throw new RangeError('Time signature values must be positive finite numbers');
  }

  return timeSignature.numerator * (4 / timeSignature.denominator);
}

export function groupNotesIntoMeasures(notes: Note[], beatsPerMeasure: number): Note[][] {
  if (notes.length === 0) return [];
  if (!Number.isFinite(beatsPerMeasure) || beatsPerMeasure <= 0) {
    throw new RangeError('beatsPerMeasure must be a positive finite number');
  }

  const sortedNotes = [...notes].sort((left, right) => left.startBeat - right.startBeat);
  const maxMeasureIndex = sortedNotes.reduce(
    (highestIndex, note) => Math.max(highestIndex, Math.max(0, Math.floor(note.startBeat / beatsPerMeasure))),
    0
  );
  const measures = Array.from({ length: maxMeasureIndex + 1 }, () => [] as Note[]);

  for (const note of sortedNotes) {
    const measureIndex = Math.max(0, Math.floor(note.startBeat / beatsPerMeasure));
    measures[measureIndex].push(note);
  }

  return measures.map((measureNotes, measureIndex) => {
    if (measureNotes.length > 0) return measureNotes;

    return [{
      midiNumber: 0,
      startBeat: measureIndex * beatsPerMeasure,
      durationBeats: beatsPerMeasure,
      isRest: true,
    }];
  });
}
