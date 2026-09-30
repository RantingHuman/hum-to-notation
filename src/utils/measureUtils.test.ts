import { describe, expect, it } from 'vitest';
import type { Note } from '../types/music';
import { groupNotesIntoMeasures, splitNotesForNotation } from './measureUtils';

function createNote(startBeat: number, midiNumber: number): Note {
  return { midiNumber, startBeat, durationBeats: 1 };
}

describe('groupNotesIntoMeasures', () => {
  it('keeps notes in adjacent measures', () => {
    const firstNote = createNote(0, 60);
    const secondNote = createNote(4, 62);

    const measures = groupNotesIntoMeasures([firstNote, secondNote], 4);

    expect(measures).toEqual([[firstNote], [secondNote]]);
  });

  it('fills skipped measures with full-measure rests', () => {
    const firstNote = createNote(0, 60);
    const thirdMeasureNote = createNote(8, 64);

    const measures = groupNotesIntoMeasures([firstNote, thirdMeasureNote], 4);

    expect(measures).toHaveLength(3);
    expect(measures[0]).toEqual([firstNote]);
    expect(measures[1]).toEqual([{
      midiNumber: 0,
      startBeat: 4,
      durationBeats: 4,
      isRest: true,
    }]);
    expect(measures[2]).toEqual([thirdMeasureNote]);
  });

  it('sorts notes without changing the input array', () => {
    const firstNote = createNote(0, 60);
    const secondNote = createNote(4, 62);
    const input = [secondNote, firstNote];

    const measures = groupNotesIntoMeasures(input, 4);

    expect(measures).toEqual([[firstNote], [secondNote]]);
    expect(input).toEqual([secondNote, firstNote]);
  });

  it('returns no measures for an empty note list', () => {
    expect(groupNotesIntoMeasures([], 4)).toEqual([]);
  });

  it('rejects an invalid measure length', () => {
    expect(() => groupNotesIntoMeasures([createNote(0, 60)], 0)).toThrow(RangeError);
  });
});

describe('splitNotesForNotation', () => {
  it('leaves notes that fit in their measure unchanged', () => {
    const note = { midiNumber: 60, startBeat: 1, durationBeats: 2 };
    expect(splitNotesForNotation([note], 4)).toEqual([note]);
  });

  it('ties a note across a barline', () => {
    expect(splitNotesForNotation([{ midiNumber: 60, startBeat: 3, durationBeats: 3 }], 4)).toEqual([
      { midiNumber: 60, startBeat: 3, durationBeats: 1, tieToNext: true },
      { midiNumber: 60, startBeat: 4, durationBeats: 2, tieFromPrevious: true },
    ]);
  });

  it('splits a duration with no single notehead into tied pieces', () => {
    expect(splitNotesForNotation([{ midiNumber: 60, startBeat: 0, durationBeats: 2.5 }], 4)).toEqual([
      { midiNumber: 60, startBeat: 0, durationBeats: 2, tieToNext: true },
      { midiNumber: 60, startBeat: 2, durationBeats: 0.5, tieFromPrevious: true },
    ]);
  });

  it('chains ties across several measures', () => {
    const pieces = splitNotesForNotation([{ midiNumber: 60, startBeat: 2, durationBeats: 7 }], 3);
    expect(pieces.map((piece) => [piece.startBeat, piece.durationBeats])).toEqual([
      [2, 1], [3, 3], [6, 3],
    ]);
    expect(pieces.map((piece) => [Boolean(piece.tieFromPrevious), Boolean(piece.tieToNext)])).toEqual([
      [false, true], [true, true], [true, false],
    ]);
  });

  it('splits rests at barlines without tying them', () => {
    const pieces = splitNotesForNotation(
      [{ midiNumber: 0, startBeat: 2, durationBeats: 4, isRest: true }],
      4
    );
    expect(pieces).toEqual([
      { midiNumber: 0, startBeat: 2, durationBeats: 2, isRest: true },
      { midiNumber: 0, startBeat: 4, durationBeats: 2, isRest: true },
    ]);
  });
});
