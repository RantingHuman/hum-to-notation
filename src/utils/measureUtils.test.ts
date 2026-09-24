import { describe, expect, it } from 'vitest';
import type { Note } from '../types/music';
import { groupNotesIntoMeasures } from './measureUtils';

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
