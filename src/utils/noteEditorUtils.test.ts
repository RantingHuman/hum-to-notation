import { describe, expect, it } from 'vitest';
import type { Note } from '../types/music';
import {
  appendNote,
  deleteNoteAt,
  normalizeEditableNotes,
  updateNoteAt,
} from './noteEditorUtils';

const firstNote: Note = { midiNumber: 60, startBeat: 0, durationBeats: 2 };
const secondNote: Note = { midiNumber: 64, startBeat: 1, durationBeats: 1 };

describe('note editor utilities', () => {
  it('prevents edited notes from overlapping', () => {
    expect(normalizeEditableNotes([firstNote, secondNote])).toEqual([
      { ...firstNote, durationBeats: 1 },
      secondNote,
    ]);
  });

  it('updates pitch, snaps timing, and clears stale detected frequency', () => {
    const notes = updateNoteAt(
      [{ ...firstNote, detectedFrequency: 261.6 }],
      0,
      { midiNumber: 61, startBeat: 0.26, durationBeats: 1.24 }
    );

    expect(notes).toEqual([{
      midiNumber: 61,
      startBeat: 0.5,
      durationBeats: 1,
      detectedFrequency: undefined,
    }]);
  });

  it('appends a new note after the current timeline', () => {
    expect(appendNote([firstNote])).toEqual([
      firstNote,
      { midiNumber: 60, startBeat: 2, durationBeats: 0.5 },
    ]);
  });

  it('deletes a note and normalizes the remaining timeline', () => {
    expect(deleteNoteAt([firstNote, secondNote], 0)).toEqual([secondNote]);
  });
});
