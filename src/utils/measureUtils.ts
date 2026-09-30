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

export interface NotationNote extends Note {
  tieToNext?: boolean;
  tieFromPrevious?: boolean;
}

// Longest first; every piece of a split note uses one of these
const NOTATABLE_DURATIONS = [4, 3, 2, 1.5, 1, 0.5];
const BEAT_EPSILON = 0.001;

/**
 * Split notes at barlines and into durations that can be written as a single
 * notehead (e.g. 2.5 beats → half + eighth). Pieces of a sounding note are
 * marked as tied; rests are split without ties.
 */
export function splitNotesForNotation(notes: Note[], measureLengthBeats: number): NotationNote[] {
  if (!Number.isFinite(measureLengthBeats) || measureLengthBeats <= 0) {
    throw new RangeError('measureLengthBeats must be a positive finite number');
  }

  const sortedNotes = [...notes].sort((left, right) => left.startBeat - right.startBeat);
  const result: NotationNote[] = [];

  for (const note of sortedNotes) {
    const pieces: NotationNote[] = [];
    const endBeat = note.startBeat + note.durationBeats;
    let cursorBeat = note.startBeat;

    while (endBeat - cursorBeat > BEAT_EPSILON) {
      const measureIndex = Math.floor((cursorBeat + BEAT_EPSILON) / measureLengthBeats);
      const measureEndBeat = (measureIndex + 1) * measureLengthBeats;
      const available = Math.min(endBeat, measureEndBeat) - cursorBeat;
      const durationBeats =
        NOTATABLE_DURATIONS.find((duration) => duration <= available + BEAT_EPSILON) ?? available;

      pieces.push({ ...note, startBeat: cursorBeat, durationBeats });
      cursorBeat += durationBeats;
    }

    if (!note.isRest && pieces.length > 1) {
      pieces.forEach((piece, index) => {
        if (index > 0) piece.tieFromPrevious = true;
        if (index < pieces.length - 1) piece.tieToNext = true;
      });
    }

    result.push(...pieces);
  }

  return result;
}
