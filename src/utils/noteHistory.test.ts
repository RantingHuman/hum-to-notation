import { describe, expect, it } from 'vitest';
import type { Note } from '../types/music';
import {
  commitNoteHistory,
  createNoteHistory,
  redoNoteHistory,
  undoNoteHistory,
} from './noteHistory';

const firstNote: Note = { midiNumber: 60, startBeat: 0, durationBeats: 1 };
const secondNote: Note = { midiNumber: 62, startBeat: 0, durationBeats: 1 };
const thirdNote: Note = { midiNumber: 64, startBeat: 0, durationBeats: 1 };

describe('note history', () => {
  it('commits edits and undoes them', () => {
    const initial = createNoteHistory([firstNote]);
    const edited = commitNoteHistory(initial, [secondNote]);

    expect(undoNoteHistory(edited)).toEqual({
      past: [],
      present: [firstNote],
      future: [[secondNote]],
    });
  });

  it('redoes an undone edit', () => {
    const initial = createNoteHistory([firstNote]);
    const edited = commitNoteHistory(initial, [secondNote]);
    const undone = undoNoteHistory(edited);

    expect(redoNoteHistory(undone)).toEqual(edited);
  });

  it('clears redo history after a new edit', () => {
    const initial = createNoteHistory([firstNote]);
    const edited = commitNoteHistory(initial, [secondNote]);
    const undone = undoNoteHistory(edited);
    const branched = commitNoteHistory(undone, [thirdNote]);

    expect(branched.future).toEqual([]);
    expect(branched.present).toEqual([thirdNote]);
  });

  it('returns the same state when undo or redo is unavailable', () => {
    const initial = createNoteHistory([firstNote]);

    expect(undoNoteHistory(initial)).toBe(initial);
    expect(redoNoteHistory(initial)).toBe(initial);
  });
});
